create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null default '',
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'completed', 'cancelled', 'rejected')),
  requested_from text not null default 'settings',
  user_agent text not null default '',
  request_count integer not null default 1 check (request_count >= 1),
  requested_at timestamptz not null default timezone('utc', now()),
  last_requested_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  admin_note text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests (status, last_requested_at desc);

create or replace function public.touch_account_deletion_requests_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists account_deletion_requests_set_updated_at on public.account_deletion_requests;
create trigger account_deletion_requests_set_updated_at
before update on public.account_deletion_requests
for each row execute function public.touch_account_deletion_requests_updated_at();

alter table public.account_deletion_requests enable row level security;

revoke all on table public.account_deletion_requests from public;
revoke all on table public.account_deletion_requests from anon;
revoke all on table public.account_deletion_requests from authenticated;
grant select on table public.account_deletion_requests to authenticated;

drop policy if exists "DiaryDock users can read own deletion requests" on public.account_deletion_requests;
create policy "DiaryDock users can read own deletion requests"
on public.account_deletion_requests
for select
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.request_account_deletion(
  request_source text default 'settings',
  request_user_agent text default ''
)
returns table (
  id uuid,
  status text,
  requested_at timestamptz,
  last_requested_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  return query
  insert into public.account_deletion_requests (
    user_id,
    user_email,
    status,
    requested_from,
    user_agent,
    request_count,
    requested_at,
    last_requested_at
  )
  values (
    current_user_id,
    current_user_email,
    'requested',
    left(coalesce(nullif(trim(request_source), ''), 'settings'), 64),
    left(coalesce(request_user_agent, ''), 512),
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (user_id)
  do update set
    user_email = excluded.user_email,
    status = case
      when public.account_deletion_requests.status in ('completed', 'cancelled', 'rejected')
        then 'requested'
      else public.account_deletion_requests.status
    end,
    requested_from = excluded.requested_from,
    user_agent = excluded.user_agent,
    request_count = public.account_deletion_requests.request_count + 1,
    last_requested_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  returning
    public.account_deletion_requests.id,
    public.account_deletion_requests.status,
    public.account_deletion_requests.requested_at,
    public.account_deletion_requests.last_requested_at;
end;
$$;

revoke all on function public.request_account_deletion(text, text) from public;
grant execute on function public.request_account_deletion(text, text) to authenticated;
