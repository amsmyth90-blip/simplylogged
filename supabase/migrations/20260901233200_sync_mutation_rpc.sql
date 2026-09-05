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
begin
  if mutation ->> 'entityType' <> 'reminder' or schema_version <> 1 then
    return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'UNSUPPORTED_SCHEMA');
  end if;
  if operation not in ('UPSERT', 'DELETE') then
    return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'INVALID_MUTATION');
  end if;

  select * into current_record
  from public.sync_records
  where sync_records.record_id = target_record_id
    and owner_id = current_user_id
    and entity_type = 'reminder'
  for update;

  if current_record.record_id is null and exists (
    select 1 from public.sync_records
    where sync_records.record_id = target_record_id
  ) then
    return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'FORBIDDEN');
  end if;

  if current_record.record_id is not null
    and (expected_revision is null or expected_revision <> current_record.revision::text) then
    return jsonb_build_object(
      'status', 'CONFLICT',
      'record', public.sync_record_json(current_record),
      'errorCode', null
    );
  end if;
  if current_record.record_id is null and expected_revision is not null then
    return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'INVALID_MUTATION');
  end if;
  if operation = 'DELETE' and current_record.record_id is null then
    return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'INVALID_MUTATION');
  end if;

  if operation = 'DELETE' then
    if current_record.payload ->> 'origin' = 'SYSTEM_GENERATED' then
      return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'FORBIDDEN');
    end if;
    delete from public.reminders
    where id = current_record.source_id and user_id = current_user_id;
  else
    if current_record.record_id is not null
      and current_record.payload ->> 'origin' = 'SYSTEM_GENERATED' then
      if not public.is_valid_system_reminder_completion(current_record.payload, payload) then
        return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'FORBIDDEN');
      end if;
      update public.reminders
      set reminder_group = payload ->> 'group',
          time_label = payload ->> 'timeLabel'
      where id = current_record.source_id and user_id = current_user_id;
      select * into result_record
      from public.sync_records
      where sync_records.record_id = target_record_id
        and owner_id = current_user_id
        and entity_type = 'reminder';
      return jsonb_build_object(
        'status', 'APPLIED',
        'record', public.sync_record_json(result_record),
        'errorCode', null
      );
    end if;
    if not public.is_valid_reminder_sync_payload(payload) then
      return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'INVALID_MUTATION');
    end if;
    document_id := nullif(payload ->> 'documentId', '');
    if document_id is not null and not exists (
      select 1 from public.documents
      where documents.id::text = document_id and documents.user_id = current_user_id
    ) then
      return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'FORBIDDEN');
    end if;

    source_id := coalesce(current_record.source_id, target_record_id::text);
    if current_record.record_id is null and exists (
      select 1 from public.reminders
      where reminders.id = source_id and reminders.user_id <> current_user_id
    ) then
      return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'FORBIDDEN');
    end if;

    insert into public.reminders (
      id, user_id, title, note, room_id, room_name, reminder_group,
      time_label, priority, repeat, document_id, document_title, assigned_to, due_at,
      origin, reminder_type, time_zone
    ) values (
      source_id,
      current_user_id,
      trim(payload ->> 'title'),
      payload ->> 'note',
      payload ->> 'roomId',
      payload ->> 'roomName',
      payload ->> 'group',
      payload ->> 'timeLabel',
      payload ->> 'priority',
      payload ->> 'repeat',
      document_id::uuid,
      payload ->> 'documentTitle',
      payload ->> 'assignedTo',
      case when payload ? 'dueAt' then (payload ->> 'dueAt')::timestamptz else null end,
      'USER_CREATED',
      'custom',
      coalesce(payload ->> 'timeZone', 'Europe/London')
    ) on conflict (id) do update set
      title = excluded.title,
      note = excluded.note,
      room_id = excluded.room_id,
      room_name = excluded.room_name,
      reminder_group = excluded.reminder_group,
      time_label = excluded.time_label,
      priority = excluded.priority,
      repeat = excluded.repeat,
      document_id = excluded.document_id,
      document_title = excluded.document_title,
      assigned_to = excluded.assigned_to,
      due_at = excluded.due_at,
      time_zone = excluded.time_zone
    where public.reminders.user_id = current_user_id;
  end if;

  select * into result_record
  from public.sync_records
  where sync_records.record_id = target_record_id
    and owner_id = current_user_id
    and entity_type = 'reminder';
  if result_record.record_id is null then
    return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'RETRY_LATER');
  end if;
  return jsonb_build_object(
    'status', 'APPLIED',
    'record', public.sync_record_json(result_record),
    'errorCode', null
  );
end;
$$;

revoke all on function public.apply_reminder_sync_mutation(uuid, jsonb) from public, anon, authenticated;

create or replace function public.apply_sync_mutations(request_body jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  mutation jsonb;
  result jsonb;
  stored public.sync_idempotency;
  inserted_count integer;
  results jsonb := '[]'::jsonb;
  target_idempotency_key uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not public.is_valid_sync_push_request(request_body) then
    raise exception 'Invalid sync request';
  end if;

  for mutation in select value from jsonb_array_elements(request_body -> 'mutations') loop
    target_idempotency_key := (mutation ->> 'idempotencyKey')::uuid;
    insert into public.sync_idempotency (
      owner_id, idempotency_key, request_payload
    ) values (
      current_user_id, target_idempotency_key, mutation
    ) on conflict do nothing;
    get diagnostics inserted_count = row_count;

    if inserted_count = 0 then
      select * into stored
      from public.sync_idempotency
      where owner_id = current_user_id
        and sync_idempotency.idempotency_key = target_idempotency_key
      for update;
      if stored.request_payload <> mutation or stored.response_payload is null then
        result := jsonb_build_object(
          'status', 'REJECTED', 'record', null, 'errorCode', 'INVALID_MUTATION'
        );
      else
        result := stored.response_payload;
      end if;
    else
      result := public.apply_reminder_sync_mutation(current_user_id, mutation);
      update public.sync_idempotency
      set response_payload = result
      where owner_id = current_user_id
        and sync_idempotency.idempotency_key = target_idempotency_key;
    end if;

    results := results || jsonb_build_array(
      result || jsonb_build_object('idempotencyKey', target_idempotency_key::text)
    );
  end loop;

  return jsonb_build_object(
    'apiVersion', '2026-09-01',
    'batchId', request_body ->> 'batchId',
    'results', results
  );
end;
$$;

revoke all on function public.apply_sync_mutations(jsonb) from public, anon;
grant execute on function public.apply_sync_mutations(jsonb) to authenticated;

create or replace function public.cleanup_sync_idempotency()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare deleted_count bigint;
begin
  delete from public.sync_idempotency where expires_at < timezone('utc', now());
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_sync_idempotency() from public, anon, authenticated;
grant execute on function public.cleanup_sync_idempotency() to service_role;
