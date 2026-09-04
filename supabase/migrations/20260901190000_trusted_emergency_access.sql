create table if not exists public.trusted_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null check (length(trim(email)) between 3 and 254),
  relation text not null default '' check (length(relation) <= 120),
  public_id text not null unique check (public_id ~ '^[A-Za-z0-9_-]{20,64}$'),
  secret_hash text check (secret_hash is null or secret_hash ~ '^[a-f0-9]{64}$'),
  accepted_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED')),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '14 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((status = 'PENDING' and secret_hash is not null and accepted_user_id is null) or status <> 'PENDING')
);

create table if not exists public.emergency_access_grants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trusted_contact_id uuid not null references public.trusted_emergency_contacts(id) on delete cascade,
  resource_type text not null check (resource_type in ('DOCUMENT', 'INSTRUCTION', 'CONTACT', 'HOME_INFO')),
  resource_id text not null check (length(trim(resource_id)) between 1 and 180),
  label text not null check (length(trim(label)) between 1 and 160),
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.emergency_access_notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  trusted_contact_id uuid not null references public.trusted_emergency_contacts(id) on delete cascade,
  event_type text not null check (event_type in ('INVITATION_ACCEPTED', 'ACCESS_GRANTED', 'ACCESS_REVOKED', 'CONTACT_REVOKED')),
  label text not null default '' check (length(label) <= 160),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists trusted_emergency_contacts_owner_idx on public.trusted_emergency_contacts(owner_id, status, created_at desc);
create index if not exists trusted_emergency_contacts_recipient_idx on public.trusted_emergency_contacts(accepted_user_id, status);
create unique index if not exists emergency_access_grants_active_unique on public.emergency_access_grants(trusted_contact_id, resource_type, resource_id) where revoked_at is null;
create index if not exists emergency_access_grants_recipient_idx on public.emergency_access_grants(trusted_contact_id, revoked_at);
create index if not exists emergency_access_notifications_recipient_idx on public.emergency_access_notifications(recipient_user_id, created_at desc);

drop trigger if exists trusted_emergency_contacts_touch_updated_at on public.trusted_emergency_contacts;
create trigger trusted_emergency_contacts_touch_updated_at before update on public.trusted_emergency_contacts for each row execute function public.touch_updated_at();
drop trigger if exists emergency_access_grants_touch_updated_at on public.emergency_access_grants;
create trigger emergency_access_grants_touch_updated_at before update on public.emergency_access_grants for each row execute function public.touch_updated_at();

alter table public.trusted_emergency_contacts enable row level security;
alter table public.emergency_access_grants enable row level security;
alter table public.emergency_access_notifications enable row level security;

drop policy if exists trusted_emergency_contacts_participant_read on public.trusted_emergency_contacts;
create policy trusted_emergency_contacts_participant_read on public.trusted_emergency_contacts for select to authenticated
using (owner_id = auth.uid() or (accepted_user_id = auth.uid() and status = 'ACTIVE'));
drop policy if exists emergency_access_grants_participant_read on public.emergency_access_grants;
create policy emergency_access_grants_participant_read on public.emergency_access_grants for select to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.trusted_emergency_contacts contact
    where contact.id = trusted_contact_id and contact.accepted_user_id = auth.uid() and contact.status = 'ACTIVE' and emergency_access_grants.revoked_at is null
  )
);
drop policy if exists emergency_access_notifications_participant_read on public.emergency_access_notifications;
create policy emergency_access_notifications_participant_read on public.emergency_access_notifications for select to authenticated
using (owner_id = auth.uid() or recipient_user_id = auth.uid());

revoke all on public.trusted_emergency_contacts, public.emergency_access_grants, public.emergency_access_notifications from anon;
revoke insert, update, delete on public.trusted_emergency_contacts, public.emergency_access_grants, public.emergency_access_notifications from authenticated;
grant select on public.trusted_emergency_contacts, public.emergency_access_grants, public.emergency_access_notifications to authenticated;

create or replace function public.create_trusted_emergency_contact(
  input_name text,
  input_email text,
  input_relation text,
  input_public_id text,
  input_secret_hash text
) returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  new_contact_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if length(trim(input_name)) not between 1 and 120 then raise exception 'A trusted person name is required'; end if;
  if lower(trim(input_email)) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'A valid email is required'; end if;
  if input_public_id !~ '^[A-Za-z0-9_-]{20,64}$' or input_secret_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation verifier'; end if;
  if exists (select 1 from public.trusted_emergency_contacts where owner_id = current_user_id and lower(email) = lower(trim(input_email)) and status in ('PENDING','ACTIVE')) then raise exception 'That person already has an invitation or access'; end if;
  insert into public.trusted_emergency_contacts(owner_id, name, email, relation, public_id, secret_hash)
  values (current_user_id, trim(input_name), lower(trim(input_email)), left(trim(coalesce(input_relation,'')),120), input_public_id, input_secret_hash)
  returning id into new_contact_id;
  return new_contact_id;
end;
$$;

