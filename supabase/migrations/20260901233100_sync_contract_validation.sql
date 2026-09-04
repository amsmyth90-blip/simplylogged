create or replace function public.sync_required_text(
  payload jsonb,
  field_name text,
  maximum_length integer
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(payload -> field_name) = 'string'
    and length(trim(payload ->> field_name)) between 1 and maximum_length;
$$;

create or replace function public.sync_optional_text(
  payload jsonb,
  field_name text,
  maximum_length integer
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select not (payload ? field_name)
    or (jsonb_typeof(payload -> field_name) = 'string'
      and length(payload ->> field_name) <= maximum_length);
$$;

create or replace function public.sync_optional_timestamp(payload jsonb, field_name text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
begin
  if not (payload ? field_name) then return true; end if;
  if jsonb_typeof(payload -> field_name) <> 'string'
    or length(payload ->> field_name) > 32 then return false; end if;
  perform (payload ->> field_name)::timestamptz;
  return true;
exception when invalid_datetime_format or datetime_field_overflow then
  return false;
end;
$$;

create or replace function public.is_valid_reminder_sync_payload(payload jsonb)
returns boolean
language sql
stable
set search_path = public
as $$
  select jsonb_typeof(payload) = 'object'
    and octet_length(payload::text) <= 16000
    and not exists (
      select 1 from jsonb_object_keys(payload) as key
      where key <> all (array[
        'title', 'note', 'roomId', 'roomName', 'group', 'timeLabel',
        'priority', 'repeat', 'documentId', 'documentTitle', 'assignedTo', 'dueAt',
        'origin', 'reminderType', 'timeZone'
      ])
    )
    and public.sync_required_text(payload, 'title', 240)
    and public.sync_required_text(payload, 'group', 16)
    and (payload ->> 'group') in ('today', 'week', 'later', 'done')
    and public.sync_required_text(payload, 'timeLabel', 120)
    and public.sync_required_text(payload, 'priority', 16)
    and (payload ->> 'priority') in ('low', 'normal', 'medium', 'high')
    and public.sync_optional_text(payload, 'note', 1000)
    and public.sync_optional_text(payload, 'roomId', 128)
    and public.sync_optional_text(payload, 'roomName', 160)
    and public.sync_optional_text(payload, 'repeat', 120)
    and public.sync_optional_text(payload, 'documentId', 128)
    and public.sync_optional_text(payload, 'documentTitle', 240)
    and public.sync_optional_text(payload, 'assignedTo', 160)
    and public.sync_optional_timestamp(payload, 'dueAt')
    and public.sync_optional_text(payload, 'origin', 32)
    and coalesce(payload ->> 'origin', 'USER_CREATED') = 'USER_CREATED'
    and public.sync_optional_text(payload, 'reminderType', 64)
    and coalesce(payload ->> 'reminderType', 'custom') = 'custom'
    and public.sync_optional_text(payload, 'timeZone', 64)
    and coalesce(payload ->> 'timeZone', 'Europe/London')
      ~ '^[A-Za-z_+.-]+(/[A-Za-z0-9_+.-]+)*$';
$$;

create or replace function public.is_valid_system_reminder_completion(
  current_payload jsonb,
  proposed_payload jsonb
)
returns boolean
language sql
stable
set search_path = public
as $$
  select jsonb_typeof(current_payload) = 'object'
    and jsonb_typeof(proposed_payload) = 'object'
    and current_payload ->> 'origin' = 'SYSTEM_GENERATED'
    and proposed_payload ->> 'origin' = 'SYSTEM_GENERATED'
    and octet_length(proposed_payload::text) <= 16000
    and (proposed_payload - 'group' - 'timeLabel')
      = (current_payload - 'group' - 'timeLabel')
    and proposed_payload ->> 'group' in ('today', 'done')
    and (
      (proposed_payload ->> 'group' = 'done' and proposed_payload ->> 'timeLabel' = 'Completed')
      or (proposed_payload ->> 'group' = 'today' and proposed_payload ->> 'timeLabel' = 'Today')
    );
$$;

create or replace function public.is_valid_sync_mutation_envelope(mutation jsonb)
returns boolean
language sql
stable
set search_path = public
as $$
  select case when jsonb_typeof(mutation) is distinct from 'object' then false else
    mutation ?& array[
      'idempotencyKey', 'recordId', 'entityType', 'operation',
      'expectedRevision', 'schemaVersion', 'payload'
    ]
    and not exists (
      select 1 from jsonb_object_keys(mutation) as key
      where key <> all (array[
        'idempotencyKey', 'recordId', 'entityType', 'operation',
        'expectedRevision', 'schemaVersion', 'payload'
      ])
    )
    and jsonb_typeof(mutation -> 'idempotencyKey') = 'string'
    and mutation ->> 'idempotencyKey'
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and jsonb_typeof(mutation -> 'recordId') = 'string'
    and mutation ->> 'recordId'
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and jsonb_typeof(mutation -> 'entityType') = 'string'
    and mutation ->> 'entityType' ~ '^[a-z][a-z0-9-]{0,63}$'
    and jsonb_typeof(mutation -> 'operation') = 'string'
    and mutation ->> 'operation' in ('UPSERT', 'DELETE')
    and (
      jsonb_typeof(mutation -> 'expectedRevision') = 'null'
      or (
        jsonb_typeof(mutation -> 'expectedRevision') = 'string'
        and mutation ->> 'expectedRevision' ~ '^(0|[1-9][0-9]{0,19})$'
      )
    )
    and case
      when jsonb_typeof(mutation -> 'schemaVersion') = 'number'
        and mutation ->> 'schemaVersion' ~ '^([1-9][0-9]{0,3}|10000)$'
      then (mutation ->> 'schemaVersion')::integer between 1 and 10000
      else false
    end
    and jsonb_typeof(mutation -> 'payload') = 'object'
    and octet_length((mutation -> 'payload')::text) <= 16000
    and (
      mutation ->> 'operation' <> 'DELETE'
      or mutation -> 'payload' = '{}'::jsonb
    )
  end;
$$;

create or replace function public.is_valid_sync_push_request(request_body jsonb)
returns boolean
language sql
stable
set search_path = public
as $$
  select case when jsonb_typeof(request_body) is distinct from 'object' then false else
    octet_length(request_body::text) <= 524288
    and request_body ?& array['apiVersion', 'deviceId', 'batchId', 'mutations']
    and not exists (
      select 1 from jsonb_object_keys(request_body) as key
      where key <> all (array['apiVersion', 'deviceId', 'batchId', 'mutations'])
    )
    and request_body ->> 'apiVersion' = '2026-09-01'
    and jsonb_typeof(request_body -> 'deviceId') = 'string'
    and request_body ->> 'deviceId'
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and jsonb_typeof(request_body -> 'batchId') = 'string'
    and request_body ->> 'batchId'
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and case when jsonb_typeof(request_body -> 'mutations') = 'array' then
      jsonb_array_length(request_body -> 'mutations') between 1 and 100
      and not exists (
        select 1 from jsonb_array_elements(request_body -> 'mutations') as item
        where not public.is_valid_sync_mutation_envelope(item)
      )
      and (
        select count(*) = count(distinct item ->> 'idempotencyKey')
        from jsonb_array_elements(request_body -> 'mutations') as item
      )
    else false end
  end;
$$;

create or replace function public.sync_record_json(record public.sync_records)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', record.record_id::text,
    'entityType', record.entity_type,
    'scope', jsonb_build_object('kind', record.scope_kind, 'id', record.scope_id::text),
    'revision', record.revision::text,
    'schemaVersion', record.schema_version,
    'updatedAt', to_char(
      record.updated_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
    ),
    'deletedAt', case when record.deleted_at is null then null else to_char(
      record.deleted_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
    ) end,
    'payload', record.payload
  );
$$;

revoke all on function public.sync_required_text(jsonb, text, integer) from public, anon, authenticated;
revoke all on function public.sync_optional_text(jsonb, text, integer) from public, anon, authenticated;
revoke all on function public.sync_optional_timestamp(jsonb, text) from public, anon, authenticated;
revoke all on function public.is_valid_reminder_sync_payload(jsonb) from public, anon, authenticated;
revoke all on function public.is_valid_system_reminder_completion(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.is_valid_sync_mutation_envelope(jsonb) from public, anon, authenticated;
revoke all on function public.is_valid_sync_push_request(jsonb) from public, anon, authenticated;
revoke all on function public.sync_record_json(public.sync_records) from public, anon, authenticated;
