alter table public.reminders add column if not exists due_at timestamptz;
alter table public.reminders add column if not exists source_due_at timestamptz;
alter table public.reminders add column if not exists origin text not null default 'USER_CREATED';
alter table public.reminders add column if not exists reminder_type text not null default 'custom';
alter table public.reminders add column if not exists source_resource_type text;
alter table public.reminders add column if not exists source_resource_id text;
alter table public.reminders add column if not exists source_date_key text;
alter table public.reminders add column if not exists rule_id text;
alter table public.reminders add column if not exists rule_version integer;
alter table public.reminders add column if not exists dedupe_key text;
alter table public.reminders add column if not exists schedule_offset_days integer;
alter table public.reminders add column if not exists time_zone text not null default 'Europe/London';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reminders_origin_check') then
    alter table public.reminders add constraint reminders_origin_check
      check (origin in ('USER_CREATED', 'SYSTEM_GENERATED'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reminders_offset_bounds') then
    alter table public.reminders add constraint reminders_offset_bounds
      check (schedule_offset_days is null or (schedule_offset_days >= 0 and schedule_offset_days <= 365));
  end if;
end;
$$;

create unique index if not exists reminders_user_dedupe_idx on public.reminders(user_id, dedupe_key);
create index if not exists reminders_user_due_at_idx on public.reminders(user_id, due_at) where reminder_group <> 'done';

create or replace function public.sync_system_reminders(
  input_source_resource_type text,
  input_source_resource_id text,
  input_source_date_key text,
  input_source_due_at timestamptz,
  input_title text,
  input_note text default null,
  input_room_id text default null,
  input_room_name text default null,
  input_reminder_type text default 'expiry',
  input_rule_id text default 'central-reminder-engine',
  input_rule_version integer default 1,
  input_offsets integer[] default array[90,60,30,14,7,1]
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_offset integer;
  reminder_key text;
  reminder_at timestamptz;
  affected integer := 0;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if coalesce(trim(input_source_resource_type), '') = '' or coalesce(trim(input_source_resource_id), '') = '' or coalesce(trim(input_source_date_key), '') = '' then
    raise exception 'A source resource and date key are required';
  end if;
  if input_source_due_at is null then raise exception 'A source due date is required'; end if;
  if cardinality(input_offsets) > 12 then raise exception 'Too many reminder offsets'; end if;
  if exists (select 1 from unnest(input_offsets) value where value < 0 or value > 365) then
    raise exception 'Reminder offsets must be between 0 and 365 days';
  end if;

  foreach current_offset in array input_offsets loop
    reminder_key := concat_ws(':', input_source_resource_type, input_source_resource_id, input_source_date_key, current_offset::text);
    reminder_at := input_source_due_at - make_interval(days => current_offset);
    insert into public.reminders (
      id, user_id, title, note, room_id, room_name, reminder_group, time_label, priority,
      due_at, source_due_at, origin, reminder_type, source_resource_type, source_resource_id,
      source_date_key, rule_id, rule_version, dedupe_key, schedule_offset_days
    ) values (
      gen_random_uuid(), current_user_id, left(input_title, 240), left(input_note, 1000),
      input_room_id, input_room_name,
      case when reminder_at::date <= current_date then 'today' when reminder_at::date <= current_date + 7 then 'week' else 'later' end,
      case when current_offset = 0 then 'Due today' when current_offset = 1 then '1 day before' else current_offset::text || ' days before' end,
      case when current_offset <= 7 then 'high' else 'normal' end,
      reminder_at, input_source_due_at, 'SYSTEM_GENERATED', input_reminder_type,
      input_source_resource_type, input_source_resource_id, input_source_date_key,
      input_rule_id, input_rule_version, reminder_key, current_offset
    ) on conflict (user_id, dedupe_key) do update set
      title = excluded.title,
      note = excluded.note,
      room_id = excluded.room_id,
      room_name = excluded.room_name,
      reminder_group = case when public.reminders.reminder_group = 'done' then 'done' else excluded.reminder_group end,
      time_label = excluded.time_label,
      priority = excluded.priority,
      due_at = excluded.due_at,
      source_due_at = excluded.source_due_at,
      reminder_type = excluded.reminder_type,
      rule_id = excluded.rule_id,
      rule_version = excluded.rule_version,
      schedule_offset_days = excluded.schedule_offset_days;
    affected := affected + 1;
  end loop;

  delete from public.reminders
  where user_id = current_user_id
    and origin = 'SYSTEM_GENERATED'
    and source_resource_type = input_source_resource_type
    and source_resource_id = input_source_resource_id
    and source_date_key = input_source_date_key
    and reminder_group <> 'done'
    and not (schedule_offset_days = any(input_offsets));

  return affected;
end;
$$;

revoke all on function public.sync_system_reminders(text,text,text,timestamptz,text,text,text,text,text,text,integer,integer[]) from public;
grant execute on function public.sync_system_reminders(text,text,text,timestamptz,text,text,text,text,text,text,integer,integer[]) to authenticated;
