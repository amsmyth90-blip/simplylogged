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
    'hasStoredFile', document.storage_bucket is not null and document.storage_path is not null,
    'fileVersion', case when document.storage_bucket is not null and document.storage_path is not null
      then md5(document.storage_bucket || ':' || document.storage_path) else null end
  ));
$$;

revoke all on function public.document_sync_payload(public.documents)
from public, anon, authenticated;

update public.sync_records as record set
  revision = record.revision + 1,
  payload = public.document_sync_payload(document),
  updated_at = document.updated_at,
  change_sequence = nextval('public.sync_change_sequence')
from public.documents as document
where record.owner_id = document.user_id
  and record.entity_type = 'document'
  and record.source_id = document.id
  and record.deleted_at is null;
