create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  document_type text,
  room_id text not null,
  room_name text not null,
  category text not null,
  provider text,
  policy_number text,
  issue_date date,
  expiry_date date,
  file_path text,
  file_name text,
  mime_type text,
  file_size bigint,
  summary text,
  analysis_source text,
  analysis_confidence numeric,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents add column if not exists document_type text;
alter table public.documents add column if not exists file_name text;
alter table public.documents add column if not exists mime_type text;
alter table public.documents add column if not exists file_size bigint;
alter table public.documents add column if not exists analysis_source text;
alter table public.documents add column if not exists analysis_confidence numeric;
alter table public.documents add column if not exists updated_at timestamptz not null default now();
alter table public.documents drop column if exists file_url;
alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents add constraint documents_status_check check (status in ('new', 'filed', 'archived'));
alter table public.documents drop constraint if exists documents_analysis_source_check;
alter table public.documents add constraint documents_analysis_source_check check (analysis_source is null or analysis_source in ('openai', 'mock', 'manual'));

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  room_id text not null,
  room_name text not null,
  title text not null,
  due_date date,
  priority text not null default 'medium',
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders drop constraint if exists reminders_document_id_fkey;
alter table public.reminders add constraint reminders_document_id_fkey foreign key (document_id) references public.documents(id) on delete set null;
alter table public.reminders add column if not exists completed_at timestamptz;
alter table public.reminders add column if not exists updated_at timestamptz not null default now();
alter table public.reminders drop constraint if exists reminders_priority_check;
alter table public.reminders add constraint reminders_priority_check check (priority in ('low', 'medium', 'high'));

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  relationship text,
  access_level text not null default 'Viewer',
  status text not null default 'invited',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_members add column if not exists relationship text;
alter table public.family_members add column if not exists access_level text;
alter table public.family_members add column if not exists status text not null default 'invited';
alter table public.family_members add column if not exists invited_at timestamptz not null default now();
alter table public.family_members add column if not exists accepted_at timestamptz;
alter table public.family_members add column if not exists updated_at timestamptz not null default now();
update public.family_members
set name = coalesce(name, email, 'Family member')
where name is null;
alter table public.family_members alter column name set not null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'family_members'
      and column_name = 'role'
  ) then
    update public.family_members
    set access_level = case
        when role in ('Owner', 'Admin', 'Member', 'Viewer') then role
        when lower(role) = 'admin' then 'Admin'
        when lower(role) = 'member' then 'Member'
        else coalesce(access_level, 'Viewer')
      end,
      relationship = case
        when relationship is not null then relationship
        when role in ('Owner', 'Admin', 'Member', 'Viewer') then 'Family member'
        else role
      end;
  end if;
end;
$$;

alter table public.family_members alter column access_level set default 'Viewer';
update public.family_members set access_level = 'Viewer' where access_level is null;
alter table public.family_members alter column access_level set not null;
alter table public.family_members drop column if exists role;
alter table public.family_members drop constraint if exists family_members_access_level_check;
alter table public.family_members add constraint family_members_access_level_check check (access_level in ('Owner', 'Admin', 'Member', 'Viewer'));
alter table public.family_members drop constraint if exists family_members_status_check;
alter table public.family_members add constraint family_members_status_check check (status in ('invited', 'active', 'removed'));

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text,
  season text,
  emergency_access_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_name text,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_room_idx on public.documents (user_id, room_id);
create index if not exists documents_user_status_idx on public.documents (user_id, status);
create index if not exists documents_user_created_idx on public.documents (user_id, created_at desc);
create index if not exists reminders_user_due_idx on public.reminders (user_id, due_date);
create index if not exists reminders_user_completed_idx on public.reminders (user_id, completed);
create index if not exists family_members_user_email_idx on public.family_members (user_id, email);
create index if not exists activity_events_user_created_idx on public.activity_events (user_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

drop trigger if exists family_members_set_updated_at on public.family_members;
create trigger family_members_set_updated_at before update on public.family_members
  for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.reminders enable row level security;
alter table public.family_members enable row level security;
alter table public.user_preferences enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "documents_select_own" on public.documents;
drop policy if exists "documents_insert_own" on public.documents;
drop policy if exists "documents_update_own" on public.documents;
drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_select_own" on public.documents for select using (auth.uid() = user_id);
create policy "documents_insert_own" on public.documents for insert with check (auth.uid() = user_id);
create policy "documents_update_own" on public.documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents for delete using (auth.uid() = user_id);

drop policy if exists "reminders_select_own" on public.reminders;
drop policy if exists "reminders_insert_own" on public.reminders;
drop policy if exists "reminders_update_own" on public.reminders;
drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_select_own" on public.reminders for select using (auth.uid() = user_id);
create policy "reminders_insert_own" on public.reminders for insert with check (auth.uid() = user_id);
create policy "reminders_update_own" on public.reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminders_delete_own" on public.reminders for delete using (auth.uid() = user_id);

drop policy if exists "family_members_select_own" on public.family_members;
drop policy if exists "family_members_insert_own" on public.family_members;
drop policy if exists "family_members_update_own" on public.family_members;
drop policy if exists "family_members_delete_own" on public.family_members;
create policy "family_members_select_own" on public.family_members for select using (auth.uid() = user_id);
create policy "family_members_insert_own" on public.family_members for insert with check (auth.uid() = user_id);
create policy "family_members_update_own" on public.family_members for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "family_members_delete_own" on public.family_members for delete using (auth.uid() = user_id);

drop policy if exists "user_preferences_select_own" on public.user_preferences;
drop policy if exists "user_preferences_insert_own" on public.user_preferences;
drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_select_own" on public.user_preferences for select using (auth.uid() = user_id);
create policy "user_preferences_insert_own" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "user_preferences_update_own" on public.user_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "activity_events_select_own" on public.activity_events;
drop policy if exists "activity_events_insert_own" on public.activity_events;
create policy "activity_events_select_own" on public.activity_events for select using (auth.uid() = user_id);
create policy "activity_events_insert_own" on public.activity_events for insert with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

drop policy if exists "document_uploads_select_own" on storage.objects;
drop policy if exists "document_uploads_insert_own" on storage.objects;
drop policy if exists "document_uploads_update_own" on storage.objects;
drop policy if exists "document_uploads_delete_own" on storage.objects;

create policy "document_uploads_select_own"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "document_uploads_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "document_uploads_update_own"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "document_uploads_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
