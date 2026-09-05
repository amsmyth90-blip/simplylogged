-- Authorise reminder changes against immutable server scope, never client input.
create or replace function public.can_mutate_household_reminder(
  input_user_id uuid,
  input_household_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.household_memberships as member
    where member.user_id = input_user_id
      and member.household_id = input_household_id
      and member.status = 'active' and member.role in ('owner','member')
  );
$$;

revoke all on function public.can_mutate_household_reminder(uuid,uuid)
from public, anon, authenticated, service_role;

create or replace function public.apply_reminder_sync_mutation(
  current_user_id uuid,
  mutation jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_record public.sync_records;
  result_record public.sync_records;
  target_record_id uuid := (mutation ->> 'recordId')::uuid;
  operation text := mutation ->> 'operation';
  expected_revision text := mutation ->> 'expectedRevision';
  schema_version integer := (mutation ->> 'schemaVersion')::integer;
  payload jsonb := mutation -> 'payload';
  source_id text;
  document_id text;
  target_scope_kind text;
  target_scope_id uuid;
  target_owner_id uuid;
  member_role text;
begin
  if mutation ->> 'entityType' <> 'reminder' or schema_version <> 1 then
    return jsonb_build_object('status','REJECTED','record',null,'errorCode','UNSUPPORTED_SCHEMA');
  end if;
  if operation not in ('UPSERT','DELETE') then
    return jsonb_build_object('status','REJECTED','record',null,'errorCode','INVALID_MUTATION');
  end if;

  select * into current_record from public.sync_records
  where sync_records.record_id = target_record_id
    and entity_type = 'reminder'
    and (
      (scope_kind = 'USER' and owner_id = current_user_id)
      or (scope_kind = 'HOUSEHOLD' and exists (
        select 1 from public.household_memberships as member
        where member.user_id = current_user_id
          and member.household_id = sync_records.scope_id
          and member.status = 'active'
      ))
    )
  for update;

  if current_record.record_id is null and exists (
    select 1 from public.sync_records where record_id = target_record_id
  ) then
    return jsonb_build_object('status','REJECTED','record',null,'errorCode','FORBIDDEN');
  end if;
  if current_record.record_id is not null
    and current_record.scope_kind = 'HOUSEHOLD'
    and not public.can_mutate_household_reminder(current_user_id, current_record.scope_id) then
    return jsonb_build_object('status','REJECTED','record',null,'errorCode','FORBIDDEN');
  end if;
  if current_record.record_id is not null
    and (expected_revision is null or expected_revision <> current_record.revision::text) then
    return jsonb_build_object('status','CONFLICT',
      'record',public.sync_record_json(current_record),'errorCode',null);
  end if;
  if current_record.record_id is null and expected_revision is not null then
    return jsonb_build_object('status','REJECTED','record',null,'errorCode','INVALID_MUTATION');
  end if;
  if operation = 'DELETE' and current_record.record_id is null then
    return jsonb_build_object('status','REJECTED','record',null,'errorCode','INVALID_MUTATION');
  end if;

  if current_record.record_id is null then
    select member.household_id, member.role into target_scope_id, member_role
    from public.household_memberships as member
    where member.user_id = current_user_id and member.status = 'active'
    limit 1;
    if target_scope_id is null then
      target_scope_kind := 'USER';
      target_scope_id := current_user_id;
    elsif member_role in ('owner','member') then
      target_scope_kind := 'HOUSEHOLD';
    else
      return jsonb_build_object('status','REJECTED','record',null,'errorCode','FORBIDDEN');
    end if;
    target_owner_id := current_user_id;
  else
    target_scope_kind := current_record.scope_kind;
    target_scope_id := current_record.scope_id;
    target_owner_id := current_record.owner_id;
  end if;

  if operation = 'DELETE' then
    if current_record.payload ->> 'origin' = 'SYSTEM_GENERATED' then
      return jsonb_build_object('status','REJECTED','record',null,'errorCode','FORBIDDEN');
    end if;
    delete from public.reminders where id = current_record.source_id;
  else
    if current_record.record_id is not null
      and current_record.payload ->> 'origin' = 'SYSTEM_GENERATED' then
      if not public.is_valid_system_reminder_completion(current_record.payload, payload) then
        return jsonb_build_object('status','REJECTED','record',null,'errorCode','FORBIDDEN');
      end if;
      update public.reminders
      set reminder_group = payload ->> 'group', time_label = payload ->> 'timeLabel'
      where id = current_record.source_id;
      select * into result_record from public.sync_records
      where record_id = target_record_id and entity_type = 'reminder';
      return jsonb_build_object('status','APPLIED',
        'record',public.sync_record_json(result_record),'errorCode',null);
    end if;
    if not public.is_valid_reminder_sync_payload(payload) then
      return jsonb_build_object('status','REJECTED','record',null,'errorCode','INVALID_MUTATION');
    end if;
    document_id := nullif(payload ->> 'documentId', '');
    if document_id is not null and not (
      exists (select 1 from public.documents
        where documents.id::text = document_id and documents.user_id = current_user_id)
      or (current_record.record_id is not null
        and document_id = current_record.payload ->> 'documentId'
        and exists (select 1 from public.documents
          where documents.id::text = document_id
            and documents.user_id = current_record.owner_id))
    ) then
      return jsonb_build_object('status','REJECTED','record',null,'errorCode','FORBIDDEN');
    end if;

    source_id := coalesce(current_record.source_id, target_record_id::text);
    if current_record.record_id is null
      and exists (select 1 from public.reminders where reminders.id = source_id) then
      return jsonb_build_object('status','REJECTED','record',null,'errorCode','FORBIDDEN');
    end if;
    insert into public.reminders(
      id,user_id,scope_kind,scope_id,title,note,room_id,room_name,reminder_group,
      time_label,priority,repeat,document_id,document_title,assigned_to,due_at,
      origin,reminder_type,time_zone
    ) values (
      source_id,target_owner_id,target_scope_kind,target_scope_id,trim(payload ->> 'title'),
      payload ->> 'note',payload ->> 'roomId',payload ->> 'roomName',payload ->> 'group',
      payload ->> 'timeLabel',payload ->> 'priority',payload ->> 'repeat',document_id::uuid,
      payload ->> 'documentTitle',payload ->> 'assignedTo',
      case when payload ? 'dueAt' then (payload ->> 'dueAt')::timestamptz else null end,
      'USER_CREATED','custom',coalesce(payload ->> 'timeZone','Europe/London')
    ) on conflict (id) do update set
      title=excluded.title,note=excluded.note,room_id=excluded.room_id,
      room_name=excluded.room_name,reminder_group=excluded.reminder_group,
      time_label=excluded.time_label,priority=excluded.priority,repeat=excluded.repeat,
      document_id=excluded.document_id,document_title=excluded.document_title,
      assigned_to=excluded.assigned_to,due_at=excluded.due_at,time_zone=excluded.time_zone
    where public.reminders.scope_kind = target_scope_kind
      and public.reminders.scope_id = target_scope_id;
  end if;

  select * into result_record from public.sync_records
  where record_id = target_record_id and entity_type = 'reminder';
  if result_record.record_id is null then
    return jsonb_build_object('status','REJECTED','record',null,'errorCode','RETRY_LATER');
  end if;
  return jsonb_build_object('status','APPLIED',
    'record',public.sync_record_json(result_record),'errorCode',null);
end;
$$;

revoke all on function public.apply_reminder_sync_mutation(uuid,jsonb)
from public, anon, authenticated, service_role;
