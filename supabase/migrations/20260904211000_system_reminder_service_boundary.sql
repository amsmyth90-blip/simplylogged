-- Generated schedules may only be written by the rate-limited application service.
do $$
begin
  if to_regprocedure(
    'public.sync_system_reminders(text,text,text,timestamptz,text,text,text,text,text,text,integer,integer[])'
  ) is not null then
    revoke all on function public.sync_system_reminders(
      text,text,text,timestamptz,text,text,text,text,text,text,integer,integer[]
    ) from public, anon, authenticated, service_role;
  end if;
end;
$$;

create unique index if not exists reminders_user_dedupe_idx
on public.reminders(user_id, dedupe_key);

create or replace function public.sync_system_reminders_server(
  input_user_id uuid,
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
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_offset integer;
  reminder_key text;
  reminder_at timestamptz;
  affected integer := 0;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  if input_user_id is null
    or not exists (select 1 from auth.users where id = input_user_id) then
    raise exception 'Invalid account';
  end if;
  if coalesce(trim(input_source_resource_type), '') !~ '^[a-z][a-z0-9-]{0,63}$'
    or length(coalesce(trim(input_source_resource_id), '')) not between 1 and 180
    or input_source_resource_id ~ '[[:cntrl:]]'
    or coalesce(trim(input_source_date_key), '') !~ '^[a-z][a-z0-9_-]{0,63}$'
    or input_source_due_at is null
    or input_source_due_at < timezone('utc', now()) - interval '100 years'
    or input_source_due_at > timezone('utc', now()) + interval '100 years'
    or length(coalesce(trim(input_title), '')) not between 1 and 240
    or input_title ~ '[[:cntrl:]]'
    or length(coalesce(input_note, '')) > 1000
    or coalesce(input_note, '') ~ '[[:cntrl:]]'
    or (input_room_id is not null and input_room_id !~ '^[a-z][a-z0-9-]{0,63}$')
    or length(coalesce(input_room_name, '')) > 120
    or coalesce(input_reminder_type, '') !~ '^[a-z][a-z0-9_-]{0,63}$'
    or coalesce(input_rule_id, '') !~ '^[a-z][a-z0-9_-]{0,95}$'
    or input_rule_version not between 1 and 10000
    or input_offsets is null
    or cardinality(input_offsets) not between 1 and 12
    or exists (select 1 from unnest(input_offsets) value where value is null or value < 0 or value > 365)
    or (select count(*) from unnest(input_offsets))
      <> (select count(distinct value) from unnest(input_offsets) value) then
    raise exception 'Invalid reminder schedule';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'diarydock-system-reminder:' || input_user_id::text || ':'
        || input_source_resource_type || ':' || input_source_resource_id || ':'
        || input_source_date_key,
      0
    )
  );

  foreach current_offset in array input_offsets loop
    reminder_key := concat_ws(
      ':', input_source_resource_type, input_source_resource_id,
      input_source_date_key, current_offset::text
    );
    reminder_at := input_source_due_at - make_interval(days => current_offset);
    insert into public.reminders (
      id, user_id, title, note, room_id, room_name, reminder_group,
      time_label, priority, due_at, source_due_at, origin, reminder_type,
      source_resource_type, source_resource_id, source_date_key, rule_id,
      rule_version, dedupe_key, schedule_offset_days
    ) values (
      gen_random_uuid()::text, input_user_id, trim(input_title), input_note,
      input_room_id, input_room_name,
      case when reminder_at::date <= current_date then 'today'
        when reminder_at::date <= current_date + 7 then 'week' else 'later' end,
      case when current_offset = 0 then 'Due today'
        when current_offset = 1 then '1 day before'
        else current_offset::text || ' days before' end,
      case when current_offset <= 7 then 'high' else 'normal' end,
      reminder_at, input_source_due_at, 'SYSTEM_GENERATED', input_reminder_type,
      input_source_resource_type, input_source_resource_id, input_source_date_key,
      input_rule_id, input_rule_version, reminder_key, current_offset
    ) on conflict (user_id, dedupe_key) do update set
      title = excluded.title,
      note = excluded.note,
      room_id = excluded.room_id,
      room_name = excluded.room_name,
      reminder_group = case when public.reminders.reminder_group = 'done'
        then 'done' else excluded.reminder_group end,
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
  where user_id = input_user_id
    and origin = 'SYSTEM_GENERATED'
    and source_resource_type = input_source_resource_type
    and source_resource_id = input_source_resource_id
    and source_date_key = input_source_date_key
    and reminder_group <> 'done'
    and not (schedule_offset_days = any(input_offsets));
  return affected;
end;
$$;

revoke all on function public.sync_system_reminders_server(
  uuid,text,text,text,timestamptz,text,text,text,text,text,text,integer,integer[]
) from public, anon, authenticated;
grant execute on function public.sync_system_reminders_server(
  uuid,text,text,text,timestamptz,text,text,text,text,text,text,integer,integer[]
) to service_role;
