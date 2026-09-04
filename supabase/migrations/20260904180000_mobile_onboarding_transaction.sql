-- Save mobile onboarding as one owner-derived, revision-checked transaction.
create or replace function public.apply_mobile_onboarding(
  input_user_id uuid,
  input_expected_revision timestamptz,
  input_setup jsonb
)
returns table(status text, revision timestamptz)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  state_row public.app_state%rowtype;
  inserted boolean := false;
  affected integer;
  setup_keys text[] := array['answers','householdMembers','householdName','profileName','selectedAreaIds'];
  answer_keys text[] := array['documentStorage','homeTenure','householdCollaboration',
    'internationalTravel','pets','reminders','vehicles'];
  actual_keys text[];
  profile_initials text;
  profile_state jsonb;
  onboarding_state jsonb;
  completed_answers jsonb;
  next_payload jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required'; end if;
  if input_user_id is null or not exists (select 1 from auth.users where id = input_user_id) then
    raise exception 'Invalid account';
  end if;
  if input_setup is null or jsonb_typeof(input_setup) <> 'object'
    or pg_column_size(input_setup) > 4096 then raise exception 'Invalid onboarding setup'; end if;
  select array_agg(value order by value) into actual_keys from jsonb_object_keys(input_setup) value;
  select array_agg(value order by value) into setup_keys from unnest(setup_keys) value;
  if actual_keys is distinct from setup_keys
    or jsonb_typeof(input_setup->'profileName') <> 'string'
    or length(trim(input_setup->>'profileName')) not between 1 and 160
    or jsonb_typeof(input_setup->'householdName') <> 'string'
    or length(trim(input_setup->>'householdName')) not between 1 and 160
    or jsonb_typeof(input_setup->'householdMembers') <> 'string'
    or input_setup->>'householdMembers' not in ('Just me','Me and my partner',
      'Family with children','Other shared household')
    or jsonb_typeof(input_setup->'selectedAreaIds') <> 'array'
    or jsonb_array_length(input_setup->'selectedAreaIds') not between 4 and 10
    or jsonb_typeof(input_setup->'answers') <> 'object' then
    raise exception 'Invalid onboarding setup';
  end if;
  if exists (select 1 from jsonb_array_elements(input_setup->'selectedAreaIds') area
      where jsonb_typeof(area) <> 'string' or area #>> '{}' not in
        ('office','kitchen','mailbox','front-gate','bedroom','family-room','garage','garden','driveway','attic'))
    or (select count(*) from jsonb_array_elements(input_setup->'selectedAreaIds'))
      <> (select count(distinct area #>> '{}') from jsonb_array_elements(input_setup->'selectedAreaIds') area)
    or not (input_setup->'selectedAreaIds' @> '["office","kitchen","mailbox","front-gate"]'::jsonb) then
    raise exception 'Invalid onboarding areas';
  end if;
  select array_agg(value order by value) into actual_keys
  from jsonb_object_keys(input_setup->'answers') value;
  select array_agg(value order by value) into answer_keys from unnest(answer_keys) value;
  if actual_keys is distinct from answer_keys
    or input_setup->'answers'->>'homeTenure' not in ('own','rent','other','not-applicable')
    or input_setup->'answers'->>'vehicles' not in ('yes','no')
    or input_setup->'answers'->>'pets' not in ('yes','no')
    or input_setup->'answers'->>'internationalTravel' not in ('yes','no')
    or input_setup->'answers'->>'householdCollaboration' not in ('yes','no')
    or input_setup->'answers'->>'documentStorage' not in ('yes','no')
    or input_setup->'answers'->>'reminders' not in ('yes','no') then
    raise exception 'Invalid onboarding answers';
  end if;

  insert into public.app_state(id, payload) values (input_user_id::text, '{}'::jsonb)
  on conflict (id) do nothing;
  get diagnostics affected = row_count;
  inserted := affected = 1;
  select * into state_row from public.app_state where id = input_user_id::text for update;
  if (inserted and input_expected_revision is not null)
    or (not inserted and state_row.updated_at is distinct from input_expected_revision) then
    return query select 'CONFLICT'::text, state_row.updated_at; return;
  end if;

  select string_agg(upper(left(part, 1)), '') into profile_initials
  from (select part from regexp_split_to_table(trim(input_setup->>'profileName'), '\s+') part limit 2) names;
  profile_state := case when jsonb_typeof(state_row.payload->'settingsProfile') = 'object'
    then state_row.payload->'settingsProfile' else '{}'::jsonb end;
  profile_state := profile_state || jsonb_build_object('name', trim(input_setup->>'profileName'),
    'initials', profile_initials);
  completed_answers := input_setup->'answers'
    || jsonb_build_object('completedAt', timezone('utc', now()));
  onboarding_state := case when jsonb_typeof(state_row.payload->'onboarding') = 'object'
    then state_row.payload->'onboarding' else '{}'::jsonb end;
  onboarding_state := onboarding_state || jsonb_build_object('completed', true,
    'dashboardAreasConfigured', true, 'householdName', trim(input_setup->>'householdName'),
    'householdMembers', input_setup->>'householdMembers',
    'selectedRooms', input_setup->'selectedAreaIds', 'lifeCheck', completed_answers);
  next_payload := jsonb_set(state_row.payload, '{settingsProfile}', profile_state, true);
  next_payload := jsonb_set(next_payload, '{onboarding}', onboarding_state, true);
  update public.app_state set payload = next_payload where id = input_user_id::text
  returning updated_at into state_row.updated_at;
  return query select 'OK'::text, state_row.updated_at;
end;
$$;

revoke all on function public.apply_mobile_onboarding(uuid,timestamptz,jsonb)
from public, anon, authenticated;
grant execute on function public.apply_mobile_onboarding(uuid,timestamptz,jsonb) to service_role;
