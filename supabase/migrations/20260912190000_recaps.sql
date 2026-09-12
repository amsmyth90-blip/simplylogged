create table if not exists public.appointment_devices (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  token text not null check (length(token) between 20 and 4096),
  updated_at timestamptz not null default now(),
  unique(platform, token)
);
alter table public.appointment_devices enable row level security;
alter table public.appointment_devices force row level security;
revoke all on public.appointment_devices from public,anon,authenticated;
grant all on public.appointment_devices to service_role;

-- Account-owned preferences and a minimal notification outbox: no recap contents.
create table public.recap_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily boolean not null default false,
  weekly boolean not null default false,
  push boolean not null default false,
  time_zone text not null default 'Europe/London' check(length(time_zone) <= 64),
  updated_at timestamptz not null default now()
);
alter table public.recap_preferences enable row level security;
alter table public.recap_preferences force row level security;
revoke all on public.recap_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.recap_preferences to authenticated;
grant all on public.recap_preferences to service_role;
create policy recap_owner on public.recap_preferences for all to authenticated
  using(user_id = auth.uid()) with check(user_id = auth.uid());
create function public.validate_recap_zone() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from pg_timezone_names where name = new.time_zone) then
    raise exception 'Invalid time zone';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger recap_zone before insert or update on public.recap_preferences
  for each row execute function public.validate_recap_zone();

create table public.recap_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.appointment_devices(id) on delete cascade,
  kind text not null check(kind in ('daily','weekly')),
  local_date date not null,
  time_zone text not null,
  due_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','sending','sent','cancelled','failed')),
  attempts integer not null default 0,
  lease_until timestamptz,
  sent_at timestamptz,
  unique(user_id,device_id,kind,local_date)
);
alter table public.recap_notifications enable row level security;
alter table public.recap_notifications force row level security;
revoke all on public.recap_notifications from public,anon,authenticated;
grant all on public.recap_notifications to service_role;
create index recap_notifications_due on public.recap_notifications(due_at) where status in ('pending','sending');
create function public.claim_recap_notifications() returns setof public.recap_notifications
language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required'; end if;
  -- Database time is authoritative. Each local date/kind/device can be queued only once.
  insert into public.recap_notifications(user_id,device_id,kind,local_date,time_zone,due_at,expires_at)
  select p.user_id,d.id,k.kind,(now() at time zone p.time_zone)::date,p.time_zone,
    (((now() at time zone p.time_zone)::date + k.at_time) at time zone p.time_zone),
    (((now() at time zone p.time_zone)::date + k.at_time) at time zone p.time_zone) + interval '2 hours'
  from public.recap_preferences p join public.appointment_devices d on d.user_id=p.user_id
  cross join (values ('daily',time '08:00'),('weekly',time '20:00')) k(kind,at_time)
  where p.push and d.updated_at > now()-interval '90 days'
    and ((k.kind='daily' and p.daily) or (k.kind='weekly' and p.weekly
      and extract(isodow from now() at time zone p.time_zone)=7))
    and (now() at time zone p.time_zone)::time >= k.at_time
    and (now() at time zone p.time_zone)::time < k.at_time+interval '2 hours'
    and p.updated_at <= (((now() at time zone p.time_zone)::date + k.at_time) at time zone p.time_zone)
  on conflict(user_id,device_id,kind,local_date) do nothing;
  update public.recap_notifications set status='cancelled',lease_until=null
    where status in ('pending','sending') and expires_at <= now();
  update public.recap_notifications set status='failed',lease_until=null
    where status='sending' and lease_until < now() and attempts>=8;
  delete from public.recap_notifications where expires_at < now()-interval '30 days';
  return query update public.recap_notifications set status='sending',attempts=attempts+1,lease_until=now()+interval '5 minutes'
    where id in(select id from public.recap_notifications where due_at<=now() and expires_at>now() and attempts<8
      and (status='pending' or (status='sending' and lease_until<now()))
      order by due_at for update skip locked limit 20) returning *;
end;
$$;
revoke all on function public.claim_recap_notifications() from public,anon,authenticated;
grant execute on function public.claim_recap_notifications() to service_role;
