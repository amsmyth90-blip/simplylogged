-- Atomically link a security-checked mobile upload to its owner-visible document and optional reminder.
create or replace function public.commit_mobile_document_upload(
  input_user_id uuid,
  input_reservation_id uuid,
  input_metadata jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reservation public.document_upload_reservations;
  expected_room_id text;
  row_inserted integer;
  reminder jsonb := input_metadata -> 'reminder';
begin
  if input_user_id is null or input_reservation_id is null
    or jsonb_typeof(input_metadata) <> 'object'
    or exists (
      select 1 from jsonb_object_keys(input_metadata) as key
      where key <> all (array[
        'title', 'category', 'roomName', 'issuer', 'dueDate', 'summary',
        'extractedText', 'confidence', 'actionItems', 'reminder'
      ])
    )
    or jsonb_typeof(input_metadata -> 'title') <> 'string'
    or trim(input_metadata ->> 'title') = '' or length(input_metadata ->> 'title') > 240
    or input_metadata ->> 'category' not in (
      'Identity', 'Home & Property', 'Finance', 'Legal & Estate', 'Health & Medical', 'Memories'
    )
    or input_metadata ->> 'roomName' not in (
      'Attic', 'Office', 'Garage', 'Bedroom', 'Family Room', 'Kitchen',
      'Garden', 'Driveway', 'Safe Room', 'Mailbox'
    ) then return false;
  end if;

  if (input_metadata ? 'issuer' and (
      jsonb_typeof(input_metadata -> 'issuer') <> 'string' or length(input_metadata ->> 'issuer') > 240
    )) or (input_metadata ? 'dueDate' and (
      jsonb_typeof(input_metadata -> 'dueDate') <> 'string'
      or input_metadata ->> 'dueDate' !~ '^\d{4}-\d{2}-\d{2}$'
    )) or (input_metadata ? 'summary' and (
      jsonb_typeof(input_metadata -> 'summary') <> 'string' or length(input_metadata ->> 'summary') > 2000
    )) or (input_metadata ? 'extractedText' and (
      jsonb_typeof(input_metadata -> 'extractedText') <> 'string' or length(input_metadata ->> 'extractedText') > 20000
    )) or (input_metadata ? 'confidence' and (
      jsonb_typeof(input_metadata -> 'confidence') <> 'number'
      or (input_metadata ->> 'confidence')::numeric not between 0 and 1
    )) then return false; end if;

  if jsonb_typeof(coalesce(input_metadata -> 'actionItems', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(input_metadata -> 'actionItems', '[]'::jsonb)) > 24
    or exists (
      select 1 from jsonb_array_elements(coalesce(input_metadata -> 'actionItems', '[]'::jsonb)) as item
      where jsonb_typeof(item) <> 'string' or length(item #>> '{}') > 500
    ) then return false; end if;

  if reminder is not null and (
    jsonb_typeof(reminder) <> 'object'
    or not (reminder ?& array['id', 'title', 'timeLabel'])
    or exists (select 1 from jsonb_object_keys(reminder) as key where key <> all (array['id', 'title', 'timeLabel']))
    or (reminder ->> 'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or trim(reminder ->> 'title') = '' or length(reminder ->> 'title') > 240
    or trim(reminder ->> 'timeLabel') = '' or length(reminder ->> 'timeLabel') > 120
  ) then return false; end if;

  select * into reservation from public.document_upload_reservations
  where id = input_reservation_id and user_id = input_user_id for update;
  if reservation.id is null or reservation.cancelled_at is not null
    or reservation.expires_at <= timezone('utc', now()) then return false; end if;
  if reservation.committed_at is not null then
    return exists (
      select 1 from public.documents where id = reservation.document_id::text
        and user_id = input_user_id and storage_bucket = 'diarydock-documents'
        and storage_path = reservation.final_path
    );
  end if;

  expected_room_id := case input_metadata ->> 'roomName'
    when 'Family Room' then 'family-room' when 'Safe Room' then 'safe-room'
    else lower(input_metadata ->> 'roomName') end;
  insert into public.documents (
    id, user_id, title, category, kind, size_label, room_id, room_name,
    issuer, due_date, storage_bucket, storage_path, original_file_name, mime_type,
    extraction_summary, extracted_text, action_items, confidence,
    review_status, review_reasons, emergency_visible
  ) values (
    reservation.document_id::text, input_user_id, trim(input_metadata ->> 'title'),
    input_metadata ->> 'category', case when reservation.mime_type = 'application/pdf' then 'PDF' else 'Scan' end,
    ceil(reservation.expected_bytes / 1024.0)::bigint::text || ' KB', expected_room_id,
    input_metadata ->> 'roomName', nullif(input_metadata ->> 'issuer', ''),
    nullif(input_metadata ->> 'dueDate', ''), 'diarydock-documents', reservation.final_path,
    split_part(reservation.final_path, '/', 3), reservation.mime_type,
    nullif(input_metadata ->> 'summary', ''), nullif(input_metadata ->> 'extractedText', ''),
    coalesce(input_metadata -> 'actionItems', '[]'::jsonb),
    case when input_metadata ? 'confidence' then (input_metadata ->> 'confidence')::numeric else null end,
    'needs-review', '["Check the document details before relying on them."]'::jsonb, false
  ) on conflict (id) do nothing;
  get diagnostics row_inserted = row_count;
  if row_inserted = 0 and not exists (
    select 1 from public.documents where id = reservation.document_id::text
      and user_id = input_user_id and storage_bucket = 'diarydock-documents'
      and storage_path = reservation.final_path
  ) then return false; end if;

  if reminder is not null then
    insert into public.reminders (
      id, user_id, title, note, room_id, room_name, reminder_group,
      time_label, priority, document_id, document_title
    ) values (
      reminder ->> 'id', input_user_id, trim(reminder ->> 'title'),
      'Created from a document you confirmed.', expected_room_id, input_metadata ->> 'roomName',
      case when input_metadata ? 'dueDate' then 'upcoming' else 'later' end,
      trim(reminder ->> 'timeLabel'), case when input_metadata ? 'dueDate' then 'high' else 'normal' end,
      reservation.document_id::text, trim(input_metadata ->> 'title')
    ) on conflict (id) do nothing;
    if not exists (
      select 1 from public.reminders where id = reminder ->> 'id'
        and user_id = input_user_id and document_id = reservation.document_id::text
    ) then return false; end if;
  end if;

  update public.document_upload_reservations set committed_at = timezone('utc', now())
  where id = reservation.id and committed_at is null and cancelled_at is null;
  return found;
end;
$$;

revoke all on function public.commit_mobile_document_upload(uuid, uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.commit_mobile_document_upload(uuid, uuid, jsonb)
to service_role;
