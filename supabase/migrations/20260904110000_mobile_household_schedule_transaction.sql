-- Preserve schedule data created before household sharing included these keys.
update public.household_state as state
set payload = state.payload || jsonb_strip_nulls(jsonb_build_object(
  'kidSchedules', case
    when not (state.payload ? 'kidSchedules')
      and jsonb_typeof(private_state.payload -> 'kidSchedules') = 'array'
    then private_state.payload -> 'kidSchedules'
  end,
  'householdProfiles', case
    when not (state.payload ? 'householdProfiles')
      and jsonb_typeof(private_state.payload -> 'householdProfiles') = 'array'
    then private_state.payload -> 'householdProfiles'
  end
))
from public.households as household
join public.app_state as private_state on private_state.id = household.owner_id::text
where state.household_id = household.id
  and (
    (not (state.payload ? 'kidSchedules')
      and jsonb_typeof(private_state.payload -> 'kidSchedules') = 'array')
    or (not (state.payload ? 'householdProfiles')
      and jsonb_typeof(private_state.payload -> 'householdProfiles') = 'array')
  );

create or replace function public.preserve_household_schedule_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  private_payload jsonb;
begin
  select private_state.payload into private_payload
  from public.households as household
  join public.app_state as private_state on private_state.id = household.owner_id::text
  where household.id = new.household_id;

  if not (new.payload ? 'kidSchedules')
    and jsonb_typeof(private_payload -> 'kidSchedules') = 'array' then
    new.payload := jsonb_set(
      new.payload, '{kidSchedules}', private_payload -> 'kidSchedules', true
    );
  end if;
  if not (new.payload ? 'householdProfiles')
    and jsonb_typeof(private_payload -> 'householdProfiles') = 'array' then
    new.payload := jsonb_set(
      new.payload, '{householdProfiles}', private_payload -> 'householdProfiles', true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists household_state_preserve_schedules on public.household_state;
create trigger household_state_preserve_schedules
before insert on public.household_state
for each row execute function public.preserve_household_schedule_state();

-- Save one revision-checked shared schedule change through the server-only boundary.
create or replace function public.apply_mobile_household_schedule_state(
  input_user_id uuid,
  input_expected_revision timestamptz,
  input_payload jsonb
)
returns table(payload jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_household_id uuid;
  state_row public.household_state%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  if input_user_id is null or input_payload is null
    or jsonb_typeof(input_payload) <> 'object'
    or pg_column_size(input_payload) > 2097152 then
    raise exception 'Invalid schedule state';
  end if;

  select membership.household_id into current_household_id
  from public.household_memberships as membership
  where membership.user_id = input_user_id
    and membership.status = 'active'
    and membership.role in ('owner', 'member')
  limit 1;
  if current_household_id is null then
    raise exception 'Schedule access denied';
  end if;

  update public.household_state as state
  set payload = input_payload
  where state.household_id = current_household_id
    and state.updated_at = input_expected_revision
  returning state.* into state_row;
  if state_row.household_id is null then return; end if;
  return query select state_row.payload, state_row.updated_at;
end;
$$;

revoke all on function public.apply_mobile_household_schedule_state(uuid, timestamptz, jsonb)
from public, anon, authenticated;
grant execute on function public.apply_mobile_household_schedule_state(uuid, timestamptz, jsonb)
to service_role;
