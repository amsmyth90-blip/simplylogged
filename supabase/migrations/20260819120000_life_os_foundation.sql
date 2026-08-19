create table if not exists public.life_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  household_id uuid,
  entity_type text not null,
  title text not null,
  summary text,
  status text not null default 'active',
  sensitivity text not null default 'standard',
  source_type text not null default 'manual',
  source_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint life_entities_status_check check (status in ('active', 'draft', 'archived', 'deleted')),
  constraint life_entities_sensitivity_check check (sensitivity in ('standard', 'private', 'sensitive', 'highly_sensitive'))
);

create table if not exists public.life_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  household_id uuid,
  source_entity_id uuid not null references public.life_entities(id) on delete cascade,
  target_entity_id uuid not null references public.life_entities(id) on delete cascade,
  relationship_type text not null,
  confidence numeric,
  provenance_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz
);

create table if not exists public.provenance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  source_type text not null,
  source_id text,
  source_label text not null,
  created_by text not null default 'system',
  confidence numeric,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint provenance_records_created_by_check check (created_by in ('user', 'system', 'ai', 'import'))
);

alter table public.life_relationships
  add constraint life_relationships_provenance_id_fkey
  foreign key (provenance_id)
  references public.provenance_records(id)
  on delete set null;

create table if not exists public.life_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  entity_id uuid not null references public.life_entities(id) on delete cascade,
  key text not null,
  value jsonb,
  value_type text not null default 'string',
  status text not null default 'needs_review',
  confidence numeric,
  provenance_id uuid references public.provenance_records(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  confirmed_at timestamptz,
  constraint life_facts_value_type_check check (value_type in ('string', 'number', 'boolean', 'date', 'money', 'json')),
  constraint life_facts_status_check check (status in ('suggested', 'needs_review', 'confirmed', 'rejected', 'stale'))
);

create table if not exists public.life_document_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  document_id text not null references public.documents(id) on delete cascade,
  entity_id uuid not null references public.life_entities(id) on delete cascade,
  relationship_type text not null default 'has_document',
  confidence numeric,
  provenance_id uuid references public.provenance_records(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_id, entity_id, relationship_type)
);

create table if not exists public.life_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  household_id uuid,
  entity_id uuid references public.life_entities(id) on delete cascade,
  document_id text references public.documents(id) on delete set null,
  title text not null,
  event_type text not null default 'custom',
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'upcoming',
  severity text not null default 'medium',
  source_type text not null default 'manual',
  source_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint life_events_status_check check (status in ('upcoming', 'due', 'overdue', 'completed', 'dismissed')),
  constraint life_events_severity_check check (severity in ('low', 'medium', 'high'))
);

create table if not exists public.life_inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  source_type text not null,
  status text not null default 'received',
  title text not null,
  source_label text,
  document_id text references public.documents(id) on delete set null,
  storage_bucket text,
  storage_path text,
  suggested_room text,
  suggested_entity_type text,
  suggested_entity_id uuid references public.life_entities(id) on delete set null,
  confidence numeric,
  review_reasons jsonb not null default '[]'::jsonb,
  fingerprint text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, fingerprint),
  constraint life_inbox_items_status_check check (status in ('received', 'stored', 'classified', 'needs_review', 'confirmed', 'failed'))
);

create table if not exists public.permission_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  household_id uuid,
  subject_type text not null,
  subject_id text not null,
  scope text not null,
  entity_type text,
  entity_id uuid references public.life_entities(id) on delete cascade,
  category text,
  sensitivity_max text,
  allowed_actions text[] not null default '{}',
  denied_actions text[] not null default '{}',
  starts_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint permission_grants_scope_check check (scope in ('read', 'write', 'act', 'share')),
  constraint permission_grants_sensitivity_max_check check (
    sensitivity_max is null or sensitivity_max in ('standard', 'private', 'sensitive', 'highly_sensitive')
  )
);

create table if not exists public.action_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  household_id uuid,
  action_type text not null,
  risk_level text not null,
  status text not null default 'proposed',
  title text not null,
  summary text not null,
  reason text,
  source_entity_id uuid references public.life_entities(id) on delete set null,
  target_entity_id uuid references public.life_entities(id) on delete set null,
  source_document_id text references public.documents(id) on delete set null,
  proposed_payload jsonb not null default '{}'::jsonb,
  requires_confirmation boolean not null default true,
  requested_by text not null default 'system',
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint action_requests_risk_level_check check (risk_level in ('low', 'medium', 'high', 'very_high')),
  constraint action_requests_status_check check (
    status in ('proposed', 'awaiting_permission', 'approved', 'running', 'completed', 'failed', 'cancelled', 'dismissed')
  ),
  constraint action_requests_requested_by_check check (requested_by in ('user', 'ai', 'system'))
);

create table if not exists public.action_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  action_request_id uuid not null references public.action_requests(id) on delete cascade,
  step_name text not null,
  status text not null default 'proposed',
  input_summary text,
  output_summary text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  constraint action_steps_status_check check (
    status in ('proposed', 'awaiting_permission', 'approved', 'running', 'completed', 'failed', 'cancelled', 'dismissed')
  )
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  household_id uuid,
  actor_type text not null default 'user',
  actor_id text,
  event_type text not null,
  entity_id uuid references public.life_entities(id) on delete set null,
  document_id text references public.documents(id) on delete set null,
  action_request_id uuid references public.action_requests(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists life_entities_user_type_idx on public.life_entities(user_id, entity_type);
create index if not exists life_relationships_user_source_idx on public.life_relationships(user_id, source_entity_id);
create index if not exists life_relationships_user_target_idx on public.life_relationships(user_id, target_entity_id);
create index if not exists life_facts_entity_key_idx on public.life_facts(entity_id, key);
create index if not exists life_events_user_starts_idx on public.life_events(user_id, starts_at);
create index if not exists life_inbox_items_user_status_idx on public.life_inbox_items(user_id, status);
create index if not exists action_requests_user_status_idx on public.action_requests(user_id, status);
create index if not exists audit_events_user_created_idx on public.audit_events(user_id, created_at desc);

alter table public.life_entities enable row level security;
alter table public.life_relationships enable row level security;
alter table public.provenance_records enable row level security;
alter table public.life_facts enable row level security;
alter table public.life_document_links enable row level security;
alter table public.life_events enable row level security;
alter table public.life_inbox_items enable row level security;
alter table public.permission_grants enable row level security;
alter table public.action_requests enable row level security;
alter table public.action_steps enable row level security;
alter table public.audit_events enable row level security;

create policy "DiaryDock life entity row access"
on public.life_entities for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "DiaryDock life relationship row access"
on public.life_relationships for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "DiaryDock provenance row access"
on public.provenance_records for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "DiaryDock life fact row access"
on public.life_facts for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "DiaryDock life document link row access"
on public.life_document_links for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "DiaryDock life event row access"
on public.life_events for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "DiaryDock life inbox row access"
on public.life_inbox_items for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "DiaryDock permission grant row access"
on public.permission_grants for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "DiaryDock action request row access"
on public.action_requests for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "DiaryDock action step row access"
on public.action_steps for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "DiaryDock audit event row access"
on public.audit_events for all
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
