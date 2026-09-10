-- Promote household identity to first-class, tenant-scoped records.

alter table public.households
  add column if not exists status text not null default 'active'
  check (status in ('active', 'disabled'));

alter table public.household_memberships
  add column if not exists member_kind text not null default 'adult'
  check (member_kind in ('owner', 'adult', 'teen', 'child', 'trusted_contact'));

alter table public.household_memberships
  drop constraint if exists household_memberships_status_check;
alter table public.household_memberships
  add constraint household_memberships_status_check
  check (status in ('active', 'disabled', 'removed'));

update public.household_memberships
set member_kind = case
  when role = 'owner' then 'owner'
  when role = 'viewer' then 'trusted_contact'
  else 'adult'
end;

create table if not exists public.household_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  first_name text not null check (length(trim(first_name)) between 1 and 100),
  last_name text not null default '' check (length(last_name) <= 100),
  preferred_name text not null default '' check (length(preferred_name) <= 100),
  relationship text not null default 'Household member'
    check (length(trim(relationship)) between 1 and 100),
  person_type text not null default 'adult'
    check (person_type in ('owner', 'adult', 'teen', 'child', 'dependent', 'trusted_contact')),
  date_of_birth date,
  avatar_storage_path text check (
    avatar_storage_path is null or length(avatar_storage_path) between 1 and 500
  ),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists household_people_linked_user_idx
  on public.household_people (household_id, linked_user_id)
  where linked_user_id is not null;
create index if not exists household_people_directory_idx
  on public.household_people (household_id, status, created_at);

drop trigger if exists household_people_set_updated_at on public.household_people;
create trigger household_people_set_updated_at
before update on public.household_people
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
  join public.households as household on household.id = membership.household_id
  where membership.household_id = target_household_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and household.status = 'active'
  limit 1;
$$;

create or replace function public.sync_membership_household_person()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := coalesce(nullif(trim(new.display_name), ''), 'Household member');
begin
  if new.status = 'active' then
    insert into public.household_people (
      household_id, linked_user_id, first_name, preferred_name, relationship,
      person_type, status, created_by
    ) values (
      new.household_id, new.user_id, split_part(clean_name, ' ', 1), clean_name,
      coalesce(nullif(trim(new.relation), ''), 'Household member'),
      case when new.role = 'owner' then 'owner'
        when new.member_kind = 'trusted_contact' then 'trusted_contact'
        else new.member_kind end,
      'active', new.user_id
    ) on conflict (household_id, linked_user_id)
      where linked_user_id is not null
      do update set preferred_name = excluded.preferred_name,
        relationship = excluded.relationship, person_type = excluded.person_type,
        status = 'active';
  else
    update public.household_people set status = 'archived'
    where household_id = new.household_id and linked_user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists household_memberships_sync_person on public.household_memberships;
create trigger household_memberships_sync_person
after insert or update of role, member_kind, display_name, relation, status
on public.household_memberships
for each row execute function public.sync_membership_household_person();

insert into public.household_people (
  household_id, linked_user_id, first_name, preferred_name, relationship,
  person_type, status, created_by, created_at
)
select membership.household_id, membership.user_id,
  split_part(coalesce(nullif(trim(membership.display_name), ''), 'Household member'), ' ', 1),
  coalesce(nullif(trim(membership.display_name), ''), 'Household member'),
  coalesce(nullif(trim(membership.relation), ''), 'Household member'),
  case when membership.role = 'owner' then 'owner'
    when membership.member_kind = 'trusted_contact' then 'trusted_contact'
    else membership.member_kind end,
  case when membership.status = 'active' then 'active' else 'archived' end,
  membership.user_id, membership.joined_at
from public.household_memberships as membership
on conflict (household_id, linked_user_id)
  where linked_user_id is not null do nothing;

insert into public.household_people (
  id, household_id, first_name, preferred_name, relationship, person_type,
  status, created_by, created_at
)
select (profile ->> 'id')::uuid, state.household_id,
  split_part(trim(profile ->> 'name'), ' ', 1), trim(profile ->> 'name'),
  coalesce(nullif(trim(profile ->> 'relationship'), ''), 'Household member'),
  case profile ->> 'kind' when 'child' then 'child' when 'trusted' then 'trusted_contact'
    else 'adult' end,
  'active', household.owner_id, state.updated_at
from public.household_state as state
join public.households as household on household.id = state.household_id
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(state.payload -> 'householdProfiles') = 'array'
    then state.payload -> 'householdProfiles' else '[]'::jsonb end
) as profile
where profile ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and nullif(trim(profile ->> 'linkedUserId'), '') is null
  and length(trim(profile ->> 'name')) between 1 and 100
on conflict (id) do nothing;

do $$
declare
  account record;
  private_payload jsonb;
  new_household_id uuid;
  removed_household_id uuid;
  display_name text;
  household_name text;
