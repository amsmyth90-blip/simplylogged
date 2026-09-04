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
    'issuer', left(document.issuer, 240),
    'dueDate', left(document.due_date, 32),
    'reviewStatus', case when document.review_status = 'needs-review'
      then 'needs-review' else 'reviewed' end,
    'emergencyVisible', document.emergency_visible,
    'hasStoredFile', document.storage_bucket is not null and document.storage_path is not null
  ));
$$;

revoke all on function public.document_sync_payload(public.documents)
from public, anon, authenticated;

create or replace function public.project_document_for_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    update public.sync_records
    set revision = revision + 1,
        payload = '{}'::jsonb,
        updated_at = timezone('utc', now()),
        deleted_at = timezone('utc', now()),
        change_sequence = nextval('public.sync_change_sequence')
    where owner_id = old.user_id
      and entity_type = 'document'
      and source_id = old.id;
    return old;
  end if;

  insert into public.sync_records (
    record_id, entity_type, owner_id, source_id, scope_kind, scope_id,
    revision, schema_version, payload, updated_at, deleted_at, change_sequence
  ) values (
    gen_random_uuid(), 'document', new.user_id, new.id, 'USER', new.user_id,
    1, 1, public.document_sync_payload(new), new.updated_at, null,
    nextval('public.sync_change_sequence')
  ) on conflict (owner_id, entity_type, source_id) do update set
    revision = public.sync_records.revision + 1,
    payload = excluded.payload,
    updated_at = excluded.updated_at,
    deleted_at = null,
    change_sequence = excluded.change_sequence;
  return new;
end;
$$;

revoke all on function public.project_document_for_sync()
from public, anon, authenticated;

drop trigger if exists documents_project_for_sync on public.documents;
create trigger documents_project_for_sync
after insert or update or delete on public.documents
for each row execute function public.project_document_for_sync();

insert into public.sync_records (
  record_id, entity_type, owner_id, source_id, scope_kind, scope_id,
  revision, schema_version, payload, updated_at, deleted_at, change_sequence
)
select
  gen_random_uuid(), 'document', document.user_id, document.id,
  'USER', document.user_id, 1, 1, public.document_sync_payload(document),
  document.updated_at, null, nextval('public.sync_change_sequence')
from public.documents as document
on conflict (owner_id, entity_type, source_id) do nothing;
