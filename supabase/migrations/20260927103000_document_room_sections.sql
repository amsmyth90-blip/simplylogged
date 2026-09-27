begin;

alter table public.documents add column if not exists section_id text;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.documents'::regclass and conname = 'documents_section_id_check'
  ) then
    alter table public.documents add constraint documents_section_id_check
      check (section_id is null or section_id ~ '^[a-z0-9-]{1,64}$');
  end if;
end;
$$;
create index if not exists documents_user_section_idx on public.documents (user_id, room_id, section_id);

create or replace function public.document_sync_payload(document public.documents)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'documentId', document.id,
    'title', left(document.title, 240),
    'category', left(document.category, 160),
    'kind', case when document.kind in ('PDF', 'Scan', 'Note', 'Image')
      then document.kind else 'Scan' end,
    'size', left(document.size_label, 80),
    'roomId', left(document.room_id, 128),
    'roomName', left(document.room_name, 160),
    'sectionId', left(document.section_id, 64),
    'issuer', left(document.issuer, 240),
    'dueDate', left(document.due_date, 32),
    'reviewStatus', case when document.review_status = 'needs-review'
      then 'needs-review' else 'reviewed' end,
    'emergencyVisible', document.emergency_visible,
    'hasStoredFile', document.storage_bucket is not null and document.storage_path is not null,
    'fileVersion', case when document.storage_bucket is not null and document.storage_path is not null
      then md5(document.storage_bucket || ':' || document.storage_path) else null end
  ));
$$;

revoke all on function public.document_sync_payload(public.documents)
from public, anon, authenticated;

create or replace function public.sync_optional_date(payload jsonb, field_name text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare parsed date;
begin
  if not (payload ? field_name) then return true; end if;
  if jsonb_typeof(payload -> field_name) <> 'string'
    or payload ->> field_name !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  parsed := (payload ->> field_name)::date;
  return to_char(parsed, 'YYYY-MM-DD') = payload ->> field_name;
exception when invalid_datetime_format or datetime_field_overflow then
  return false;
end;
$$;

create or replace function public.is_valid_document_sync_payload(payload jsonb)
returns boolean
language sql
stable
set search_path = public
as $$
  select jsonb_typeof(payload) = 'object'
    and octet_length(payload::text) <= 8000
    and payload ?& array[
      'documentId', 'title', 'category', 'kind', 'size', 'reviewStatus',
      'emergencyVisible', 'hasStoredFile'
    ]
    and not exists (
      select 1 from jsonb_object_keys(payload) as key
      where key <> all (array[
        'documentId', 'title', 'category', 'kind', 'size', 'roomId',
        'roomName', 'sectionId', 'issuer', 'dueDate', 'reviewStatus',
        'emergencyVisible', 'hasStoredFile', 'fileVersion'
      ])
    )
    and public.sync_required_text(payload, 'documentId', 512)
    and public.sync_required_text(payload, 'title', 240)
    and public.sync_required_text(payload, 'category', 160)
    and public.sync_required_text(payload, 'kind', 16)
    and payload ->> 'kind' in ('PDF', 'Scan', 'Note', 'Image')
    and public.sync_required_text(payload, 'size', 80)
    and public.sync_optional_text(payload, 'roomId', 128)
    and public.sync_optional_text(payload, 'roomName', 160)
    and public.sync_optional_text(payload, 'sectionId', 64)
    and (not (payload ? 'sectionId') or payload ->> 'sectionId' ~ '^[a-z0-9-]{1,64}$')
    and public.sync_optional_text(payload, 'issuer', 240)
    and public.sync_optional_date(payload, 'dueDate')
    and public.sync_required_text(payload, 'reviewStatus', 24)
    and payload ->> 'reviewStatus' in ('needs-review', 'reviewed')
    and jsonb_typeof(payload -> 'emergencyVisible') = 'boolean'
    and jsonb_typeof(payload -> 'hasStoredFile') = 'boolean'
    and public.sync_optional_text(payload, 'fileVersion', 64)
    and (not (payload ? 'fileVersion') or payload ->> 'fileVersion' ~ '^[0-9a-f]{32}$');
$$;

create or replace function public.apply_document_sync_mutation(
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
  expected_revision text := mutation ->> 'expectedRevision';
  payload jsonb := mutation -> 'payload';
begin
  if mutation ->> 'entityType' <> 'document'
    or (mutation ->> 'schemaVersion')::integer <> 1 then
    return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'UNSUPPORTED_SCHEMA');
  end if;
  if mutation ->> 'operation' <> 'UPSERT'
    or not public.is_valid_document_sync_payload(payload) then
    return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'INVALID_MUTATION');
  end if;

  select * into current_record from public.sync_records
  where record_id = target_record_id
    and owner_id = current_user_id
    and entity_type = 'document'
  for update;

  if current_record.record_id is null then
    if exists (select 1 from public.sync_records where record_id = target_record_id) then
      return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'FORBIDDEN');
    end if;
    return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'INVALID_MUTATION');
  end if;
  if expected_revision is null or expected_revision <> current_record.revision::text then
    return jsonb_build_object(
      'status', 'CONFLICT', 'record', public.sync_record_json(current_record), 'errorCode', null
    );
  end if;
  if payload ->> 'documentId' <> current_record.source_id
    or payload -> 'kind' <> current_record.payload -> 'kind'
    or payload -> 'size' <> current_record.payload -> 'size'
    or payload -> 'hasStoredFile' <> current_record.payload -> 'hasStoredFile'
    or (current_record.payload ? 'fileVersion'
      and payload -> 'fileVersion' is distinct from current_record.payload -> 'fileVersion') then
    return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'FORBIDDEN');
  end if;

  update public.documents set
    title = trim(payload ->> 'title'),
    category = trim(payload ->> 'category'),
    room_id = nullif(payload ->> 'roomId', ''),
    room_name = nullif(payload ->> 'roomName', ''),
    section_id = nullif(payload ->> 'sectionId', ''),
    issuer = nullif(payload ->> 'issuer', ''),
    due_date = nullif(payload ->> 'dueDate', ''),
    review_status = payload ->> 'reviewStatus',
    reviewed_at = case when payload ->> 'reviewStatus' = 'reviewed'
      then timezone('utc', now())::text else null end,
    emergency_visible = (payload ->> 'emergencyVisible')::boolean
  where id::text = current_record.source_id and user_id = current_user_id;

  select * into result_record from public.sync_records
  where record_id = target_record_id
    and owner_id = current_user_id
    and entity_type = 'document';
  if result_record.record_id is null or result_record.revision = current_record.revision then
    return jsonb_build_object('status', 'REJECTED', 'record', null, 'errorCode', 'RETRY_LATER');
  end if;
  return jsonb_build_object(
    'status', 'APPLIED', 'record', public.sync_record_json(result_record), 'errorCode', null
  );
end;
$$;

revoke all on function public.sync_optional_date(jsonb, text) from public, anon, authenticated;
revoke all on function public.is_valid_document_sync_payload(jsonb) from public, anon, authenticated;
revoke all on function public.apply_document_sync_mutation(uuid, jsonb) from public, anon, authenticated;

commit;
