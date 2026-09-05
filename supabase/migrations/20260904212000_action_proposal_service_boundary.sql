-- Execute and finalise reviewed actions together; clients may only use the bounded API.
do $$
begin
  if to_regprocedure('public.finalize_action_request(uuid,text,boolean)') is not null then
    revoke all on function public.finalize_action_request(uuid,text,boolean)
    from public, anon, authenticated, service_role;
  end if;
end;
$$;

create or replace function public.decide_action_request_server(
  input_user_id uuid,
  input_action_request_id uuid,
  input_decision text
)
returns table(id uuid, status text)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  action_record public.action_requests%rowtype;
  completed boolean := false;
  next_status text;
  changed_at timestamptz := timezone('utc', now());
  due_date text;
  due_at timestamptz;
  reminder_type text;
  resource_type text;
  source_document_id text;
  room_id text;
  room_name text;
  offsets integer[];
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  if input_user_id is null
    or not exists (select 1 from auth.users where auth.users.id = input_user_id)
    or input_action_request_id is null
    or input_decision not in ('approve', 'dismiss') then
    raise exception 'Invalid action decision';
  end if;

  select request.* into action_record
  from public.action_requests as request
  where request.id = input_action_request_id
    and request.user_id = input_user_id
    and request.status = 'proposed'
  for update;
  if action_record.id is null then return; end if;

  if input_decision = 'approve'
    and action_record.action_type = 'create_reminder' then
    due_date := trim(action_record.proposed_payload ->> 'dueDate');
    reminder_type := trim(action_record.proposed_payload ->> 'reminderType');
    resource_type := trim(action_record.proposed_payload ->> 'resourceType');
    source_document_id := action_record.source_document_id;
    if jsonb_typeof(action_record.proposed_payload) <> 'object'
      or due_date !~ '^\d{4}-\d{2}-\d{2}$'
      or reminder_type not in ('mot_expiry','vaccination_due','warranty_expiry')
      or resource_type not in ('asset','pet','vehicle')
      or length(coalesce(trim(action_record.title), '')) not between 1 and 240
      or length(coalesce(source_document_id, '')) not between 1 and 180
      or not exists (
        select 1 from public.documents
        where documents.id::text = source_document_id
          and documents.user_id = input_user_id
      ) then
      raise exception 'Invalid reminder proposal';
    end if;
    begin
      due_at := (due_date || 'T09:00:00.000Z')::timestamptz;
    exception when others then
      raise exception 'Invalid reminder proposal';
    end;
    if due_at::date::text <> due_date then
      raise exception 'Invalid reminder proposal';
    end if;

    room_id := case resource_type when 'vehicle' then 'garage'
      when 'pet' then 'garden' else 'kitchen' end;
    room_name := case resource_type when 'vehicle' then 'Garage'
      when 'pet' then 'Garden' else 'Kitchen' end;
    offsets := case reminder_type
      when 'vaccination_due' then array[30,14,7,1]
      when 'warranty_expiry' then array[60,30,14,7,1]
      else array[90,60,30,14,7,1]
    end;
    perform public.sync_system_reminders_server(
      input_user_id,
      resource_type,
      'document:' || source_document_id,
      reminder_type,
      due_at,
      action_record.title,
      'Created from details you confirmed in an uploaded document.',
      room_id,
      room_name,
      reminder_type,
      'capture-' || reminder_type,
      1,
      offsets
    );
    completed := true;
  end if;

  next_status := case when input_decision = 'dismiss' then 'dismissed'
    when completed then 'completed' else 'approved' end;
  update public.action_requests as request
  set status = next_status,
      confirmed_at = case when input_decision = 'approve'
        then changed_at else request.confirmed_at end,
      completed_at = case when completed then changed_at else null end,
      cancelled_at = case when input_decision = 'dismiss'
        then changed_at else null end
  where request.id = action_record.id;

  if completed then
    insert into public.audit_events(
      user_id, actor_type, actor_id, event_type, action_request_id, metadata
    ) values (
      input_user_id, 'user', input_user_id::text, 'ACTION_COMPLETED',
      action_record.id,
      jsonb_build_object('actionType', action_record.action_type)
    ) on conflict do nothing;
  end if;
  return query select action_record.id, next_status;
end;
$$;

revoke all on function public.decide_action_request_server(uuid,uuid,text)
from public, anon, authenticated;
grant execute on function public.decide_action_request_server(uuid,uuid,text)
to service_role;
