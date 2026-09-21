create or replace function public.pull_sync_page(
  input_after_sequence bigint,
  input_limit integer default 251
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  effective_limit integer;
  active_household_id uuid;
  household_joined_at timestamptz;
  page jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;
  if input_after_sequence is null or input_after_sequence < 0 then
    raise exception 'Sync sequence is invalid';
  end if;

  effective_limit := greatest(1, least(coalesce(input_limit, 251), 251));

  select membership.household_id, membership.joined_at
  into active_household_id, household_joined_at
  from public.household_memberships as membership
  where membership.user_id = current_user_id
    and membership.status = 'active'
  limit 1;

  with records as (
    select
      record.record_id,
      record.entity_type,
      record.scope_kind,
      record.scope_id,
      record.revision::text as revision,
      record.schema_version,
      record.updated_at,
      record.deleted_at,
      record.payload,
      record.change_sequence::text as change_sequence
    from public.sync_records as record
    where record.change_sequence > input_after_sequence
    order by record.change_sequence asc, record.record_id asc
    limit effective_limit
  )
  select coalesce(
    jsonb_agg(to_jsonb(records) order by records.change_sequence::bigint, records.record_id),
    '[]'::jsonb
  )
  into page
  from records;

  return jsonb_build_object(
    'active_household_id', active_household_id,
    'household_joined_at', household_joined_at,
    'records', page
  );
end;
$$;

revoke all on function public.pull_sync_page(bigint, integer) from public, anon;
grant execute on function public.pull_sync_page(bigint, integer) to authenticated;
