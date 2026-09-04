-- Normalise the owner-scoped review queue and keep mobile actions atomic.
alter table public.life_inbox_items
  add column if not exists source_ref text,
  add column if not exists suggested_category text,
  add column if not exists suggested_payload jsonb not null default '{}'::jsonb,
  add column if not exists review_notes jsonb not null default '[]'::jsonb,
  add column if not exists item_kind text not null default 'Letter',
  add column if not exists route_status text not null default 'new';

update public.life_inbox_items
set route_status = case
  when status = 'stored' then 'vault'
  when status = 'classified' then 'room'
  when status = 'confirmed' then 'vault'
  when status = 'failed' then 'ignored'
  else 'new'
end
where route_status = 'new';

alter table public.life_inbox_items
  drop constraint if exists life_inbox_items_item_kind_check,
  add constraint life_inbox_items_item_kind_check
    check (item_kind in ('Letter', 'Form', 'Bill', 'Statement')),
  drop constraint if exists life_inbox_items_route_status_check,
  add constraint life_inbox_items_route_status_check
    check (route_status in ('new', 'vault', 'reminder', 'room', 'ignored')),
  drop constraint if exists life_inbox_items_suggested_payload_check,
  add constraint life_inbox_items_suggested_payload_check
    check (jsonb_typeof(suggested_payload) = 'object'),
  drop constraint if exists life_inbox_items_review_notes_check,
  add constraint life_inbox_items_review_notes_check
    check (jsonb_typeof(review_notes) = 'array');

drop trigger if exists life_inbox_items_touch_updated_at on public.life_inbox_items;
create trigger life_inbox_items_touch_updated_at before update on public.life_inbox_items
for each row execute function public.touch_updated_at();

create index if not exists life_inbox_items_user_route_updated_idx
on public.life_inbox_items(user_id, route_status, updated_at desc);

-- Preserve eligible legacy queue entries without changing the old web payload.
insert into public.life_inbox_items (
  user_id, source_type, status, title, source_label, suggested_room,
  item_kind, route_status, fingerprint
)
select
  state.id::uuid,
  'legacy',
  case when item.value ->> 'routeStatus' = 'new' then 'needs_review' else 'confirmed' end,
  left(coalesce(nullif(item.value ->> 'title', ''), 'Incoming item'), 240),
  left(coalesce(item.value ->> 'source', ''), 240),
  left(coalesce(nullif(item.value ->> 'suggestedRoom', ''), 'Office'), 80),
  case when item.value ->> 'kind' in ('Letter', 'Form', 'Bill', 'Statement')
    then item.value ->> 'kind' else 'Letter' end,
  case when item.value ->> 'routeStatus' in ('new', 'vault', 'reminder', 'room', 'ignored')
    then item.value ->> 'routeStatus' else 'new' end,
  'legacy:' || state.id || ':' || coalesce(nullif(item.value ->> 'id', ''), item.ordinality::text)
from public.app_state as state
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(state.payload -> 'mailboxItems') = 'array'
    then state.payload -> 'mailboxItems' else '[]'::jsonb end
) with ordinality as item(value, ordinality)
where state.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (select 1 from auth.users where id = state.id::uuid)
on conflict (user_id, fingerprint) do nothing;

-- Bring existing and future scans explicitly captured into Mailbox into the queue.
insert into public.life_inbox_items (
  user_id, source_type, status, title, source_label, document_id,
  storage_bucket, storage_path, suggested_room, item_kind, route_status, fingerprint
)
select document.user_id, 'capture', 'needs_review', left(document.title, 240),
  left(coalesce(document.issuer, ''), 240), document.id,
  document.storage_bucket, document.storage_path, 'Office',
  case when lower(document.category) like '%bill%' then 'Bill'
    when lower(document.title) like '%statement%' then 'Statement'
    when lower(document.title) like '%form%' then 'Form' else 'Letter' end,
  'new', 'document:' || document.id
from public.documents as document
where lower(coalesce(document.room_name, '')) = 'mailbox'
on conflict (user_id, fingerprint) do nothing;

