-- Commit legacy desktop private and shared state together behind the server boundary.
create or replace function public.apply_diarydock_state(
  input_user_id uuid,
  input_expected_private_revision timestamptz,
  input_expected_household_revision timestamptz,
  input_private_payload jsonb,
  input_household_payload jsonb
)
returns table(
  status text,
  private_revision timestamptz,
  household_revision timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  private_row public.app_state%rowtype;
  shared_row public.household_state%rowtype;
  target_household_id uuid;
  member_role text;
  private_exists boolean := false;
  shared_exists boolean := false;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  if input_user_id is null
    or not exists (select 1 from auth.users where id = input_user_id) then
    raise exception 'Invalid account';
  end if;
  if input_private_payload is null
    or jsonb_typeof(input_private_payload) <> 'object'
    or pg_column_size(input_private_payload) > 2097152 then
    raise exception 'Invalid private state';
  end if;
  if input_household_payload is null
    or jsonb_typeof(input_household_payload) <> 'object'
    or pg_column_size(input_household_payload) > 1048576
    or not (input_household_payload ?& array[
      'reminders', 'mealPlan', 'kitchenItems', 'kitchenRecipes',
      'kitchenNoticeboard', 'familyCalendarEvents', 'kidSchedules',
      'householdProfiles'
    ])
    or exists (
      select 1 from jsonb_object_keys(input_household_payload) as key
      where key <> all (array[
        'reminders', 'mealPlan', 'kitchenItems', 'kitchenRecipes',
        'kitchenNoticeboard', 'familyCalendarEvents', 'kidSchedules',
        'householdProfiles'
      ])
    ) then
    raise exception 'Invalid household state';
  end if;
  if exists (
    select 1 from unnest(array[
      'reminders', 'mealPlan', 'kitchenItems', 'kitchenRecipes',
      'kitchenNoticeboard', 'familyCalendarEvents', 'kidSchedules',
      'householdProfiles'
    ]) as item(key)
    where input_private_payload -> key is distinct from input_household_payload -> key
  ) then
    raise exception 'Private and household state do not match';
  end if;

  select membership.household_id, membership.role
  into target_household_id, member_role
  from public.household_memberships as membership
  where membership.user_id = input_user_id and membership.status = 'active'
  limit 1;
  if target_household_id is null then raise exception 'Household unavailable'; end if;

  select state.* into private_row from public.app_state as state
  where state.id = input_user_id::text for update;
  private_exists := found;
  select state.* into shared_row from public.household_state as state
  where state.household_id = target_household_id for update;
  shared_exists := found;

  if member_role = 'viewer' and not shared_exists then
    raise exception 'Household state unavailable';
  end if;

  if private_exists <> (input_expected_private_revision is not null)
    or (private_exists and private_row.updated_at is distinct from input_expected_private_revision)
    or shared_exists <> (input_expected_household_revision is not null)
    or (shared_exists and shared_row.updated_at is distinct from input_expected_household_revision) then
    return query select 'CONFLICT'::text,
      case when private_exists then private_row.updated_at else null end,
      case when shared_exists then shared_row.updated_at else null end;
    return;
  end if;

  if private_exists then
    update public.app_state as state set payload = input_private_payload
    where state.id = input_user_id::text returning state.* into private_row;
  else
    insert into public.app_state(id, payload)
    values (input_user_id::text, input_private_payload)
    on conflict (id) do nothing returning * into private_row;
    if private_row.id is null then
      return query select 'CONFLICT'::text, null::timestamptz,
        case when shared_exists then shared_row.updated_at else null end;
      return;
    end if;
  end if;

  if member_role in ('owner', 'member') then
    if shared_exists then
      update public.household_state as state set payload = input_household_payload
      where state.household_id = target_household_id returning state.* into shared_row;
    else
      insert into public.household_state(household_id, payload)
      values (target_household_id, input_household_payload)
      returning * into shared_row;
    end if;
  elsif member_role <> 'viewer' then
    raise exception 'Invalid household role';
  end if;

  return query select 'OK'::text, private_row.updated_at, shared_row.updated_at;
end;
$$;

-- Domain services use this narrower private-state compare-and-swap operation.
create or replace function public.apply_mobile_private_state(
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
  state_row public.app_state%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  if input_user_id is null
    or not exists (select 1 from auth.users where id = input_user_id)
    or input_payload is null
    or jsonb_typeof(input_payload) <> 'object'
    or pg_column_size(input_payload) > 2097152 then
    raise exception 'Invalid private state update';
  end if;
  if input_expected_revision is null then
    insert into public.app_state(id, payload)
    values (input_user_id::text, input_payload)
    on conflict (id) do nothing returning * into state_row;
  else
    update public.app_state as state set payload = input_payload
    where state.id = input_user_id::text
      and state.updated_at = input_expected_revision
    returning state.* into state_row;
  end if;
  if state_row.id is null then return; end if;
  return query select state_row.payload, state_row.updated_at;
end;
$$;

revoke all on function public.apply_diarydock_state(
  uuid, timestamptz, timestamptz, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_diarydock_state(
  uuid, timestamptz, timestamptz, jsonb, jsonb
) to service_role;
revoke all on function public.apply_mobile_private_state(
  uuid, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_mobile_private_state(
  uuid, timestamptz, jsonb
) to service_role;

revoke insert, update on table public.app_state from authenticated;
revoke insert, update on table public.household_state from authenticated;
