create sequence if not exists public.sync_change_sequence as bigint cache 1000;

alter table public.reminders add column if not exists assigned_to text;

create table if not exists public.sync_records (
  record_id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_id text not null,
  scope_kind text not null default 'USER',
  scope_id uuid not null,
  revision bigint not null default 1,
  schema_version integer not null default 1,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  change_sequence bigint not null default nextval('public.sync_change_sequence'),
  constraint sync_records_entity_type_check check (entity_type ~ '^[a-z][a-z0-9-]{0,63}$'),
  constraint sync_records_scope_kind_check check (scope_kind in ('USER', 'HOUSEHOLD')),
  constraint sync_records_revision_check check (revision > 0),
  constraint sync_records_schema_check check (schema_version between 1 and 10000),
  constraint sync_records_payload_check check (
    jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 256000
  ),
  unique (owner_id, entity_type, source_id)
);

create index if not exists sync_records_owner_changes_idx
  on public.sync_records (owner_id, change_sequence, record_id);
create index if not exists sync_records_scope_changes_idx
  on public.sync_records (scope_id, change_sequence, record_id)
  where scope_kind = 'HOUSEHOLD';

create table if not exists public.sync_idempotency (
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_payload jsonb not null,
  response_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '7 days',
  primary key (owner_id, idempotency_key),
  constraint sync_idempotency_request_size check (octet_length(request_payload::text) <= 256000),
  constraint sync_idempotency_expiry check (expires_at > created_at)
);

create index if not exists sync_idempotency_expiry_idx
  on public.sync_idempotency (expires_at);

alter table public.sync_records enable row level security;
alter table public.sync_records force row level security;
alter table public.sync_idempotency enable row level security;
alter table public.sync_idempotency force row level security;

drop policy if exists sync_records_owner_read on public.sync_records;
create policy sync_records_owner_read on public.sync_records
for select to authenticated
using (owner_id = (select auth.uid()));

revoke all on table public.sync_records from public, anon, authenticated;
grant select on table public.sync_records to authenticated;
revoke all on table public.sync_idempotency from public, anon, authenticated;
revoke all on sequence public.sync_change_sequence from public, anon, authenticated;

create or replace function public.reminder_sync_payload(reminder public.reminders)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'title', reminder.title,
    'note', reminder.note,
    'roomId', reminder.room_id,
    'roomName', reminder.room_name,
    'group', reminder.reminder_group,
    'timeLabel', reminder.time_label,
    'priority', reminder.priority,
    'repeat', reminder.repeat,
    'documentId', reminder.document_id,
    'documentTitle', reminder.document_title,
    'assignedTo', reminder.assigned_to,
    'dueAt', reminder.due_at,
    'sourceDueAt', reminder.source_due_at,
    'origin', reminder.origin,
    'reminderType', reminder.reminder_type,
    'sourceResourceType', reminder.source_resource_type,
    'sourceResourceId', reminder.source_resource_id,
    'sourceDateKey', reminder.source_date_key,
    'ruleId', reminder.rule_id,
    'ruleVersion', reminder.rule_version,
    'dedupeKey', reminder.dedupe_key,
    'scheduleOffsetDays', reminder.schedule_offset_days,
    'timeZone', reminder.time_zone
  ));
$$;

revoke all on function public.reminder_sync_payload(public.reminders) from public, anon, authenticated;

create or replace function public.project_reminder_for_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  source public.reminders;
begin
  if tg_op = 'DELETE' then
    update public.sync_records
    set revision = revision + 1,
        payload = '{}'::jsonb,
        updated_at = timezone('utc', now()),
        deleted_at = timezone('utc', now()),
        change_sequence = nextval('public.sync_change_sequence')
    where owner_id = old.user_id and entity_type = 'reminder' and source_id = old.id;
    return old;
  end if;

  source := new;
  insert into public.sync_records (
    record_id, entity_type, owner_id, source_id, scope_kind, scope_id,
    revision, schema_version, payload, updated_at, deleted_at, change_sequence
  ) values (
    case when source.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then source.id::uuid else gen_random_uuid() end,
    'reminder', source.user_id, source.id, 'USER', source.user_id,
    1, 1, public.reminder_sync_payload(source), source.updated_at, null,
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

revoke all on function public.project_reminder_for_sync() from public, anon, authenticated;

drop trigger if exists reminders_project_for_sync on public.reminders;
create trigger reminders_project_for_sync
after insert or update or delete on public.reminders
for each row execute function public.project_reminder_for_sync();

insert into public.sync_records (
  record_id, entity_type, owner_id, source_id, scope_kind, scope_id,
  revision, schema_version, payload, updated_at, deleted_at, change_sequence
)
select
  case when reminder.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then reminder.id::uuid else gen_random_uuid() end,
  'reminder', reminder.user_id, reminder.id, 'USER', reminder.user_id,
  1, 1, public.reminder_sync_payload(reminder), reminder.updated_at, null,
  nextval('public.sync_change_sequence')
from public.reminders as reminder
on conflict (owner_id, entity_type, source_id) do nothing;
