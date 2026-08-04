alter table public.household_memberships
  drop constraint if exists household_memberships_user_id_key;

create unique index if not exists household_memberships_one_active_user_idx
  on public.household_memberships (user_id)
  where status = 'active';

create or replace function public.update_household_member_role(
  member_user_id uuid,
  new_role text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_household_id uuid;
  changed_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if new_role not in ('member', 'viewer') then
    raise exception 'Role must be member or viewer';
  end if;

  current_household_id := public.ensure_user_household();

  if public.household_role(current_household_id) <> 'owner' then
    raise exception 'Only the household owner can change access';
  end if;

  update public.household_memberships
  set role = new_role
  where household_id = current_household_id
    and user_id = member_user_id
    and role <> 'owner'
    and status = 'active';

  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

create or replace function public.remove_household_member(member_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_household_id uuid;
  changed_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  current_household_id := public.ensure_user_household();

  if public.household_role(current_household_id) <> 'owner' then
    raise exception 'Only the household owner can remove members';
  end if;

  update public.household_memberships
  set status = 'removed'
  where household_id = current_household_id
    and user_id = member_user_id
    and role <> 'owner'
    and status = 'active';

  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

create or replace function public.create_household_invite(
  invite_email text,
  invite_name text,
  invite_relation text,
  invite_access text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_household_id uuid;
  invite_token uuid;
  invite_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(invite_email), '') is null then
    raise exception 'An email address is required';
  end if;

  current_household_id := public.ensure_user_household();

  if public.household_role(current_household_id) <> 'owner' then
    raise exception 'Only the household owner can invite members';
  end if;

  invite_role := case
    when invite_access ilike '%partner%' or invite_access ilike '%family viewer%' then 'member'
    else 'viewer'
  end;

  update public.household_invites
  set status = 'cancelled'
  where household_id = current_household_id
    and lower(email) = lower(trim(invite_email))
    and status = 'pending';

  insert into public.household_invites (
    household_id,
    email,
    name,
    relation,
    access,
    role,
    invited_by
  )
  values (
    current_household_id,
    lower(trim(invite_email)),
    trim(invite_name),
    coalesce(nullif(trim(invite_relation), ''), 'Family'),
    invite_access,
    invite_role,
    auth.uid()
  )
  returning token into invite_token;

  return invite_token;
end;
$$;

create or replace function public.cancel_household_invite(invite_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_household_id uuid;
  changed_count integer;
begin
  current_household_id := public.ensure_user_household();

  if public.household_role(current_household_id) <> 'owner' then
    raise exception 'Only the household owner can cancel invites';
  end if;

  update public.household_invites
  set status = 'cancelled'
  where token = invite_token
    and household_id = current_household_id
    and status = 'pending';

  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

create or replace function public.renew_household_invite(invite_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_household_id uuid;
  changed_count integer;
begin
  current_household_id := public.ensure_user_household();

  if public.household_role(current_household_id) <> 'owner' then
    raise exception 'Only the household owner can renew invites';
  end if;

  update public.household_invites
  set
    expires_at = timezone('utc', now()) + interval '14 days',
    status = 'pending'
  where token = invite_token
    and household_id = current_household_id;

  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

revoke all on function public.update_household_member_role(uuid, text) from public;
revoke all on function public.remove_household_member(uuid) from public;
grant execute on function public.update_household_member_role(uuid, text) to authenticated;
grant execute on function public.remove_household_member(uuid) to authenticated;
