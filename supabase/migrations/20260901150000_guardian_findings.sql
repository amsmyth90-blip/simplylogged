create table if not exists public.guardian_findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  dedupe_key text not null,
  type text not null,
  severity text not null check (severity in ('INFO', 'ATTENTION', 'IMPORTANT', 'URGENT')),
  resource_type text not null,
  resource_id text not null,
  title text not null,
  description text not null,
  detected_at timestamptz not null default timezone('utc', now()),
  due_at timestamptz,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SNOOZED', 'DISMISSED', 'RESOLVED')),
  snoozed_until timestamptz,
  dismissed_at timestamptz,
  resolved_at timestamptz,
  rule_version integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, dedupe_key)
);

alter table public.guardian_findings enable row level security;
drop policy if exists guardian_findings_owner_access on public.guardian_findings;
create policy guardian_findings_owner_access on public.guardian_findings for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.guardian_findings from anon;
grant select, insert, update, delete on public.guardian_findings to authenticated;

create index if not exists guardian_findings_user_status_due_idx
on public.guardian_findings(user_id, status, due_at);

create index if not exists guardian_findings_snoozed_until_idx
on public.guardian_findings(snoozed_until) where status = 'SNOOZED';

drop trigger if exists guardian_findings_touch_updated_at on public.guardian_findings;
create trigger guardian_findings_touch_updated_at before update on public.guardian_findings
for each row execute function public.touch_updated_at();
