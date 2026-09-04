import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrationNames = [
  "20260901233000_sync_projection_foundation.sql",
  "20260901233100_sync_contract_validation.sql",
  "20260901233200_sync_mutation_rpc.sql",
  "20260901233400_document_sync_projection.sql",
  "20260901233450_document_file_version.sql",
  "20260901233500_document_sync_mutations.sql",
  "20260902150000_secure_sync_mutation_boundary.sql",
  "20260902151000_revoke_legacy_sync_mutations.sql",
  "20260904207000_reminder_service_boundary.sql",
  "20260904208000_document_service_boundary.sql",
  "20260904211000_system_reminder_service_boundary.sql",
  "20260904212000_action_proposal_service_boundary.sql",
  "20260904213000_household_reminder_scope.sql",
  "20260904214000_household_reminder_mutations.sql",
  "20260904215000_preserve_household_reminders_on_deletion.sql",
] as const;

const bootstrapSql = String.raw`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text
  );
  create function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  create function auth.role()
  returns text
  language sql
  stable
  as $$
    select nullif(current_setting('request.jwt.claim.role', true), '');
  $$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;

  create table public.households (
    id uuid primary key,
    owner_id uuid not null references auth.users(id) on delete cascade
  );
  create table public.household_memberships (
    household_id uuid not null references public.households(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('owner','member','viewer')),
    status text not null check (status in ('active','removed')),
    joined_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    primary key(household_id,user_id),
    unique(user_id)
  );
  grant select on public.household_memberships to authenticated;

  create function public.sync_system_reminders(
    text,text,text,timestamptz,text,text,text,text,text,text,integer,integer[]
  ) returns integer language sql as $$ select 0 $$;
  grant execute on function public.sync_system_reminders(
    text,text,text,timestamptz,text,text,text,text,text,text,integer,integer[]
  ) to authenticated;

  create function public.finalize_action_request(uuid,text,boolean)
  returns table(id uuid, status text) language sql as $$
    select null::uuid, null::text where false
  $$;
  grant execute on function public.finalize_action_request(uuid,text,boolean)
  to authenticated;

  create table public.documents (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null default 'Untitled document',
    category text not null default 'Identity',
    kind text not null default 'Scan',
    size_label text not null default 'Pending upload',
    room_id text,
    room_name text,
    issuer text,
    due_date text,
    storage_bucket text,
    storage_path text,
    review_status text not null default 'reviewed',
    reviewed_at text,
    emergency_visible boolean not null default false,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
  );

  create table public.reminders (
    id text primary key,
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
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
    updated_at timestamptz not null default timezone('utc', now()),
    due_at timestamptz,
    source_due_at timestamptz,
    origin text not null default 'USER_CREATED',
    reminder_type text not null default 'custom',
    source_resource_type text,
    source_resource_id text,
    source_date_key text,
    rule_id text,
    rule_version integer,
    dedupe_key text,
    schedule_offset_days integer,
    time_zone text not null default 'Europe/London'
  );

  create table public.action_requests (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    action_type text not null,
    status text not null default 'proposed',
    title text not null,
    proposed_payload jsonb not null default '{}'::jsonb,
    source_document_id text,
    confirmed_at timestamptz,
    completed_at timestamptz,
    cancelled_at timestamptz
  );

  create table public.audit_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    actor_type text not null,
    actor_id text not null,
    event_type text not null,
    action_request_id uuid,
    metadata jsonb not null default '{}'::jsonb
  );

  create table public.home_handover_publications (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    recipient_email text not null
  );

  grant select, insert, update, delete on public.reminders to authenticated;

  create table public.document_permissions (
    document_id text not null references public.documents(id) on delete cascade,
    subject_name text not null,
    owner_id uuid not null references auth.users(id) on delete cascade,
    access_level text not null default 'view',
    primary key (document_id, subject_name)
  );

  grant select, insert, update, delete on public.documents to authenticated;
  grant select, insert, update, delete on public.document_permissions to authenticated;

  create function public.touch_updated_at()
  returns trigger
  language plpgsql
  as $$
  begin
    new.updated_at = timezone('utc', now());
    return new;
  end;
  $$;

  create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.touch_updated_at();

  create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();
`;

async function migrationSql(name: string) {
  return readFile(
    new URL(`../../supabase/migrations/${name}`, import.meta.url),
    "utf8",
  );
}

export async function createSyncDatabase() {
  const database = new PGlite();
  await database.exec(bootstrapSql);
  for (const name of migrationNames) {
    await database.exec(await migrationSql(name));
  }
  return database;
}

export async function setAuthenticatedUser(database: PGlite, userId: string) {
  await database.exec("reset role");
  await database.query(
    "select set_config('request.jwt.claim.sub', $1, false)",
    [userId],
  );
  await database.query("select set_config('request.jwt.claim.role', 'authenticated', false)");
  await database.exec("set role authenticated");
}

export async function setServiceRole(database: PGlite) {
  await database.exec("reset role");
  await database.query("select set_config('request.jwt.claim.role', 'service_role', false)");
  await database.exec("set role service_role");
}

export async function resetDatabaseRole(database: PGlite) {
  await database.exec("reset role");
}
