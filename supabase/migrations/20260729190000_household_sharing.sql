create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.household_memberships (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member', 'viewer')),
  display_name text not null default '',
  relation text not null default 'Household member',
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (household_id, user_id),
  unique (user_id)
);

create table if not exists public.household_state (
  household_id uuid primary key references public.households(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.household_invites (
  token uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  name text not null,
  relation text not null default 'Family',
  access text not null,
  role text not null check (role in ('member', 'viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '14 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if to_regclass('public.family_invites') is not null then
    alter table public.family_invites add column if not exists email text;
  end if;
end;
$$;

create index if not exists household_memberships_household_idx
  on public.household_memberships (household_id, status);
create index if not exists household_invites_household_idx
  on public.household_invites (household_id, status, created_at desc);
create index if not exists household_invites_email_idx
  on public.household_invites (lower(email), status);

create or replace function public.touch_household_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists households_set_updated_at on public.households;
create trigger households_set_updated_at
before update on public.households
for each row execute function public.touch_household_updated_at();

drop trigger if exists household_memberships_set_updated_at on public.household_memberships;
create trigger household_memberships_set_updated_at
before update on public.household_memberships
for each row execute function public.touch_household_updated_at();

drop trigger if exists household_state_set_updated_at on public.household_state;
create trigger household_state_set_updated_at
before update on public.household_state
for each row execute function public.touch_household_updated_at();

drop trigger if exists household_invites_set_updated_at on public.household_invites;
create trigger household_invites_set_updated_at
before update on public.household_invites
for each row execute function public.touch_household_updated_at();

create or replace function public.household_role(target_household_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select membership.role
  from public.household_memberships as membership
  where membership.household_id = target_household_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
  limit 1;
$$;

revoke all on function public.household_role(uuid) from public;
grant execute on function public.household_role(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_memberships enable row level security;
alter table public.household_state enable row level security;
alter table public.household_invites enable row level security;

drop policy if exists "Household members can read household" on public.households;
create policy "Household members can read household"
on public.households for select to authenticated
using (public.household_role(id) is not null);

drop policy if exists "Household owners can update household" on public.households;
create policy "Household owners can update household"
on public.households for update to authenticated
using (public.household_role(id) = 'owner')
with check (public.household_role(id) = 'owner');

drop policy if exists "Household members can read memberships" on public.household_memberships;
create policy "Household members can read memberships"
on public.household_memberships for select to authenticated
using (public.household_role(household_id) is not null);

drop policy if exists "Household collaborators can read shared state" on public.household_state;
create policy "Household collaborators can read shared state"
on public.household_state for select to authenticated
using (public.household_role(household_id) in ('owner', 'member'));

drop policy if exists "Household collaborators can create shared state" on public.household_state;
create policy "Household collaborators can create shared state"
on public.household_state for insert to authenticated
with check (public.household_role(household_id) in ('owner', 'member'));

drop policy if exists "Household collaborators can update shared state" on public.household_state;
create policy "Household collaborators can update shared state"
on public.household_state for update to authenticated
using (public.household_role(household_id) in ('owner', 'member'))
with check (public.household_role(household_id) in ('owner', 'member'));

drop policy if exists "Household collaborators can read invites" on public.household_invites;
create policy "Household collaborators can read invites"
on public.household_invites for select to authenticated
using (public.household_role(household_id) in ('owner', 'member'));

create or replace function public.ensure_user_household()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_household_id uuid;
  private_payload jsonb;
  household_name text;
  display_name text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select membership.household_id
    into current_household_id
  from public.household_memberships as membership
  where membership.user_id = current_user_id
    and membership.status = 'active'
  limit 1;

  if current_household_id is not null then
    return current_household_id;
  end if;

  select state.payload
    into private_payload
  from public.app_state as state
  where state.id = current_user_id::text;

  household_name := coalesce(
    nullif(private_payload #>> '{onboarding,householdName}', ''),
    split_part(coalesce(auth.jwt() ->> 'email', 'My'), '@', 1) || '''s household'
  );
  display_name := coalesce(
    nullif(private_payload #>> '{settingsProfile,name}', ''),
    split_part(coalesce(auth.jwt() ->> 'email', 'Household owner'), '@', 1)
  );

  insert into public.households (name, owner_id)
  values (household_name, current_user_id)
  returning id into current_household_id;

  insert into public.household_memberships (
    household_id,
    user_id,
    role,
    display_name,
    relation
  )
  values (
    current_household_id,
    current_user_id,
    'owner',
    display_name,
    'Household owner'
  );

  insert into public.household_state (household_id, payload)
  values (
    current_household_id,
    jsonb_strip_nulls(jsonb_build_object(
      'householdMembers', private_payload -> 'householdMembers',
      'familyInvites', private_payload -> 'familyInvites',
      'reminders', private_payload -> 'reminders',
      'mealPlan', private_payload -> 'mealPlan',
      'kitchenItems', private_payload -> 'kitchenItems',
      'kitchenRecipes', private_payload -> 'kitchenRecipes',
      'kitchenNoticeboard', private_payload -> 'kitchenNoticeboard',
      'familyCalendarEvents', private_payload -> 'familyCalendarEvents'
    ))
  );

  return current_household_id;
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

  if public.household_role(current_household_id) not in ('owner', 'member') then
    raise exception 'You do not have permission to invite household members';
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

create or replace function public.get_household_invite(invite_token uuid)
returns table (
  token uuid,
  household_name text,
  invite_name text,
  relation text,
  access text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  signed_in_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    invite.token,
    household.name,
    invite.name,
    invite.relation,
    invite.access,
    invite.expires_at
  from public.household_invites as invite
  join public.households as household on household.id = invite.household_id
  where invite.token = invite_token
    and invite.status = 'pending'
    and invite.expires_at > timezone('utc', now())
    and lower(invite.email) = signed_in_email;
end;
$$;

create or replace function public.accept_household_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_record public.household_invites%rowtype;
  signed_in_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  member_object jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
    into invite_record
  from public.household_invites
  where token = invite_token
  for update;

  if invite_record.token is null
    or invite_record.status <> 'pending'
    or invite_record.expires_at <= timezone('utc', now()) then
    raise exception 'This invite is no longer active';
  end if;

  if lower(invite_record.email) <> signed_in_email then
    raise exception 'Sign in with the email address this invite was sent to';
  end if;

  if exists (
    select 1
    from public.household_memberships
    where user_id = auth.uid()
      and household_id <> invite_record.household_id
      and status = 'active'
  ) then
    raise exception 'This account already belongs to another household';
  end if;

  insert into public.household_memberships (
    household_id,
    user_id,
    role,
    display_name,
    relation
  )
  values (
    invite_record.household_id,
    auth.uid(),
    invite_record.role,
    invite_record.name,
    invite_record.relation
  )
  on conflict (household_id, user_id) do update
  set
    role = excluded.role,
    display_name = excluded.display_name,
    relation = excluded.relation,
    status = 'active';

  update public.household_invites
  set
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = timezone('utc', now())
  where token = invite_token;

  member_object := jsonb_build_object(
    'id', auth.uid()::text,
    'name', invite_record.name,
    'role', invite_record.relation,
    'access', case when invite_record.role = 'member' then 'Shared access' else 'Limited access' end,
    'accessTone', case when invite_record.role = 'member' then 'shared' else 'limited' end,
    'note', invite_record.relation || ' joined through a secure DiaryDock invite.',
    'initials', upper(left(invite_record.name, 1)),
    'manages', case when invite_record.role = 'member'
      then '["Kitchen","Calendar","Reminders","Family Room"]'::jsonb
      else '[]'::jsonb
    end,
    'lastActive', 'Now'
  );

  update public.household_state
  set payload =
    jsonb_set(
      jsonb_set(
        payload,
        '{householdMembers}',
        coalesce(payload -> 'householdMembers', '[]'::jsonb) || member_object,
        true
      ),
      '{familyInvites}',
      coalesce(
        (
          select jsonb_agg(item)
          from jsonb_array_elements(coalesce(payload -> 'familyInvites', '[]'::jsonb)) as item
          where item ->> 'id' <> invite_token::text
        ),
        '[]'::jsonb
      ),
      true
    )
  where household_id = invite_record.household_id;

  return invite_record.household_id;
end;
$$;

create or replace function public.cancel_household_invite(invite_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  changed_count integer;
begin
  update public.household_invites
  set status = 'cancelled'
  where token = invite_token
    and status = 'pending'
    and public.household_role(household_id) in ('owner', 'member');

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
  changed_count integer;
begin
  update public.household_invites
  set
    expires_at = timezone('utc', now()) + interval '14 days',
    status = 'pending'
  where token = invite_token
    and public.household_role(household_id) in ('owner', 'member');

  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

revoke all on function public.ensure_user_household() from public;
revoke all on function public.create_household_invite(text, text, text, text) from public;
revoke all on function public.get_household_invite(uuid) from public;
revoke all on function public.accept_household_invite(uuid) from public;
revoke all on function public.cancel_household_invite(uuid) from public;
revoke all on function public.renew_household_invite(uuid) from public;

grant execute on function public.ensure_user_household() to authenticated;
grant execute on function public.create_household_invite(text, text, text, text) to authenticated;
grant execute on function public.get_household_invite(uuid) to authenticated;
grant execute on function public.accept_household_invite(uuid) to authenticated;
grant execute on function public.cancel_household_invite(uuid) to authenticated;
grant execute on function public.renew_household_invite(uuid) to authenticated;

grant select, update on table public.households to authenticated;
grant select on table public.household_memberships to authenticated;
grant select, insert, update on table public.household_state to authenticated;
grant select on table public.household_invites to authenticated;
