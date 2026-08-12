create table if not exists public.app_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_app_state_updated_at()
returns trigger
language plpgsql
as $$a
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists app_state_set_updated_at on public.app_state;
create trigger app_state_set_updated_at
before update on public.app_state
for each row
execute function public.touch_app_state_updated_at();

revoke all on table public.app_state from anon;
grant usage on schema public to authenticated;
grant select, insert, update on table public.app_state to authenticated;

alter table public.app_state enable row level security;

drop policy if exists "DiaryDock app state access" on public.app_state;
create policy "DiaryDock app state access"
on public.app_state
for all
to authenticated
using (id = (select auth.uid()::text))
with check (id = (select auth.uid()::text));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lifedock-documents',
  'lifedock-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "LifeDock users can read own document files" on storage.objects;
create policy "LifeDock users can read own document files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lifedock-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "LifeDock users can upload own document files" on storage.objects;
create policy "LifeDock users can upload own document files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lifedock-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "LifeDock users can update own document files" on storage.objects;
create policy "LifeDock users can update own document files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lifedock-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'lifedock-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "LifeDock users can delete own document files" on storage.objects;
create policy "LifeDock users can delete own document files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lifedock-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create table if not exists public.documents (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text not null,
  category text not null,
  kind text not null,
  size_label text not null,
  room_id text,
  room_name text,
  issuer text,
  due_date text,
  storage_bucket text,
  storage_path text,
  original_file_name text,
  mime_type text,
  extraction_summary text,
  extracted_text text,
  action_items jsonb not null default '[]'::jsonb,
  confidence numeric,
  review_status text not null default 'reviewed',
  review_reasons jsonb not null default '[]'::jsonb,
  reviewed_at text,
  emergency_visible boolean not null default false,
  shared_with jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.documents add column if not exists user_id uuid not null default auth.uid();