begin
  for account in
    select users.id, users.email, users.raw_user_meta_data
    from auth.users as users
    where not exists (
      select 1 from public.household_memberships as membership
      where membership.user_id = users.id and membership.status = 'active'
    )
  loop
    select state.payload into private_payload from public.app_state as state
    where state.id = account.id::text;
    display_name := coalesce(
      nullif(private_payload #>> '{settingsProfile,name}', ''),
      nullif(account.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(account.email, 'Household owner'), '@', 1)
    );
    household_name := coalesce(
      nullif(private_payload #>> '{onboarding,householdName}', ''),
      display_name || '''s household'
    );
    insert into public.households (name, owner_id)
    values (left(household_name, 160), account.id)
    returning id into new_household_id;
    select membership.household_id into removed_household_id
    from public.household_memberships as membership
    where membership.user_id = account.id and membership.status <> 'active'
    limit 1 for update;
    if removed_household_id is null then
      insert into public.household_memberships (
        household_id, user_id, role, member_kind, display_name, relation
      ) values (
        new_household_id, account.id, 'owner', 'owner', left(display_name, 160),
        'Household owner'
      );
    else
      update public.household_memberships set household_id = new_household_id,
        role = 'owner', member_kind = 'owner', display_name = left(display_name, 160),
        relation = 'Household owner', status = 'active',
        joined_at = timezone('utc', now())
      where household_id = removed_household_id and user_id = account.id;
    end if;
    insert into public.household_state (household_id, payload)
    values (new_household_id, jsonb_strip_nulls(jsonb_build_object(
      'reminders', private_payload -> 'reminders',
      'mealPlan', private_payload -> 'mealPlan',
      'kitchenItems', private_payload -> 'kitchenItems',
      'kitchenRecipes', private_payload -> 'kitchenRecipes',
      'kitchenNoticeboard', private_payload -> 'kitchenNoticeboard',
      'familyCalendarEvents', private_payload -> 'familyCalendarEvents',
      'kidSchedules', private_payload -> 'kidSchedules',
      'householdProfiles', private_payload -> 'householdProfiles'
    ))) on conflict (household_id) do nothing;
  end loop;
end;
$$;

alter table public.household_people enable row level security;
drop policy if exists "Active household members can read people" on public.household_people;
create policy "Active household members can read people"
on public.household_people for select to authenticated
using (public.household_role(household_id) is not null);

create or replace function public.create_household_person(
  input_first_name text, input_last_name text, input_preferred_name text,
  input_relationship text, input_person_type text, input_date_of_birth date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_household_id uuid;
  new_person_id uuid;
  display_name text;
  profile_kind text;
  rate_allowed boolean;
begin
  perform public.require_recent_authentication(900);
  select result.allowed into rate_allowed
  from public.check_rate_limit(
    'household-person-create:' || auth.uid()::text, 30, 600
  ) as result;
  if not coalesce(rate_allowed, false) then
    raise exception 'Too many household person changes';
  end if;
  current_household_id := public.ensure_user_household();
  if public.household_role(current_household_id) <> 'owner' then
    raise exception 'Household owner required';
  end if;
  if length(trim(input_first_name)) not between 1 and 100
    or length(trim(coalesce(input_last_name, ''))) > 100
    or length(trim(coalesce(input_preferred_name, ''))) > 100
    or length(trim(input_relationship)) not between 1 and 100
    or input_person_type not in ('adult', 'teen', 'child', 'dependent', 'trusted_contact')
    or input_date_of_birth > current_date then raise exception 'Invalid household person'; end if;
  perform public.lock_current_household();
  insert into public.household_people (
    household_id, first_name, last_name, preferred_name, relationship,
    person_type, date_of_birth, created_by
  ) values (
    current_household_id, trim(input_first_name), trim(coalesce(input_last_name, '')),
    trim(coalesce(input_preferred_name, '')), trim(input_relationship),
    input_person_type, input_date_of_birth, auth.uid()
  ) returning id into new_person_id;
  display_name := coalesce(nullif(trim(input_preferred_name), ''),
    trim(input_first_name || ' ' || coalesce(input_last_name, '')));
  profile_kind := case when input_person_type in ('child', 'teen', 'dependent') then 'child'
    when input_person_type = 'trusted_contact' then 'trusted' else 'adult' end;
  insert into public.household_state (household_id, payload)
  values (current_household_id, '{}'::jsonb) on conflict (household_id) do nothing;
  update public.household_state set payload = jsonb_set(payload, '{householdProfiles}',
    coalesce(payload -> 'householdProfiles', '[]'::jsonb) || jsonb_build_object(
      'id', new_person_id, 'name', display_name, 'kind', profile_kind,
      'relationship', trim(input_relationship), 'colour', 'sage', 'appAccess', 'none',
      'showInSchedules', true, 'showInMeals', true, 'showInReminders', true
    ), true)
  where household_id = current_household_id;
  return new_person_id;
end;
$$;

revoke all on table public.household_people from public, anon, authenticated;
grant select on table public.household_people to authenticated;
revoke all on function public.create_household_person(text, text, text, text, text, date)
  from public, anon;
grant execute on function public.create_household_person(text, text, text, text, text, date)
  to authenticated;
revoke all on function public.sync_membership_household_person()
  from public, anon, authenticated;
