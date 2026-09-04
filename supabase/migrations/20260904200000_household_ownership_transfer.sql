-- Two-person, expiring household ownership transfer.

create table public.household_ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null unique references public.households(id) on delete cascade,
  initiated_by uuid not null references auth.users(id) on delete cascade,
  proposed_owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  resolved_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  check (initiated_by <> proposed_owner_id),
  check (expires_at > created_at and expires_at <= created_at + interval '24 hours')
);

create index household_ownership_transfer_target_idx
  on public.household_ownership_transfers (proposed_owner_id, status, expires_at);

create trigger household_ownership_transfers_set_updated_at
before update on public.household_ownership_transfers
for each row execute function public.touch_household_updated_at();

alter table public.household_ownership_transfers enable row level security;
create policy "Active members can read household ownership transfer"
on public.household_ownership_transfers for select to authenticated
using (public.household_role(household_id) is not null);

revoke all on table public.household_ownership_transfers from public, anon, authenticated;
grant select on table public.household_ownership_transfers to authenticated;

create function public.initiate_household_ownership_transfer(input_proposed_owner_id uuid)
returns table (status text, transfer_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_household_id uuid;
  current_owner_id uuid;
  result_transfer_id uuid;
  rate_allowed boolean;
begin
  perform public.require_recent_authentication(900);
  select result.allowed into rate_allowed
  from public.check_rate_limit('household-transfer-init:' || auth.uid()::text, 12, 600) as result;
  if not coalesce(rate_allowed, false) then
    return query select 'RATE_LIMITED'::text, null::uuid;
    return;
  end if;
  current_household_id := public.ensure_user_household();

  select household.owner_id into current_owner_id
  from public.households as household
  where household.id = current_household_id
  for update;

  if current_owner_id is distinct from auth.uid() then
    return query select 'NOT_OWNER'::text, null::uuid;
    return;
  end if;
  if not exists (
    select 1 from public.household_memberships as membership
    where membership.household_id = current_household_id
      and membership.user_id = input_proposed_owner_id
      and membership.status = 'active' and membership.role = 'member'
  ) then
    return query select 'INVALID_TARGET'::text, null::uuid;
    return;
  end if;

  insert into public.household_ownership_transfers as transfer (
    id, household_id, initiated_by, proposed_owner_id, status, expires_at
  ) values (
    gen_random_uuid(), current_household_id, auth.uid(), input_proposed_owner_id,
    'pending', timezone('utc', now()) + interval '24 hours'
  )
  on conflict (household_id) do update set
    id = excluded.id, initiated_by = excluded.initiated_by,
    proposed_owner_id = excluded.proposed_owner_id, status = 'pending',
    created_at = timezone('utc', now()), expires_at = excluded.expires_at,
    resolved_at = null, updated_at = clock_timestamp()
  returning transfer.id into result_transfer_id;

  insert into public.audit_events (
    user_id, household_id, actor_type, actor_id, event_type, metadata
  ) values (
    auth.uid(), current_household_id, 'user', auth.uid()::text,
    'HOUSEHOLD_OWNERSHIP_TRANSFER_REQUESTED',
    jsonb_build_object('transferId', result_transfer_id,
      'proposedOwnerId', input_proposed_owner_id)
  );
  return query select 'OK'::text, result_transfer_id;
end;
$$;

create function public.resolve_household_ownership_transfer(
  input_transfer_id uuid,
  input_decision text
)
returns table (status text, transfer_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_household_id uuid;
  household_record public.households%rowtype;
  transfer_record public.household_ownership_transfers%rowtype;
  event_name text;
  rate_allowed boolean;
begin
  perform public.require_recent_authentication(900);
  select result.allowed into rate_allowed
  from public.check_rate_limit('household-transfer-resolve:' || current_user_id::text, 30, 600) as result;
  if not coalesce(rate_allowed, false) then
    return query select 'RATE_LIMITED'::text, null::uuid;
    return;
  end if;
  if input_decision not in ('accept', 'decline', 'cancel') then
    raise exception 'Invalid ownership transfer decision';
  end if;

  select membership.household_id into current_household_id
  from public.household_memberships as membership
  where membership.user_id = current_user_id and membership.status = 'active'
  limit 1;
  if current_household_id is null then
    return query select 'NOT_FOUND'::text, null::uuid;
    return;
  end if;

  select household.* into household_record
  from public.households as household
  where household.id = current_household_id
  for update;
  select transfer.* into transfer_record
  from public.household_ownership_transfers as transfer
  where transfer.id = input_transfer_id
    and transfer.household_id = current_household_id and transfer.status = 'pending'
  for update;
  if transfer_record.id is null then
    return query select 'NOT_FOUND'::text, null::uuid;
    return;
  end if;
  if transfer_record.expires_at <= timezone('utc', now()) then
    update public.household_ownership_transfers as transfer
    set status = 'expired', resolved_at = timezone('utc', now())
    where transfer.id = transfer_record.id;
    return query select 'EXPIRED'::text, transfer_record.id;
    return;
  end if;

  if input_decision = 'cancel' and not (
    current_user_id = household_record.owner_id
    and current_user_id = transfer_record.initiated_by
  ) then
    return query select 'FORBIDDEN'::text, transfer_record.id;
    return;
  end if;
  if input_decision in ('accept', 'decline')
    and current_user_id <> transfer_record.proposed_owner_id then
    return query select 'FORBIDDEN'::text, transfer_record.id;
    return;
  end if;

  if input_decision = 'accept' then
    if household_record.owner_id <> transfer_record.initiated_by
      or not exists (
        select 1 from public.household_memberships as membership
        where membership.household_id = current_household_id
          and membership.user_id = transfer_record.initiated_by
          and membership.status = 'active' and membership.role = 'owner'
      ) or not exists (
        select 1 from public.household_memberships as membership
        where membership.household_id = current_household_id
          and membership.user_id = transfer_record.proposed_owner_id
          and membership.status = 'active' and membership.role = 'member'
      ) then
      return query select 'NOT_FOUND'::text, transfer_record.id;
      return;
    end if;
    update public.household_memberships set role = 'member'
    where household_id = current_household_id and user_id = transfer_record.initiated_by;
    update public.household_memberships set role = 'owner'
    where household_id = current_household_id and user_id = transfer_record.proposed_owner_id;
    update public.households set owner_id = transfer_record.proposed_owner_id
    where id = current_household_id;
  end if;

  update public.household_ownership_transfers as transfer
  set status = case input_decision when 'accept' then 'accepted'
      when 'decline' then 'declined' else 'cancelled' end,
    resolved_at = timezone('utc', now())
  where transfer.id = transfer_record.id;
  event_name := case input_decision when 'accept' then 'HOUSEHOLD_OWNERSHIP_TRANSFER_ACCEPTED'
    when 'decline' then 'HOUSEHOLD_OWNERSHIP_TRANSFER_DECLINED'
    else 'HOUSEHOLD_OWNERSHIP_TRANSFER_CANCELLED' end;
  insert into public.audit_events (
    user_id, household_id, actor_type, actor_id, event_type, metadata
  ) values (
    current_user_id, current_household_id, 'user', current_user_id::text,
    event_name, jsonb_build_object('transferId', transfer_record.id,
      'previousOwnerId', transfer_record.initiated_by,
      'proposedOwnerId', transfer_record.proposed_owner_id)
  );
  return query select 'OK'::text, transfer_record.id;
end;
$$;

revoke all on function public.initiate_household_ownership_transfer(uuid)
  from public, anon;
revoke all on function public.resolve_household_ownership_transfer(uuid, text)
  from public, anon;
grant execute on function public.initiate_household_ownership_transfer(uuid) to authenticated;
grant execute on function public.resolve_household_ownership_transfer(uuid, text) to authenticated;
