create or replace function public.revoke_removed_member_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin if old.status = 'active' and new.status = 'removed' then update public.resource_permissions as permission
    set revoked_at = timezone('utc', now()) from public.shared_resources as resource
    where permission.shared_resource_id = resource.id and resource.household_id = new.household_id
      and permission.subject_user_id = new.user_id and permission.revoked_at is null; end if; return new;
end;
$$;
drop trigger if exists household_membership_revoke_permissions on public.household_memberships;
create trigger household_membership_revoke_permissions
after update of status on public.household_memberships
for each row execute function public.revoke_removed_member_permissions();
create or replace function public.audit_household_membership_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare actor_user_id uuid := coalesce(auth.uid(), new.user_id); audit_event_type text; audit_metadata jsonb;
begin if tg_op = 'INSERT' and new.status = 'active' then audit_event_type := 'HOUSEHOLD_JOIN';
    audit_metadata := jsonb_build_object( 'subjectUserId', new.user_id::text, 'role', new.role );
  elsif tg_op = 'UPDATE' and old.status = 'active' and new.status = 'removed' then audit_event_type := case
      when actor_user_id = new.user_id then 'HOUSEHOLD_LEFT' else 'HOUSEHOLD_MEMBER_REMOVED' end;
    audit_metadata := jsonb_build_object('subjectUserId', new.user_id::text);
  elsif tg_op = 'UPDATE' and old.role is distinct from new.role then audit_event_type := 'HOUSEHOLD_ROLE_CHANGED';
    audit_metadata := jsonb_build_object( 'subjectUserId', new.user_id::text, 'previousRole', old.role,
      'newRole', new.role ); else return new; end if; insert into public.audit_events ( user_id, household_id,
    actor_type, actor_id, event_type, metadata ) values ( actor_user_id, new.household_id, 'user', actor_user_id::text,
    audit_event_type, audit_metadata ); return new;
end;
$$;
drop trigger if exists household_membership_audit on public.household_memberships;
create trigger household_membership_audit
after insert or update of role, status on public.household_memberships
for each row execute function public.audit_household_membership_change();
create or replace function public.audit_household_invite_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare actor_user_id uuid := auth.uid(); audit_event_type text;
begin if actor_user_id is null then return new; end if; if tg_op = 'INSERT' then audit_event_type := 'HOUSEHOLD_INVITE';
  elsif old.status is distinct from new.status and new.status = 'cancelled' then
    audit_event_type := 'HOUSEHOLD_INVITE_CANCELLED';
  elsif old.expires_at is distinct from new.expires_at and new.status = 'pending' then
    audit_event_type := 'HOUSEHOLD_INVITE_RENEWED'; else return new; end if; insert into public.audit_events ( user_id,
    household_id, actor_type, actor_id, event_type, metadata ) values ( actor_user_id, new.household_id, 'user',
    actor_user_id::text, audit_event_type, jsonb_build_object('invitedRole', new.role) ); return new;
end;
$$;
drop trigger if exists household_invite_audit on public.household_invites;
create trigger household_invite_audit
after insert or update of status, expires_at on public.household_invites
for each row execute function public.audit_household_invite_change();
create or replace function public.create_household_role_invite( invite_email text, invite_name text,
  invite_relation text, invite_role text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare current_household_id uuid; invite_token uuid; clean_email text := lower(trim(invite_email));
  clean_name text := trim(invite_name);
begin if auth.uid() is null then raise exception 'Authentication required'; end if;
  if invite_role not in ('member', 'viewer') then raise exception 'Choose Adult or Member access'; end if;
  if clean_email = '' or position('@' in clean_email) < 2 then raise exception 'A valid email address is required';
  end if; if clean_name = '' or length(clean_name) > 100 then raise exception 'A name is required'; end if;
  if clean_email = lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Invite another person rather than your own account'; end if;
  current_household_id := public.ensure_user_household(); if public.household_role(current_household_id) <> 'owner' then
    raise exception 'Only the household owner can invite members'; end if; update public.household_invites
  set status = 'cancelled' where household_id = current_household_id and lower(email) = clean_email
    and status = 'pending'; insert into public.household_invites ( household_id, email, name, relation, access, role,
    invited_by ) values ( current_household_id, clean_email, clean_name,
    coalesce(nullif(trim(invite_relation), ''), 'Household member'), case
      when invite_role = 'member' then 'Adult - can contribute to shared household spaces'
      else 'Member - can view items deliberately shared with them' end, invite_role, auth.uid() )
  returning token into invite_token; return invite_token;
end;
$$;
create or replace function public.rename_household(new_name text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare current_household_id uuid; clean_name text := trim(new_name);
begin if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(clean_name) < 1 or length(clean_name) > 80 then
    raise exception 'Household name must be between 1 and 80 characters'; end if;
  current_household_id := public.ensure_user_household(); if public.household_role(current_household_id) <> 'owner' then
    raise exception 'Only the household owner can rename the household'; end if; update public.households
  set name = clean_name where id = current_household_id; insert into public.audit_events ( user_id, household_id,
    actor_type, actor_id, event_type, metadata ) values ( auth.uid(), current_household_id, 'user', auth.uid()::text,
    'HOUSEHOLD_RENAMED', '{}'::jsonb ); return true;
end;
$$;
create or replace function public.leave_household()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare current_membership public.household_memberships%rowtype; new_household_id uuid;
begin if auth.uid() is null then raise exception 'Authentication required'; end if; select membership.*
    into current_membership from public.household_memberships as membership where membership.user_id = auth.uid()
    and membership.status = 'active' for update; if current_membership.household_id is null then
    raise exception 'This account does not have an active household'; end if; if current_membership.role = 'owner' then
    raise exception 'The household owner cannot leave until ownership transfer is available'; end if;
  update public.household_memberships set status = 'removed' where household_id = current_membership.household_id
    and user_id = auth.uid() and status = 'active'; update public.app_state set payload = payload - 'reminders'
    - 'mealPlan' - 'kitchenItems' - 'kitchenRecipes' - 'kitchenNoticeboard' - 'familyCalendarEvents' - 'kidSchedules'
    - 'householdProfiles' - 'householdMembers' - 'familyInvites' where id = auth.uid()::text;
  insert into public.households (name, owner_id) values ('My household', auth.uid()) returning id into new_household_id;
  insert into public.household_memberships ( household_id, user_id, role, display_name, relation ) values (
    new_household_id, auth.uid(), 'owner', current_membership.display_name, 'Household owner' );
  insert into public.household_state (household_id, payload) values (new_household_id, '{}'::jsonb);
  return new_household_id;
end;
$$;
drop policy if exists "DiaryDock audit event row access" on public.audit_events;
drop policy if exists "Users and household owners can read audit events" on public.audit_events;
create policy "Users and household owners can read audit events"
on public.audit_events for select to authenticated
using ( user_id = auth.uid() or public.household_role(household_id) = 'owner'
);
revoke insert, update, delete on public.audit_events from authenticated;
grant select on public.audit_events to authenticated;
revoke all on function public.rename_household(text) from public;
revoke all on function public.leave_household() from public;
revoke all on function public.create_household_role_invite(text, text, text, text) from public;
grant execute on function public.rename_household(text) to authenticated;
grant execute on function public.leave_household() to authenticated;
grant execute on function public.create_household_role_invite(text, text, text, text) to authenticated;
