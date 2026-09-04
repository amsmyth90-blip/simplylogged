-- Serialize household administration and keep owner columns and memberships aligned.

do $$
begin
  if exists (
    select 1 from public.households as household
    where not exists (
      select 1 from public.household_memberships as membership
      where membership.household_id = household.id
        and membership.user_id = household.owner_id
        and membership.status = 'active' and membership.role = 'owner'
    ) or exists (
      select 1 from public.household_memberships as membership
      where membership.household_id = household.id
        and membership.status = 'active' and membership.role = 'owner'
        and membership.user_id <> household.owner_id
    )
  ) then
    raise exception 'Household owner data must be repaired before ownership transfer is enabled';
  end if;
end;
$$;

create unique index household_memberships_one_active_owner_idx
  on public.household_memberships (household_id)
  where status = 'active' and role = 'owner';

create function public.enforce_household_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
begin
  target_household_id := case when tg_table_name = 'households'
    then coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id')::uuid
    else coalesce(to_jsonb(new)->>'household_id', to_jsonb(old)->>'household_id')::uuid end;
  if exists (select 1 from public.households where id = target_household_id)
    and not exists (
      select 1 from public.households as household
      join public.household_memberships as membership
        on membership.household_id = household.id
       and membership.user_id = household.owner_id
       and membership.status = 'active' and membership.role = 'owner'
      where household.id = target_household_id
    ) then
    raise exception 'A household must have one active owner membership';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create constraint trigger household_owner_matches_membership
after insert or update on public.households
deferrable initially deferred
for each row execute function public.enforce_household_owner_membership();

create constraint trigger household_membership_matches_owner
after insert or update or delete on public.household_memberships
deferrable initially deferred
for each row execute function public.enforce_household_owner_membership();

revoke all on function public.enforce_household_owner_membership()
  from public, anon, authenticated;
revoke update on table public.households from authenticated;

create function public.lock_current_household()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_household_id uuid;
begin
  current_household_id := public.ensure_user_household();
  perform 1 from public.households as household
  where household.id = current_household_id for update;
  return current_household_id;
end;
$$;
revoke all on function public.lock_current_household()
  from public, anon, authenticated;

create function public.cancel_transfer_for_membership_change(
  input_household_id uuid,
  input_member_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  cancelled_transfer_id uuid;
begin
  update public.household_ownership_transfers as transfer
  set status = 'cancelled', resolved_at = timezone('utc', now())
  where transfer.household_id = input_household_id
    and transfer.proposed_owner_id = input_member_user_id
    and transfer.status = 'pending'
    and (input_member_user_id = auth.uid() or exists (
      select 1 from public.households as household
      where household.id = input_household_id and household.owner_id = auth.uid()
    ))
  returning transfer.id into cancelled_transfer_id;
  if cancelled_transfer_id is not null then
    insert into public.audit_events (
      user_id, household_id, actor_type, actor_id, event_type, metadata
    ) values (auth.uid(), input_household_id, 'user', auth.uid()::text,
      'HOUSEHOLD_OWNERSHIP_TRANSFER_CANCELLED',
      jsonb_build_object('transferId', cancelled_transfer_id,
        'reason', 'membership_changed'));
  end if;
end;
$$;
revoke all on function public.cancel_transfer_for_membership_change(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.create_household_role_invite(
  invite_email text, invite_name text, invite_relation text, invite_role text
)
returns uuid language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.require_recent_authentication(900);
  perform public.lock_current_household();
  return public.create_household_role_invite_without_recent_auth(
    invite_email, invite_name, invite_relation, invite_role);
end;
$$;

create or replace function public.update_household_member_role(
  member_user_id uuid, new_role text
)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare current_household_id uuid;
begin
  perform public.require_recent_authentication(900);
  current_household_id := public.lock_current_household();
  perform public.cancel_transfer_for_membership_change(current_household_id, member_user_id);
  return public.update_household_member_role_without_recent_auth(member_user_id, new_role);
end;
$$;

create or replace function public.remove_household_member(member_user_id uuid)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare current_household_id uuid;
begin
  perform public.require_recent_authentication(900);
  current_household_id := public.lock_current_household();
  perform public.cancel_transfer_for_membership_change(current_household_id, member_user_id);
  return public.remove_household_member_without_recent_auth(member_user_id);
end;
$$;

create or replace function public.rename_household(new_name text)
returns boolean language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.require_recent_authentication(900);
  perform public.lock_current_household();
  return public.rename_household_without_recent_auth(new_name);
end;
$$;

create or replace function public.leave_household()
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare current_household_id uuid;
begin
  perform public.require_recent_authentication(900);
  current_household_id := public.lock_current_household();
  perform public.cancel_transfer_for_membership_change(current_household_id, auth.uid());
  return public.leave_household_without_recent_auth();
end;
$$;

revoke all on function public.create_household_role_invite(text, text, text, text)
  from public, anon;
revoke all on function public.update_household_member_role(uuid, text)
  from public, anon;
revoke all on function public.remove_household_member(uuid)
  from public, anon;
revoke all on function public.rename_household(text) from public, anon;
revoke all on function public.leave_household() from public, anon;
grant execute on function public.create_household_role_invite(text, text, text, text)
  to authenticated;
grant execute on function public.update_household_member_role(uuid, text) to authenticated;
grant execute on function public.remove_household_member(uuid) to authenticated;
grant execute on function public.rename_household(text) to authenticated;
grant execute on function public.leave_household() to authenticated;
