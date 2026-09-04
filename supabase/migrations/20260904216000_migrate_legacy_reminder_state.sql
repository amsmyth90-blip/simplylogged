-- Mark only reminders copied from legacy JSON so collisions are never compacted.
alter table public.reminders add column if not exists legacy_source_key text;
alter table public.reminders
  drop constraint if exists reminders_legacy_source_key_bounds;
alter table public.reminders
  add constraint reminders_legacy_source_key_bounds
  check (legacy_source_key is null or length(legacy_source_key) between 1 and 220);

create or replace function public.is_valid_legacy_reminder(value jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_typeof(value) = 'object'
    and jsonb_typeof(value -> 'id') = 'string'
    and length(value ->> 'id') between 1 and 128
    and jsonb_typeof(value -> 'title') = 'string'
    and length(trim(value ->> 'title')) between 1 and 240
    and value ->> 'group' in ('today','week','later','done')
    and jsonb_typeof(value -> 'timeLabel') = 'string'
    and length(value ->> 'timeLabel') between 1 and 120
    and value ->> 'priority' in ('high','normal','low')
    and coalesce(value ->> 'origin', 'USER_CREATED') = 'USER_CREATED'
    and length(coalesce(value ->> 'note', '')) <= 1000
    and length(coalesce(value ->> 'roomId', '')) <= 128
    and length(coalesce(value ->> 'roomName', '')) <= 160
    and length(coalesce(value ->> 'repeat', '')) <= 120
    and length(coalesce(value ->> 'documentId', '')) <= 128
    and length(coalesce(value ->> 'documentTitle', '')) <= 240
    and length(coalesce(value ->> 'assignedTo', '')) <= 160
    and length(coalesce(value ->> 'dueAt', '')) <= 32
    and length(coalesce(value ->> 'timeZone', 'Europe/London')) <= 64
    and coalesce(value ->> 'timeZone', 'Europe/London')
      ~ '^[A-Za-z_+.-]+(/[A-Za-z0-9_+.-]+)*$'
    and not exists (
      select 1 from jsonb_each(value) as field(key, field_value)
      where field.key in (
        'note','roomId','roomName','repeat','documentId','documentTitle',
        'assignedTo','dueAt','timeZone','origin'
      ) and jsonb_typeof(field.field_value) not in ('string','null')
    );
$$;

create or replace function public.legacy_reminder_timestamp(value text)
returns timestamptz
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if nullif(value, '') is null then return null; end if;
  return value::timestamptz;
exception when others then
  return null;
end;
$$;

revoke all on function public.is_valid_legacy_reminder(jsonb)
from public, anon, authenticated, service_role;
revoke all on function public.legacy_reminder_timestamp(text)
from public, anon, authenticated, service_role;

insert into public.reminders (
  id,user_id,scope_kind,scope_id,title,note,room_id,room_name,reminder_group,
  time_label,priority,repeat,document_id,document_title,assigned_to,due_at,
  origin,reminder_type,time_zone,legacy_source_key
)
select
  entry.value ->> 'id', household.owner_id, 'HOUSEHOLD', state.household_id,
  trim(entry.value ->> 'title'), nullif(entry.value ->> 'note',''),
  nullif(entry.value ->> 'roomId',''), nullif(entry.value ->> 'roomName',''),
  entry.value ->> 'group', entry.value ->> 'timeLabel',
  entry.value ->> 'priority', nullif(entry.value ->> 'repeat',''),
  nullif(entry.value ->> 'documentId',''), nullif(entry.value ->> 'documentTitle',''),
  nullif(entry.value ->> 'assignedTo',''),
  public.legacy_reminder_timestamp(entry.value ->> 'dueAt'),
  'USER_CREATED', 'custom', coalesce(nullif(entry.value ->> 'timeZone',''),'Europe/London'),
  'HOUSEHOLD:' || state.household_id::text || ':' || (entry.value ->> 'id')
from public.household_state as state
join public.households as household on household.id = state.household_id
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(state.payload -> 'reminders') = 'array'
    then state.payload -> 'reminders' else '[]'::jsonb end
) as entry(value)
where public.is_valid_legacy_reminder(entry.value)
  and (not (entry.value ? 'dueAt')
    or nullif(entry.value ->> 'dueAt','') is null
    or public.legacy_reminder_timestamp(entry.value ->> 'dueAt') is not null)
  and (nullif(entry.value ->> 'documentId','') is null or exists (
    select 1 from public.documents where id = entry.value ->> 'documentId'
  ))
on conflict (id) do nothing;

insert into public.reminders (
  id,user_id,scope_kind,scope_id,title,note,room_id,room_name,reminder_group,
  time_label,priority,repeat,document_id,document_title,assigned_to,due_at,
  origin,reminder_type,time_zone,legacy_source_key
)
select
  entry.value ->> 'id', coalesce(shared.owner_id, state_user.id),
  case when shared.household_id is null then 'USER' else 'HOUSEHOLD' end,
  coalesce(shared.household_id, state_user.id), trim(entry.value ->> 'title'),
  nullif(entry.value ->> 'note',''), nullif(entry.value ->> 'roomId',''),
  nullif(entry.value ->> 'roomName',''), entry.value ->> 'group',
  entry.value ->> 'timeLabel', entry.value ->> 'priority',
  nullif(entry.value ->> 'repeat',''), nullif(entry.value ->> 'documentId',''),
  nullif(entry.value ->> 'documentTitle',''), nullif(entry.value ->> 'assignedTo',''),
  public.legacy_reminder_timestamp(entry.value ->> 'dueAt'),
  'USER_CREATED', 'custom', coalesce(nullif(entry.value ->> 'timeZone',''),'Europe/London'),
  case when shared.household_id is null
    then 'USER:' || state.id || ':' || (entry.value ->> 'id')
    else 'HOUSEHOLD:' || shared.household_id::text || ':' || (entry.value ->> 'id') end
from public.app_state as state
join auth.users as state_user on state_user.id::text = state.id
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(state.payload -> 'reminders') = 'array'
    then state.payload -> 'reminders' else '[]'::jsonb end
) as entry(value)
left join lateral (
  select membership.household_id, household.owner_id
  from public.household_memberships as membership
  join public.households as household on household.id = membership.household_id
  where membership.user_id = state_user.id
    and membership.status = 'active' and membership.role in ('owner','member')
  limit 1
) as shared on true
where public.is_valid_legacy_reminder(entry.value)
  and (not (entry.value ? 'dueAt')
    or nullif(entry.value ->> 'dueAt','') is null
    or public.legacy_reminder_timestamp(entry.value ->> 'dueAt') is not null)
  and (nullif(entry.value ->> 'documentId','') is null or exists (
    select 1 from public.documents where id = entry.value ->> 'documentId'
  ))
on conflict (id) do nothing;
