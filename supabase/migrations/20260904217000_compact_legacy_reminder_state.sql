-- Retain unresolved legacy entries while removing proven normalised reminders.
create or replace function public.compact_legacy_reminder_array(
  incoming jsonb,
  existing jsonb,
  source_prefix text,
  target_scope_kind text,
  target_scope_id uuid
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  with incoming_entries as (
    select entry.value, entry.ordinality
    from jsonb_array_elements(
      case when jsonb_typeof(incoming) = 'array' then incoming else '[]'::jsonb end
    ) with ordinality as entry(value, ordinality)
  ),
  candidates as (
    select entry.value, entry.ordinality, 0 as source_order
    from incoming_entries as entry
    union all
    select entry.value, entry.ordinality, 1 as source_order
    from jsonb_array_elements(
      case when jsonb_typeof(existing) = 'array' then existing else '[]'::jsonb end
    ) with ordinality as entry(value, ordinality)
    where jsonb_typeof(entry.value) <> 'object'
      or jsonb_typeof(entry.value -> 'id') <> 'string'
      or not exists (
        select 1 from incoming_entries as next
        where jsonb_typeof(next.value) = 'object'
          and jsonb_typeof(next.value -> 'id') = 'string'
          and next.value ->> 'id' = entry.value ->> 'id'
      )
  )
  select coalesce(jsonb_agg(candidate.value order by source_order, ordinality), '[]'::jsonb)
  from candidates as candidate
  where jsonb_typeof(candidate.value) <> 'object'
    or jsonb_typeof(candidate.value -> 'id') <> 'string'
    or not exists (
      select 1 from public.reminders as reminder
      where reminder.scope_kind = target_scope_kind
        and reminder.scope_id = target_scope_id
        and (
          reminder.legacy_source_key =
            source_prefix || (candidate.value ->> 'id')
          or (
            reminder.id = candidate.value ->> 'id'
            and reminder.title = trim(candidate.value ->> 'title')
            and reminder.reminder_group = candidate.value ->> 'group'
            and reminder.time_label = candidate.value ->> 'timeLabel'
            and reminder.priority = candidate.value ->> 'priority'
            and coalesce(reminder.note, '') = coalesce(candidate.value ->> 'note', '')
            and coalesce(reminder.room_id, '') = coalesce(candidate.value ->> 'roomId', '')
            and coalesce(reminder.room_name, '') = coalesce(candidate.value ->> 'roomName', '')
            and coalesce(reminder.repeat, '') = coalesce(candidate.value ->> 'repeat', '')
            and coalesce(reminder.document_id::text, '') = coalesce(candidate.value ->> 'documentId', '')
            and coalesce(reminder.document_title, '') = coalesce(candidate.value ->> 'documentTitle', '')
            and coalesce(reminder.assigned_to, '') = coalesce(candidate.value ->> 'assignedTo', '')
            and reminder.origin = coalesce(candidate.value ->> 'origin', 'USER_CREATED')
            and reminder.time_zone = coalesce(
              nullif(candidate.value ->> 'timeZone', ''), 'Europe/London'
            )
            and (
              nullif(candidate.value ->> 'dueAt', '') is null
                and reminder.due_at is null
              or public.legacy_reminder_timestamp(candidate.value ->> 'dueAt')
                is not distinct from reminder.due_at
            )
          )
        )
    );
$$;

revoke all on function public.compact_legacy_reminder_array(
  jsonb,jsonb,text,text,uuid
) from public, anon, authenticated, service_role;

create or replace function public.compact_household_reminder_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  prior jsonb := '{}'::jsonb;
begin
  if tg_op = 'UPDATE' then prior := old.payload; end if;
  new.payload := jsonb_set(
    new.payload,
    '{reminders}',
    public.compact_legacy_reminder_array(
      new.payload -> 'reminders',
      prior -> 'reminders',
      'HOUSEHOLD:' || new.household_id::text || ':',
      'HOUSEHOLD',
      new.household_id
    ),
    true
  );
  return new;
end;
$$;

create or replace function public.compact_private_reminder_state()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  prior jsonb := '{}'::jsonb;
  account_id uuid;
  target_id uuid;
  target_kind text := 'USER';
  prefix text;
begin
  select user_record.id into account_id
  from auth.users as user_record where user_record.id::text = new.id;
  if account_id is null then return new; end if;
  select membership.household_id into target_id
  from public.household_memberships as membership
  where membership.user_id = account_id
    and membership.status = 'active' and membership.role in ('owner','member')
  limit 1;
  if target_id is null then
    target_id := account_id;
  else
    target_kind := 'HOUSEHOLD';
  end if;
  prefix := target_kind || ':' || target_id::text || ':';
  if tg_op = 'UPDATE' then prior := old.payload; end if;
  new.payload := jsonb_set(
    new.payload,
    '{reminders}',
    public.compact_legacy_reminder_array(
      new.payload -> 'reminders',
      prior -> 'reminders',
      prefix,
      target_kind,
      target_id
    ),
    true
  );
  return new;
end;
$$;

revoke all on function public.compact_household_reminder_state()
from public, anon, authenticated, service_role;
revoke all on function public.compact_private_reminder_state()
from public, anon, authenticated, service_role;

drop trigger if exists household_state_compact_normalized_reminders
on public.household_state;
create trigger household_state_compact_normalized_reminders
before insert or update of payload on public.household_state
for each row execute function public.compact_household_reminder_state();

drop trigger if exists app_state_compact_normalized_reminders
on public.app_state;
create trigger app_state_compact_normalized_reminders
before insert or update of payload on public.app_state
for each row execute function public.compact_private_reminder_state();

update public.household_state
set payload = payload
where jsonb_typeof(payload -> 'reminders') = 'array';

update public.app_state
set payload = payload
where jsonb_typeof(payload -> 'reminders') = 'array';
