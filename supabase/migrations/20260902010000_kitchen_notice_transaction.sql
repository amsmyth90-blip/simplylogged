-- Apply one revision-checked legacy noticeboard change and its structured reminder atomically.
create or replace function public.apply_kitchen_notice_state(
  input_expected_revision timestamptz,
  input_payload jsonb,
  input_reminder jsonb default null,
  input_delete_reminder_id text default null
)
returns table(payload jsonb, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  state_row public.app_state%rowtype;
  reminder_id text;
  source_notice_id text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if input_payload is null or jsonb_typeof(input_payload) <> 'object'
    or pg_column_size(input_payload) > 2097152 then
    raise exception 'Invalid application state';
  end if;
  if input_reminder is not null and input_delete_reminder_id is not null then
    raise exception 'Conflicting reminder effects';
  end if;

  if input_expected_revision is null then
    insert into public.app_state (id, payload)
    values (current_user_id::text, input_payload)
    on conflict (id) do nothing
    returning * into state_row;
  else
    update public.app_state
    set payload = input_payload
    where id = current_user_id::text
      and updated_at = input_expected_revision
    returning * into state_row;
  end if;

  if state_row.id is null then
    return;
  end if;

  if input_delete_reminder_id is not null then
    if length(input_delete_reminder_id) > 180
      or input_delete_reminder_id !~ '^notice-reminder-notice-[A-Za-z0-9-]{1,128}$' then
      raise exception 'Invalid reminder removal';
    end if;
    delete from public.reminders
    where id = input_delete_reminder_id and user_id = current_user_id;
  end if;

  if input_reminder is not null then
    if jsonb_typeof(input_reminder) <> 'object'
      or not (input_reminder ?& array[
        'id', 'title', 'note', 'roomId', 'roomName', 'group', 'timeLabel',
        'priority', 'assignedTo', 'sourceNoticeId'
      ])
      or exists (
        select 1 from jsonb_object_keys(input_reminder) as key
        where key <> all (array[
          'id', 'title', 'note', 'roomId', 'roomName', 'group', 'timeLabel',
          'priority', 'assignedTo', 'sourceNoticeId'
        ])
      ) then
      raise exception 'Invalid notice reminder';
    end if;
    reminder_id := input_reminder ->> 'id';
    source_notice_id := input_reminder ->> 'sourceNoticeId';
    if reminder_id !~ '^notice-reminder-notice-[A-Za-z0-9-]{1,128}$'
      or source_notice_id !~ '^notice-[A-Za-z0-9-]{1,128}$'
      or reminder_id <> 'notice-reminder-' || source_notice_id
      or trim(input_reminder ->> 'title') = ''
      or length(input_reminder ->> 'title') > 54
      or length(input_reminder ->> 'note') > 260
      or input_reminder ->> 'roomId' <> 'kitchen'
      or input_reminder ->> 'roomName' <> 'Kitchen'
      or input_reminder ->> 'group' not in ('today', 'week', 'later', 'done')
      or length(input_reminder ->> 'timeLabel') > 60
      or input_reminder ->> 'priority' not in ('high', 'normal')
      or trim(input_reminder ->> 'assignedTo') = ''
      or length(input_reminder ->> 'assignedTo') > 120 then
      raise exception 'Invalid notice reminder';
    end if;

    insert into public.reminders (
      id, user_id, title, note, room_id, room_name, reminder_group,
      time_label, priority, assigned_to, origin, reminder_type, time_zone
    ) values (
      reminder_id, current_user_id, trim(input_reminder ->> 'title'),
      nullif(trim(input_reminder ->> 'note'), ''), 'kitchen', 'Kitchen',
      input_reminder ->> 'group', input_reminder ->> 'timeLabel',
      input_reminder ->> 'priority', input_reminder ->> 'assignedTo',
      'USER_CREATED', 'custom', 'Europe/London'
    )
    on conflict (id) do update set
      title = excluded.title,
      note = excluded.note,
      reminder_group = excluded.reminder_group,
      time_label = excluded.time_label,
      priority = excluded.priority,
      assigned_to = excluded.assigned_to
    where public.reminders.user_id = current_user_id;
  end if;

  return query select state_row.payload, state_row.updated_at;
end;
$$;

revoke all on function public.apply_kitchen_notice_state(timestamptz, jsonb, jsonb, text)
from public, anon;
grant execute on function public.apply_kitchen_notice_state(timestamptz, jsonb, jsonb, text)
to authenticated;
