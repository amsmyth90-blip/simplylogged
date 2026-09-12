-- Private appointment creation and per-device notification outbox.
create table if not exists public.appointment_devices (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  token text not null check (length(token) between 20 and 4096),
  updated_at timestamptz not null default now(),
  unique(platform, token)
);
create table public.appointment_imports (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  document_id text not null,
  record jsonb not null,
  primary key(user_id, id),
  unique(user_id, document_id)
);
create table public.appointment_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  appointment_id uuid not null,
  device_id uuid not null references public.appointment_devices(id) on delete cascade,
  kind text not null check(kind in ('added','reminder')),
  start_at timestamptz not null,
  due_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','sending','sent','cancelled','failed')),
  attempts integer not null default 0,
  lease_until timestamptz,
  sent_at timestamptz,
  unique(user_id, appointment_id, device_id, kind)
);
create index appointment_notifications_due on public.appointment_notifications(due_at)
  where status in ('pending','sending');
create index appointment_devices_owner on public.appointment_devices(user_id);
alter table public.appointment_devices enable row level security;
alter table public.appointment_devices force row level security;
alter table public.appointment_imports enable row level security;
alter table public.appointment_imports force row level security;
alter table public.appointment_notifications enable row level security;
alter table public.appointment_notifications force row level security;
revoke all on public.appointment_devices, public.appointment_imports, public.appointment_notifications from public, anon, authenticated;
grant all on public.appointment_devices, public.appointment_imports, public.appointment_notifications to service_role;

