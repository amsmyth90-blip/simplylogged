-- Close the post-review race conditions in account deletion and action auditing.

create or replace function public.prepare_account_deletion(input_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  household_record record;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  for household_record in
    select household.id
    from public.households as household
    where household.owner_id = input_user_id
    for update
  loop
    if exists (
      select 1
      from public.household_memberships as membership
      where membership.household_id = household_record.id
        and membership.user_id <> input_user_id
        and membership.status = 'active'
    ) then
      raise exception 'Account deletion is paused because this person owns a household with other active members';
    end if;

    -- The locked, sole-owner household is removed in this transaction. A
    -- concurrent invite acceptance cannot create a membership beneath it.
    delete from public.households where id = household_record.id;
  end loop;

  return true;
end;
$$;

revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

create or replace function public.finalize_action_request(
  input_action_request_id uuid,
  input_decision text,
  input_completed boolean default false
)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  action_record public.action_requests%rowtype;
  next_status text;
  changed_at timestamptz := timezone('utc', now());
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if input_decision not in ('approve', 'dismiss') then
    raise exception 'Invalid action decision';
  end if;
  if input_decision = 'dismiss' and input_completed then
    raise exception 'A dismissed action cannot be completed';
  end if;

  select request.* into action_record
  from public.action_requests as request
  where request.id = input_action_request_id
    and request.user_id = auth.uid()
    and request.status = 'proposed'
  for update;

  if action_record.id is null then
    raise exception 'Action is no longer waiting for a decision';
  end if;

  next_status := case
    when input_decision = 'dismiss' then 'dismissed'
    when input_completed then 'completed'
    else 'approved'
  end;

  update public.action_requests as request
  set
    status = next_status,
    confirmed_at = case when input_decision = 'approve' then changed_at else request.confirmed_at end,
    completed_at = case when input_completed then changed_at else null end,
    cancelled_at = case when input_decision = 'dismiss' then changed_at else null end
  where request.id = action_record.id;

  if input_completed then
    insert into public.audit_events (user_id, actor_type, actor_id, event_type, action_request_id, metadata)
    values (
      auth.uid(),
      'user',
      auth.uid()::text,
      'ACTION_COMPLETED',
      action_record.id,
      jsonb_build_object('actionType', action_record.action_type)
    )
    on conflict (action_request_id, event_type)
      where action_request_id is not null and event_type = 'ACTION_COMPLETED'
    do nothing;
  end if;

  return query select action_record.id, next_status;
end;
$$;

revoke all on function public.finalize_action_request(uuid, text, boolean) from public, anon;
grant execute on function public.finalize_action_request(uuid, text, boolean) to authenticated;