create or replace function public.accept_trusted_emergency_invite(input_public_id text, input_secret_hash text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt()->>'email',''));
  contact_record public.trusted_emergency_contacts%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select * into contact_record from public.trusted_emergency_contacts
  where public_id = input_public_id and secret_hash = input_secret_hash and status = 'PENDING' and expires_at > now() for update;
  if contact_record.id is null or current_email = '' or current_email <> lower(contact_record.email) then raise exception 'Invitation unavailable'; end if;
  update public.trusted_emergency_contacts set status = 'ACTIVE', accepted_user_id = current_user_id, accepted_at = timezone('utc', now()), secret_hash = null where id = contact_record.id;
  insert into public.emergency_access_notifications(owner_id, recipient_user_id, trusted_contact_id, event_type, label)
  values (contact_record.owner_id, current_user_id, contact_record.id, 'INVITATION_ACCEPTED', contact_record.name);
  if to_regclass('public.audit_events') is not null then
    insert into public.audit_events(user_id, actor_type, actor_id, event_type, metadata)
    values (contact_record.owner_id, 'user', current_user_id::text, 'EMERGENCY_CONTACT_ACCEPTED', jsonb_build_object('trustedContactId', contact_record.id));
  end if;
  return contact_record.id;
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
      into resource_payload, resource_label from public.documents
      where id::text = input_resource_id and user_id = current_user_id and emergency_visible = true;
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

create or replace function public.revoke_trusted_emergency_contact(input_contact_id uuid)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  contact_record public.trusted_emergency_contacts%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select * into contact_record from public.trusted_emergency_contacts where id = input_contact_id and owner_id = current_user_id and status in ('PENDING','ACTIVE') for update;
  if contact_record.id is null then raise exception 'Trusted person not found or access denied'; end if;
  update public.trusted_emergency_contacts set status = 'REVOKED', secret_hash = null, revoked_at = timezone('utc', now()) where id = contact_record.id;
  update public.emergency_access_grants set revoked_at = timezone('utc', now()) where trusted_contact_id = contact_record.id and revoked_at is null;
  insert into public.emergency_access_notifications(owner_id, recipient_user_id, trusted_contact_id, event_type, label)
  values (current_user_id, contact_record.accepted_user_id, contact_record.id, 'CONTACT_REVOKED', contact_record.name);
  if to_regclass('public.audit_events') is not null then
    insert into public.audit_events(user_id, actor_type, actor_id, event_type, metadata)
    values (current_user_id, 'user', current_user_id::text, 'EMERGENCY_CONTACT_REMOVED', jsonb_build_object('trustedContactId', contact_record.id));
  end if;
  return true;
end;
$$;

create or replace function public.get_emergency_document_location(input_grant_id uuid)
returns table(bucket text, path text, title text) language sql stable security definer set search_path = public, auth as $$
  select document.storage_bucket, document.storage_path, grant_row.label
  from public.emergency_access_grants grant_row
  join public.trusted_emergency_contacts contact on contact.id = grant_row.trusted_contact_id
  join public.documents document on document.id::text = grant_row.resource_id and document.user_id = grant_row.owner_id
  where grant_row.id = input_grant_id and grant_row.resource_type = 'DOCUMENT' and grant_row.revoked_at is null
    and contact.status = 'ACTIVE' and contact.accepted_user_id = auth.uid() and document.emergency_visible = true
    and document.storage_path is not null;
$$;

create or replace function public.can_read_emergency_document_storage(object_name text)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.emergency_access_grants grant_row
    join public.trusted_emergency_contacts contact on contact.id = grant_row.trusted_contact_id
    join public.documents document on document.id::text = grant_row.resource_id and document.user_id = grant_row.owner_id
    where document.storage_path = object_name and document.emergency_visible = true and grant_row.resource_type = 'DOCUMENT'
      and grant_row.revoked_at is null and contact.status = 'ACTIVE' and contact.accepted_user_id = auth.uid()
  );
$$;

drop policy if exists "DiaryDock users can read authorized document files" on storage.objects;
create policy "DiaryDock users can read authorized document files" on storage.objects for select to authenticated
using (
  bucket_id = 'diarydock-documents'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.can_read_document_storage(name) or public.can_read_emergency_document_storage(name))
);

revoke all on function public.create_trusted_emergency_contact(text,text,text,text,text) from public;
revoke all on function public.accept_trusted_emergency_invite(text,text) from public;
revoke all on function public.set_emergency_access_grant(uuid,text,text,boolean) from public;
revoke all on function public.revoke_trusted_emergency_contact(uuid) from public;
revoke all on function public.get_emergency_document_location(uuid) from public;
revoke all on function public.can_read_emergency_document_storage(text) from public;
grant execute on function public.create_trusted_emergency_contact(text,text,text,text,text) to authenticated;
grant execute on function public.accept_trusted_emergency_invite(text,text) to authenticated;
grant execute on function public.set_emergency_access_grant(uuid,text,text,boolean) to authenticated;
grant execute on function public.revoke_trusted_emergency_contact(uuid) to authenticated;
grant execute on function public.get_emergency_document_location(uuid) to authenticated;
grant execute on function public.can_read_emergency_document_storage(text) to authenticated;
