-- Save one revision-checked Kitchen planning change through the server-only boundary.
create or replace function public.apply_mobile_kitchen_planning_state(
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
    or not exists (select 1 from auth.users where id = input_user_id) then
    raise exception 'Invalid account';
  end if;
  if input_payload is null or jsonb_typeof(input_payload) <> 'object'
    or pg_column_size(input_payload) > 2097152 then
    raise exception 'Invalid application state';
  end if;

  if input_expected_revision is null then
    insert into public.app_state (id, payload)
    values (input_user_id::text, input_payload)
    on conflict (id) do nothing
    returning * into state_row;
  else
    update public.app_state as state
    set payload = input_payload
    where state.id = input_user_id::text
      and state.updated_at = input_expected_revision
    returning state.* into state_row;
  end if;
  if state_row.id is null then return; end if;
  return query select state_row.payload, state_row.updated_at;
end;
$$;

revoke all on function public.apply_mobile_kitchen_planning_state(uuid, timestamptz, jsonb)
from public, anon, authenticated;
grant execute on function public.apply_mobile_kitchen_planning_state(uuid, timestamptz, jsonb)
to service_role;
