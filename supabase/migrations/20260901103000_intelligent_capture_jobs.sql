create table if not exists public.capture_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null check (status in ('RECEIVED', 'VALIDATED', 'EXTRACTING', 'NEEDS_REVIEW', 'CONFIRMED', 'REJECTED', 'FAILED')),
  analysis_mode text not null default 'document',
  page_count integer not null check (page_count between 1 and 12),
  detected_mime_types text[] not null default '{}',
  security_scan_status text not null default 'PENDING' check (security_scan_status in ('PENDING', 'PASSED', 'UNAVAILABLE', 'BLOCKED')),
  scanner_name text,
  provider_name text,
  proposed_fields jsonb not null default '{}'::jsonb,
  -- Kept as text because legacy DiaryDock projects use UUID document IDs while fresh installs use text IDs.
  -- The confirmation API verifies document ownership before linking.
  confirmed_document_id text,
  failure_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  confirmed_at timestamptz
);

alter table public.capture_jobs enable row level security;

drop policy if exists capture_jobs_select_own on public.capture_jobs;
create policy capture_jobs_select_own on public.capture_jobs
for select to authenticated using (user_id = auth.uid());

drop policy if exists capture_jobs_insert_own on public.capture_jobs;
create policy capture_jobs_insert_own on public.capture_jobs
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists capture_jobs_update_own on public.capture_jobs;
create policy capture_jobs_update_own on public.capture_jobs
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.capture_jobs from anon;
grant select, insert, update on public.capture_jobs to authenticated;

create or replace function public.touch_capture_job_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists capture_jobs_touch_updated_at on public.capture_jobs;
create trigger capture_jobs_touch_updated_at before update on public.capture_jobs
for each row execute function public.touch_capture_job_updated_at();
