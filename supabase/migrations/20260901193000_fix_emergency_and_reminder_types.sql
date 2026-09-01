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
) returns integer language plpgsql security invoker set search_path = public as $$
declare
  current_user_id uuid := auth.uid();
  current_offset integer;
  reminder_key text;
  reminder_at timestamptz;
  affected integer := 0;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if coalesce(trim(input_source_resource_type), '') = '' or coalesce(trim(input_source_resource_id), '') = '' or coalesce(trim(input_source_date_key), '') = '' then raise exception 'A source resource and date key are required'; end if;
  if input_source_due_at is null then raise exception 'A source due date is required'; end if;
  if cardinality(input_offsets) > 12 then raise exception 'Too many reminder offsets'; end if;
  if exists (select 1 from unnest(input_offsets) value where value < 0 or value > 365) then raise exception 'Reminder offsets must be between 0 and 365 days'; end if;
  foreach current_offset in array input_offsets loop
    reminder_key := concat_ws(':', input_source_resource_type, input_source_resource_id, input_source_date_key, current_offset::text);
    reminder_at := input_source_due_at - make_interval(days => current_offset);
    insert into public.reminders (
      id, user_id, title, note, room_id, room_name, reminder_group, time_label, priority,
      due_at, source_due_at, origin, reminder_type, source_resource_type, source_resource_id,
      source_date_key, rule_id, rule_version, dedupe_key, schedule_offset_days
    ) values (
      gen_random_uuid(), current_user_id, left(input_title, 240), left(input_note, 1000), input_room_id, input_room_name,
      case when reminder_at::date <= current_date then 'today' when reminder_at::date <= current_date + 7 then 'week' else 'later' end,
      case when current_offset = 0 then 'Due today' when current_offset = 1 then '1 day before' else current_offset::text || ' days before' end,
      case when current_offset <= 7 then 'high' else 'normal' end,
      reminder_at, input_source_due_at, 'SYSTEM_GENERATED', input_reminder_type, input_source_resource_type,
      input_source_resource_id, input_source_date_key, input_rule_id, input_rule_version, reminder_key, current_offset
    ) on conflict (user_id, dedupe_key) do update set
      title = excluded.title, note = excluded.note, room_id = excluded.room_id, room_name = excluded.room_name,
      reminder_group = case when public.reminders.reminder_group = 'done' then 'done' else excluded.reminder_group end,
      time_label = excluded.time_label, priority = excluded.priority, due_at = excluded.due_at,
      source_due_at = excluded.source_due_at, reminder_type = excluded.reminder_type, rule_id = excluded.rule_id,
      rule_version = excluded.rule_version, schedule_offset_days = excluded.schedule_offset_days;
    affected := affected + 1;
  end loop;
  delete from public.reminders where user_id = current_user_id and origin = 'SYSTEM_GENERATED'
    and source_resource_type = input_source_resource_type and source_resource_id = input_source_resource_id
    and source_date_key = input_source_date_key and reminder_group <> 'done'
    and not (schedule_offset_days = any(input_offsets));
  return affected;
end;
$$;

create or replace function public.set_emergency_access_grant(input_contact_id uuid, input_resource_type text, input_resource_id text, input_grant boolean)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  contact_record public.trusted_emergency_contacts%rowtype;
  state_payload jsonb;
  resource_payload jsonb;
  resource_label text;
  grant_id uuid;
  audit_type text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select * into contact_record from public.trusted_emergency_contacts where id = input_contact_id and owner_id = current_user_id and (status = 'ACTIVE' or (status = 'PENDING' and expires_at > now())) for update;
  if contact_record.id is null then raise exception 'Trusted person not found or access denied'; end if;
  if input_resource_type not in ('DOCUMENT','INSTRUCTION','CONTACT','HOME_INFO') or length(trim(input_resource_id)) not between 1 and 180 then raise exception 'Invalid emergency resource'; end if;
  if not input_grant then
    update public.emergency_access_grants set revoked_at = timezone('utc', now())
    where owner_id = current_user_id and trusted_contact_id = input_contact_id and resource_type = input_resource_type and resource_id = input_resource_id and revoked_at is null
    returning id, label into grant_id, resource_label;
    if grant_id is null then raise exception 'Emergency grant not found'; end if;
    audit_type := 'EMERGENCY_ACCESS_REVOKED';
  else
    if input_resource_type = 'DOCUMENT' then
      select jsonb_build_object('title', title, 'category', category, 'roomName', room_name, 'downloadable', storage_path is not null), title
      into resource_payload, resource_label from public.documents where id::text = input_resource_id and user_id = current_user_id and emergency_visible = true;
    else
      select payload into state_payload from public.app_state where id = current_user_id::text;
      if input_resource_type = 'INSTRUCTION' then
        select jsonb_build_object('title', item->>'title', 'summary', coalesce(item->>'summary',''), 'steps', coalesce(item->'steps','[]'::jsonb)), item->>'title'
        into resource_payload, resource_label from jsonb_array_elements(coalesce(state_payload->'emergencyPlans','[]'::jsonb)) item where item->>'id' = input_resource_id limit 1;
      elsif input_resource_type = 'CONTACT' then
        select jsonb_build_object('name', item->>'name', 'relation', coalesce(item->>'relation',''), 'phone', coalesce(item->>'phone',''), 'note', coalesce(item->>'note','')), item->>'name'
        into resource_payload, resource_label from jsonb_array_elements(coalesce(state_payload->'emergencyContacts','[]'::jsonb)) item where item->>'id' = input_resource_id limit 1;
      else
        select jsonb_build_object('label', item->>'label', 'value', coalesce(item->>'value','')), item->>'label'
        into resource_payload, resource_label from jsonb_array_elements(coalesce(state_payload->'homeInfo','[]'::jsonb)) item where item->>'label' = input_resource_id limit 1;
      end if;
    end if;
    if resource_label is null or resource_payload is null then raise exception 'Emergency resource not found or not approved'; end if;
    insert into public.emergency_access_grants(owner_id, trusted_contact_id, resource_type, resource_id, label, snapshot)
    values (current_user_id, input_contact_id, input_resource_type, input_resource_id, left(resource_label,160), resource_payload)
    returning id into grant_id;
    audit_type := 'EMERGENCY_ACCESS_GRANTED';
  end if;
  insert into public.emergency_access_notifications(owner_id, recipient_user_id, trusted_contact_id, event_type, label)
  values (current_user_id, contact_record.accepted_user_id, contact_record.id, case when input_grant then 'ACCESS_GRANTED' else 'ACCESS_REVOKED' end, coalesce(resource_label,input_resource_type));
  if to_regclass('public.audit_events') is not null then
    insert into public.audit_events(user_id, actor_type, actor_id, event_type, metadata)
    values (current_user_id, 'user', current_user_id::text, audit_type, jsonb_build_object('trustedContactId', contact_record.id, 'resourceType', input_resource_type, 'grantId', grant_id));
  end if;
  return grant_id;
end;
$$;

revoke all on function public.sync_system_reminders(text,text,text,timestamptz,text,text,text,text,text,text,integer,integer[]) from public;
revoke all on function public.set_emergency_access_grant(uuid,text,text,boolean) from public;
grant execute on function public.sync_system_reminders(text,text,text,timestamptz,text,text,text,text,text,text,integer,integer[]) to authenticated;
grant execute on function public.set_emergency_access_grant(uuid,text,text,boolean) to authenticated;