create or replace function public.queue_mailbox_document()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if lower(coalesce(new.room_name, '')) <> 'mailbox' then return new; end if;
  insert into public.life_inbox_items (
    user_id, source_type, status, title, source_label, document_id,
    storage_bucket, storage_path, suggested_room, item_kind, route_status, fingerprint
  ) values (
    new.user_id, 'capture', 'needs_review', left(new.title, 240),
    left(coalesce(new.issuer, ''), 240), new.id, new.storage_bucket, new.storage_path,
    'Office', case when lower(new.category) like '%bill%' then 'Bill'
      when lower(new.title) like '%statement%' then 'Statement'
      when lower(new.title) like '%form%' then 'Form' else 'Letter' end,
    'new', 'document:' || new.id
  ) on conflict (user_id, fingerprint) do nothing;
  return new;
end;
$$;

drop trigger if exists documents_queue_mailbox on public.documents;
create trigger documents_queue_mailbox after insert on public.documents
for each row execute function public.queue_mailbox_document();

revoke all on function public.queue_mailbox_document()
from public, anon, authenticated;

create or replace function public.apply_mobile_mailbox_action(
  input_user_id uuid,
  input_item_id uuid,
  input_expected_revision timestamptz,
  input_action text
)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  item public.life_inbox_items%rowtype;
  target_room_id text;
  target_room_name text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  if input_user_id is null or input_item_id is null or input_expected_revision is null
    or input_action not in ('SAVE_TO_FILES', 'MAKE_REMINDER', 'SEND_TO_ROOM', 'IGNORE') then
    return 'INVALID';
  end if;

  select * into item from public.life_inbox_items
  where id = input_item_id and user_id = input_user_id
  for update;
  if item.id is null then return 'NOT_FOUND'; end if;
  if item.updated_at is distinct from input_expected_revision or item.route_status <> 'new' then
    return 'CONFLICT';
  end if;
  if input_action in ('SAVE_TO_FILES', 'SEND_TO_ROOM') and item.document_id is null then
    return 'INVALID_REFERENCE';
  end if;
  if input_action in ('SAVE_TO_FILES', 'SEND_TO_ROOM') and not exists (
    select 1 from public.documents
    where id = item.document_id and user_id = input_user_id
  ) then return 'INVALID_REFERENCE'; end if;

  target_room_name := case lower(coalesce(item.suggested_room, ''))
    when 'attic' then 'Attic' when 'bedroom' then 'Bedroom'
    when 'driveway' then 'Driveway' when 'family room' then 'Family Room'
    when 'garage' then 'Garage' when 'garden' then 'Garden'
    when 'kitchen' then 'Kitchen' when 'mailbox' then 'Mailbox'
    when 'safe room' then 'Safe Room' else 'Office' end;
  target_room_id := lower(replace(target_room_name, ' ', '-'));

  if input_action = 'SEND_TO_ROOM' then
    update public.documents set room_id = target_room_id, room_name = target_room_name
    where id = item.document_id and user_id = input_user_id;
    if not found then return 'INVALID_REFERENCE'; end if;
  elsif input_action = 'MAKE_REMINDER' then
    insert into public.reminders (
      id, user_id, title, note, room_id, room_name, reminder_group,
      time_label, priority, origin, reminder_type, source_resource_type,
      source_resource_id, source_date_key, time_zone
    ) values (
      gen_random_uuid(), input_user_id, left('Review ' || item.title, 240),
      left(coalesce(item.source_label, 'Incoming item') ||
        ' arrived in the Mailbox and needs a decision.', 1000),
      target_room_id, target_room_name, 'today', 'Today',
      case when item.item_kind = 'Bill' then 'high' else 'normal' end,
      'USER_CREATED', 'custom', 'MAILBOX', item.id::text, 'review', 'Europe/London'
    );
  end if;

  update public.life_inbox_items set
    status = 'confirmed',
    route_status = case input_action when 'SAVE_TO_FILES' then 'vault'
      when 'MAKE_REMINDER' then 'reminder' when 'SEND_TO_ROOM' then 'room'
      else 'ignored' end,
    updated_at = timezone('utc', now())
  where id = item.id and user_id = input_user_id;
  return 'OK';
end;
$$;

revoke insert, update on public.life_inbox_items from anon, authenticated;
grant select, delete on public.life_inbox_items to authenticated;
revoke all on function public.apply_mobile_mailbox_action(uuid, uuid, timestamptz, text)
from public, anon, authenticated;
grant execute on function public.apply_mobile_mailbox_action(uuid, uuid, timestamptz, text)
to service_role;