alter table public.documents add column if not exists title text not null default 'Untitled document';
alter table public.documents add column if not exists category text not null default 'Identity';
alter table public.documents add column if not exists kind text not null default 'Scan';
alter table public.documents add column if not exists size_label text not null default 'Pending upload';
alter table public.documents add column if not exists room_id text;
alter table public.documents add column if not exists room_name text;
alter table public.documents add column if not exists issuer text;
alter table public.documents add column if not exists due_date text;
alter table public.documents add column if not exists storage_bucket text;
alter table public.documents add column if not exists storage_path text;
alter table public.documents add column if not exists original_file_name text;
alter table public.documents add column if not exists mime_type text;
alter table public.documents add column if not exists extraction_summary text;
alter table public.documents add column if not exists extracted_text text;
alter table public.documents add column if not exists action_items jsonb not null default '[]'::jsonb;
alter table public.documents add column if not exists confidence numeric;
alter table public.documents add column if not exists review_status text not null default 'reviewed';
alter table public.documents add column if not exists review_reasons jsonb not null default '[]'::jsonb;
alter table public.documents add column if not exists reviewed_at text;
alter table public.documents add column if not exists emergency_visible boolean not null default false;
alter table public.documents add column if not exists shared_with jsonb not null default '[]'::jsonb;
alter table public.documents add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.documents add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.reminders (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text not null,
  note text,
  room_id text,
  room_name text,
  reminder_group text not null,
  time_label text not null,
  priority text not null,
  repeat text,
  document_id text references public.documents(id) on delete set null,
  document_title text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.reminders add column if not exists user_id uuid not null default auth.uid();
alter table public.reminders add column if not exists title text not null default 'Untitled reminder';
alter table public.reminders add column if not exists note text;
alter table public.reminders add column if not exists room_id text;
alter table public.reminders add column if not exists room_name text;
alter table public.reminders add column if not exists reminder_group text not null default 'today';
alter table public.reminders add column if not exists time_label text not null default 'Today';
alter table public.reminders add column if not exists priority text not null default 'normal';
alter table public.reminders add column if not exists repeat text;
alter table public.reminders add column if not exists document_id text;
alter table public.reminders add column if not exists document_title text;
alter table public.reminders add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.reminders add column if not exists updated_at timestamptz not null default timezone('utc', now());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row
execute function public.touch_updated_at();

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
before update on public.reminders
for each row
execute function public.touch_updated_at();

grant select, insert, update, delete on table public.documents to authenticated;
grant select, insert, update, delete on table public.reminders to authenticated;

alter table public.documents enable row level security;
alter table public.reminders enable row level security;

drop policy if exists "DiaryDock document row access" on public.documents;
create policy "DiaryDock document row access"
on public.documents
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "DiaryDock reminder row access" on public.reminders;
create policy "DiaryDock reminder row access"
on public.reminders
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create index if not exists documents_user_updated_idx on public.documents (user_id, updated_at desc);
create index if not exists documents_user_room_idx on public.documents (user_id, room_id);
create index if not exists documents_user_emergency_idx on public.documents (user_id, emergency_visible);
create index if not exists reminders_user_group_idx on public.reminders (user_id, reminder_group);
create index if not exists reminders_user_document_idx on public.reminders (user_id, document_id);

create table if not exists public.household_members (
  id text primary key,
  user_id uuid not null default auth.uid(),
  name text not null,
  role text not null,
  access text not null,
  access_tone text not null default 'limited',
  note text not null default '',
  initials text not null default '',
  manages jsonb not null default '[]'::jsonb,
  last_active text not null default 'Now',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.household_members add column if not exists user_id uuid not null default auth.uid();
alter table public.household_members add column if not exists name text not null default 'Household member';
alter table public.household_members add column if not exists role text not null default 'Family member';
alter table public.household_members add column if not exists access text not null default 'Limited access';
alter table public.household_members add column if not exists access_tone text not null default 'limited';
alter table public.household_members add column if not exists note text not null default '';
alter table public.household_members add column if not exists initials text not null default '';
alter table public.household_members add column if not exists manages jsonb not null default '[]'::jsonb;
alter table public.household_members add column if not exists last_active text not null default 'Now';
alter table public.household_members add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.household_members add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.family_invites (
  id text primary key,
  user_id uuid not null default auth.uid(),
  name text not null,
  relation text not null,
  access text not null,
  sent_ago text not null default 'Just now',
  initials text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.family_invites add column if not exists user_id uuid not null default auth.uid();
alter table public.family_invites add column if not exists name text not null default 'Invite';
alter table public.family_invites add column if not exists relation text not null default 'Family';
alter table public.family_invites add column if not exists access text not null default 'Viewer - Memories only';
alter table public.family_invites add column if not exists sent_ago text not null default 'Just now';
alter table public.family_invites add column if not exists initials text not null default '';
alter table public.family_invites add column if not exists status text not null default 'pending';
alter table public.family_invites add column if not exists email text;
alter table public.family_invites add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.family_invites add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.document_permissions (
  document_id text not null references public.documents(id) on delete cascade,
  subject_name text not null,
  owner_id uuid not null default auth.uid(),
  access_level text not null default 'view',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (document_id, subject_name)
);

alter table public.document_permissions add column if not exists owner_id uuid not null default auth.uid();
alter table public.document_permissions add column if not exists access_level text not null default 'view';
alter table public.document_permissions add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.document_permissions add column if not exists updated_at timestamptz not null default timezone('utc', now());

drop trigger if exists household_members_set_updated_at on public.household_members;
create trigger household_members_set_updated_at
before update on public.household_members
for each row
execute function public.touch_updated_at();

drop trigger if exists family_invites_set_updated_at on public.family_invites;
create trigger family_invites_set_updated_at
before update on public.family_invites
for each row
execute function public.touch_updated_at();

drop trigger if exists document_permissions_set_updated_at on public.document_permissions;
create trigger document_permissions_set_updated_at
before update on public.document_permissions
for each row
execute function public.touch_updated_at();

grant select, insert, update, delete on table public.household_members to authenticated;
grant select, insert, update, delete on table public.family_invites to authenticated;
grant select, insert, update, delete on table public.document_permissions to authenticated;

alter table public.household_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.document_permissions enable row level security;

drop policy if exists "DiaryDock household member row access" on public.household_members;
create policy "DiaryDock household member row access"
on public.household_members
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "DiaryDock family invite row access" on public.family_invites;
create policy "DiaryDock family invite row access"
on public.family_invites
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "DiaryDock document permission row access" on public.document_permissions;
create policy "DiaryDock document permission row access"
on public.document_permissions
for all
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create index if not exists household_members_user_idx on public.household_members (user_id, updated_at desc);
create index if not exists family_invites_user_idx on public.family_invites (user_id, created_at desc);
create index if not exists document_permissions_owner_idx on public.document_permissions (owner_id, document_id);

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.rate_limit_buckets (
  key_hash text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists rate_limit_buckets_reset_at_idx
on public.rate_limit_buckets (reset_at);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from public;
revoke all on table public.rate_limit_buckets from anon;
revoke all on table public.rate_limit_buckets from authenticated;

create or replace function public.check_rate_limit(
  bucket_key text,
  max_requests integer,
  window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_now timestamptz := now();
  effective_max integer;
  effective_window_seconds integer;
  hashed_key text;
  current_count integer;
  current_reset_at timestamptz;
begin
  if bucket_key is null or length(bucket_key) < 16 then
    raise exception 'bucket_key must be at least 16 characters';
  end if;

  effective_max := greatest(1, least(coalesce(max_requests, 1), 1000));
  effective_window_seconds := greatest(1, least(coalesce(window_seconds, 60), 86400));
  hashed_key := encode(extensions.digest(bucket_key, 'sha256'), 'hex');

  insert into public.rate_limit_buckets (
    key_hash,
    request_count,
    reset_at,
    created_at,
    updated_at
  )
  values (
    hashed_key,
    1,
    v_now + make_interval(secs => effective_window_seconds),
    v_now,
    current_time
  )
  on conflict (key_hash)
  do update set
    request_count = case
      when public.rate_limit_buckets.reset_at <= v_now then 1
      else public.rate_limit_buckets.request_count + 1
    end,
    reset_at = case
      when public.rate_limit_buckets.reset_at <= v_now
        then v_now + make_interval(secs => effective_window_seconds)
      else public.rate_limit_buckets.reset_at
    end,
    updated_at = v_now
  returning request_count, public.rate_limit_buckets.reset_at
  into current_count, current_reset_at;

  delete from public.rate_limit_buckets
  where public.rate_limit_buckets.reset_at < v_now - interval '1 hour'
    and public.rate_limit_buckets.updated_at < v_now - interval '1 hour';

  allowed := current_count <= effective_max;
  remaining := greatest(0, effective_max - current_count);
  retry_after_seconds := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from current_reset_at - v_now))::integer)
  end;
  reset_at := current_reset_at;

  return next;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to anon;
grant execute on function public.check_rate_limit(text, integer, integer) to authenticated;