create or replace function public.save_letter_appointment(
  input_user_id uuid, input_id uuid, input_document_id text, input_record jsonb,
  input_start_at timestamptz, input_remind_at timestamptz, input_notify boolean
) returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  state_row public.app_state%rowtype;
  source_document public.documents%rowtype;
  existing public.appointment_imports%rowtype;
  reminder_row public.reminders%rowtype;
  next_health jsonb;
  reminder_id uuid;
  queued integer := 0;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required'; end if;
  if input_user_id is null or input_id is null or input_record is null
    or jsonb_typeof(input_record) <> 'object' or pg_column_size(input_record) > 16384
    or input_record->>'id' is distinct from input_id::text then raise exception 'Invalid appointment'; end if;
  -- All changes are serialized per account and committed together.
  perform pg_advisory_xact_lock(hashtextextended(input_user_id::text, 724));
  select * into existing from public.appointment_imports
    where user_id = input_user_id and (id = input_id or document_id = input_document_id);
  if existing.id is not null then
    if existing.record is distinct from input_record then raise exception 'Appointment already saved with different details'; end if;
    select count(*) into queued from public.appointment_notifications
      where user_id = input_user_id and appointment_id = existing.id;
    return jsonb_build_object('id', existing.id, 'notificationsQueued', queued);
  end if;
  select * into source_document from public.documents
    where id::text = input_document_id and user_id = input_user_id and scope_kind = 'USER';
  if source_document.id is null then raise exception 'Private letter not found'; end if;
  insert into public.app_state(id, payload) values(input_user_id::text, '{}'::jsonb) on conflict(id) do nothing;
  select * into state_row from public.app_state where id = input_user_id::text for update;
  next_health := coalesce(state_row.payload->'health', '{}'::jsonb);
  if jsonb_array_length(coalesce(next_health->'appointments','[]'::jsonb)) >= 10000 then
    raise exception 'Appointment limit reached';
  end if;
  if exists(select 1 from jsonb_array_elements(coalesce(next_health->'appointments','[]'::jsonb)) a
    where a->>'status' = 'planned' and a->>'date' = input_record->>'date'
    and a->>'time' = input_record->>'time' and lower(a->>'title') = lower(input_record->>'title')
    and lower(a->>'provider') = lower(input_record->>'provider')) then
    raise exception 'An appointment with these details already exists';
  end if;
  if input_remind_at is not null then
    reminder_id := (input_record->>'reminderId')::uuid;
    reminder_row := jsonb_populate_record(null::public.reminders, jsonb_build_object(
      'id', reminder_id, 'user_id', input_user_id, 'scope_kind', 'USER', 'scope_id', input_user_id,
      'title', input_record->>'title', 'note', 'Open the linked letter in your private health files.',
      'room_id', 'bedroom', 'room_name', 'Bedroom', 'reminder_group', 'later',
      'time_label', (input_record->>'date') || ', ' || (input_record->>'time'), 'priority', 'normal',
      'document_id', input_document_id, 'due_at', input_remind_at, 'source_due_at', input_start_at,
      'origin', 'USER_CREATED', 'reminder_type', 'custom', 'time_zone', input_record->>'timeZone'));
    insert into public.reminders(id,user_id,scope_kind,scope_id,title,note,room_id,room_name,
      reminder_group,time_label,priority,document_id,due_at,source_due_at,origin,reminder_type,time_zone)
    values(reminder_row.id,reminder_row.user_id,reminder_row.scope_kind,reminder_row.scope_id,
      reminder_row.title,reminder_row.note,reminder_row.room_id,reminder_row.room_name,
      reminder_row.reminder_group,reminder_row.time_label,reminder_row.priority,reminder_row.document_id,
      reminder_row.due_at,reminder_row.source_due_at,reminder_row.origin,reminder_row.reminder_type,reminder_row.time_zone);
  end if;
  next_health := next_health || jsonb_build_object(
    'appointments', jsonb_build_array(input_record) || coalesce(next_health->'appointments','[]'::jsonb),
    'timeline', jsonb_build_array(jsonb_build_object('id',input_id,'type','appointment',
      'title',input_record->>'title','date',input_record->>'date','notes','Added from an appointment letter.',
      'linkedRecordId',input_id,'createdAt',input_record->>'createdAt')) || coalesce(next_health->'timeline','[]'::jsonb),
    'updatedAt', now());
  update public.app_state set payload = jsonb_set(state_row.payload, '{health}', next_health)
    where id = input_user_id::text;
  insert into public.appointment_imports values(input_user_id,input_id,input_document_id,input_record);
  if input_notify then
    insert into public.appointment_notifications(user_id,appointment_id,device_id,kind,start_at,due_at)
    select input_user_id,input_id,d.id,'added',input_start_at,now() from public.appointment_devices d
      where d.user_id = input_user_id and d.updated_at > now() - interval '90 days';
    if input_remind_at > now() then
      insert into public.appointment_notifications(user_id,appointment_id,device_id,kind,start_at,due_at)
      select input_user_id,input_id,d.id,'reminder',input_start_at,input_remind_at from public.appointment_devices d
        where d.user_id = input_user_id and d.updated_at > now() - interval '90 days';
    end if;
    select count(*) into queued from public.appointment_notifications
      where user_id = input_user_id and appointment_id = input_id;
  end if;
  return jsonb_build_object('id',input_id,'notificationsQueued',queued);
end;
$$;
revoke all on function public.save_letter_appointment(uuid,uuid,text,jsonb,timestamptz,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.save_letter_appointment(uuid,uuid,text,jsonb,timestamptz,timestamptz,boolean) to service_role;

create or replace function public.claim_appointment_notifications()
returns setof public.appointment_notifications language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required'; end if;
  update public.appointment_notifications set status='failed', lease_until=null
    where status='sending' and lease_until < now() and attempts >= 8;
  return query update public.appointment_notifications set status='sending', attempts=attempts+1, lease_until=now()+interval '5 minutes'
    where id in (select id from public.appointment_notifications where due_at <= now() and attempts < 8
      and (status='pending' or (status='sending' and lease_until < now()))
      order by due_at for update skip locked limit 20) returning *;
end;
$$;
revoke all on function public.claim_appointment_notifications() from public,anon,authenticated;
grant execute on function public.claim_appointment_notifications() to service_role;
