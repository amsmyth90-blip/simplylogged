-- Preserve legacy-only documents while removing normalised duplicates from app_state.
create or replace function public.compact_normalized_document_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  retained jsonb;
begin
  if new.id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or jsonb_typeof(new.payload -> 'vaultDocuments') is distinct from 'array' then
    return new;
  end if;

  select coalesce(jsonb_agg(entry.value order by entry.ordinality), '[]'::jsonb)
  into retained
  from jsonb_array_elements(new.payload -> 'vaultDocuments')
    with ordinality as entry(value, ordinality)
  where jsonb_typeof(entry.value) is distinct from 'object'
    or jsonb_typeof(entry.value -> 'id') is distinct from 'string'
    or not exists (
      select 1 from public.documents as document
      where document.id = entry.value ->> 'id'
        and document.user_id = new.id::uuid
    );

  new.payload := jsonb_set(new.payload, '{vaultDocuments}', retained, false);
  return new;
end;
$$;

revoke all on function public.compact_normalized_document_state()
from public, anon, authenticated;

drop trigger if exists app_state_compact_normalized_documents on public.app_state;
create trigger app_state_compact_normalized_documents
before insert or update of payload on public.app_state
for each row execute function public.compact_normalized_document_state();

-- Copy only complete, bounded legacy entries. Invalid or colliding entries remain
-- in app_state and are therefore never discarded by the trigger above.
insert into public.documents (
  id, user_id, title, category, kind, size_label, room_id, room_name,
  issuer, due_date, storage_bucket, storage_path, original_file_name, mime_type,
  extraction_summary, extracted_text, action_items, confidence,
  review_status, review_reasons, reviewed_at, emergency_visible, shared_with
)
select
  entry.value ->> 'id', state.id::uuid, trim(entry.value ->> 'title'),
  trim(entry.value ->> 'category'), entry.value ->> 'kind',
  entry.value ->> 'size', nullif(entry.value ->> 'roomId', ''),
  nullif(entry.value ->> 'roomName', ''), nullif(entry.value ->> 'issuer', ''),
  nullif(entry.value ->> 'dueDate', ''),
  case when entry.value ->> 'storageBucket' = 'diarydock-documents'
    then entry.value ->> 'storageBucket' else null end,
  case when entry.value ->> 'storageBucket' = 'diarydock-documents'
    then entry.value ->> 'storagePath' else null end,
  nullif(entry.value ->> 'originalFileName', ''),
  nullif(entry.value ->> 'mimeType', ''),
  nullif(entry.value ->> 'extractionSummary', ''),
  nullif(entry.value ->> 'extractedText', ''),
  coalesce(entry.value -> 'actionItems', '[]'::jsonb),
  case when jsonb_typeof(entry.value -> 'confidence') = 'number'
    then (entry.value ->> 'confidence')::numeric else null end,
  coalesce(entry.value ->> 'reviewStatus', 'reviewed'),
  coalesce(entry.value -> 'reviewReasons', '[]'::jsonb),
  nullif(entry.value ->> 'reviewedAt', ''),
  coalesce((entry.value ->> 'emergencyVisible')::boolean, false),
  coalesce(entry.value -> 'sharedWith', '[]'::jsonb)
from public.app_state as state
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(state.payload -> 'vaultDocuments') = 'array'
    then state.payload -> 'vaultDocuments' else '[]'::jsonb end
) as entry(value)
where state.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (select 1 from auth.users where id = state.id::uuid)
  and jsonb_typeof(entry.value) = 'object'
  and jsonb_typeof(entry.value -> 'id') = 'string'
  and length(entry.value ->> 'id') between 1 and 128
  and jsonb_typeof(entry.value -> 'title') = 'string'
  and length(trim(entry.value ->> 'title')) between 1 and 240
  and jsonb_typeof(entry.value -> 'category') = 'string'
  and length(trim(entry.value ->> 'category')) between 1 and 160
  and entry.value ->> 'kind' in ('PDF', 'Scan', 'Note', 'Image')
  and jsonb_typeof(entry.value -> 'size') = 'string'
  and length(entry.value ->> 'size') between 1 and 80
  and length(coalesce(entry.value ->> 'roomId', '')) <= 128
  and length(coalesce(entry.value ->> 'roomName', '')) <= 160
  and length(coalesce(entry.value ->> 'issuer', '')) <= 240
  and length(coalesce(entry.value ->> 'dueDate', '')) <= 32
  and length(coalesce(entry.value ->> 'originalFileName', '')) <= 255
  and length(coalesce(entry.value ->> 'mimeType', '')) <= 120
  and length(coalesce(entry.value ->> 'extractionSummary', '')) <= 4000
  and length(coalesce(entry.value ->> 'extractedText', '')) <= 64000
  and length(coalesce(entry.value ->> 'reviewedAt', '')) <= 64
  and coalesce(entry.value ->> 'reviewStatus', 'reviewed') in ('needs-review', 'reviewed')
  and jsonb_typeof(coalesce(entry.value -> 'actionItems', '[]'::jsonb)) = 'array'
  and jsonb_array_length(coalesce(entry.value -> 'actionItems', '[]'::jsonb)) <= 25
  and not exists (
    select 1 from jsonb_array_elements(coalesce(entry.value -> 'actionItems', '[]'::jsonb)) as item
    where jsonb_typeof(item) <> 'string' or length(item #>> '{}') > 500
  )
  and jsonb_typeof(coalesce(entry.value -> 'reviewReasons', '[]'::jsonb)) = 'array'
  and jsonb_array_length(coalesce(entry.value -> 'reviewReasons', '[]'::jsonb)) <= 25
  and not exists (
    select 1 from jsonb_array_elements(coalesce(entry.value -> 'reviewReasons', '[]'::jsonb)) as item
    where jsonb_typeof(item) <> 'string' or length(item #>> '{}') > 500
  )
  and jsonb_typeof(coalesce(entry.value -> 'sharedWith', '[]'::jsonb)) = 'array'
  and jsonb_array_length(coalesce(entry.value -> 'sharedWith', '[]'::jsonb)) <= 25
  and (not (entry.value ? 'confidence') or (
    jsonb_typeof(entry.value -> 'confidence') = 'number'
    and (entry.value ->> 'confidence')::numeric between 0 and 1
  ))
  and (not (entry.value ? 'emergencyVisible')
    or jsonb_typeof(entry.value -> 'emergencyVisible') = 'boolean')
  and (
    not (entry.value ? 'storageBucket') and not (entry.value ? 'storagePath')
    or entry.value ->> 'storageBucket' = 'diarydock-documents'
      and entry.value ->> 'storagePath' like state.id || '/' || (entry.value ->> 'id') || '/%'
      and array_length(string_to_array(entry.value ->> 'storagePath', '/'), 1) = 3
  )
  and not exists (
    select 1 from public.documents as existing
    where existing.id = entry.value ->> 'id'
  )
on conflict (id) do nothing;
