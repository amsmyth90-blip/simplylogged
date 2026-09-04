-- Keep Life Check updates owner-derived, targeted and revision checked.
create or replace function public.apply_mobile_life_check(
  input_user_id uuid,
  input_expected_revision timestamptz,
  input_life_check jsonb
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
  expected_keys text[] := array['homeTenure','vehicles','pets','internationalTravel',
    'householdCollaboration','documentStorage','reminders','completedAt'];
  actual_keys text[];
  next_payload jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required'; end if;
  if input_user_id is null or not exists (select 1 from auth.users where id = input_user_id) then
    raise exception 'Invalid account';
  end if;
  if input_life_check is null or jsonb_typeof(input_life_check) <> 'object'
    or pg_column_size(input_life_check) > 2048 then raise exception 'Invalid Life Check'; end if;
  select array_agg(value order by value) into actual_keys
  from jsonb_object_keys(input_life_check) value;
  select array_agg(value order by value) into expected_keys from unnest(expected_keys) value;
  if actual_keys is distinct from expected_keys
    or input_life_check->>'homeTenure' not in ('not-set','own','rent','other','not-applicable')
    or input_life_check->>'vehicles' not in ('not-set','yes','no')
    or input_life_check->>'pets' not in ('not-set','yes','no')
    or input_life_check->>'internationalTravel' not in ('not-set','yes','no')
    or input_life_check->>'householdCollaboration' not in ('not-set','yes','no')
    or input_life_check->>'documentStorage' not in ('not-set','yes','no')
    or input_life_check->>'reminders' not in ('not-set','yes','no')
    or (input_life_check->'completedAt' <> 'null'::jsonb
      and (input_life_check->>'completedAt')::timestamptz is null) then
    raise exception 'Invalid Life Check';
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
  next_payload := jsonb_set(state_row.payload, '{onboarding}',
    coalesce(state_row.payload->'onboarding', '{}'::jsonb), true);
  next_payload := jsonb_set(next_payload, '{onboarding,lifeCheck}', input_life_check, true);
  update public.app_state set payload = next_payload where id = input_user_id::text
  returning updated_at into state_row.updated_at;
  return query select 'OK'::text, state_row.updated_at;
end;
$$;

revoke all on function public.apply_mobile_life_check(uuid,timestamptz,jsonb)
from public, anon, authenticated;
grant execute on function public.apply_mobile_life_check(uuid,timestamptz,jsonb) to service_role;
