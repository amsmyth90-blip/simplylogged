-- Preserve existing schedules while allowing each account to choose its own times.
alter table public.recap_preferences
  add column daily_time time not null default '08:00',
  add column weekly_time time not null default '20:00',
  add constraint recap_daily_minutes check(daily_time < time '24:00' and extract(second from daily_time)=0),
  add constraint recap_weekly_minutes check(weekly_time < time '24:00' and extract(second from weekly_time)=0);
alter table public.recap_notifications add column scheduled_time time;
create or replace function public.claim_recap_notifications() returns setof public.recap_notifications
language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Service role required'; end if;
  insert into public.recap_notifications(user_id,device_id,kind,local_date,time_zone,scheduled_time,due_at,expires_at)
  select p.user_id,d.id,k.kind,dates.local_date,p.time_zone,k.at_time,due.instant,due.instant+interval '2 hours'
  from public.recap_preferences p join public.appointment_devices d on d.user_id=p.user_id
  cross join lateral (values ('daily',p.daily_time),('weekly',p.weekly_time)) k(kind,at_time)
  cross join lateral (values ((now() at time zone p.time_zone)::date),
    ((now() at time zone p.time_zone)::date-1)) dates(local_date)
  cross join lateral (select (dates.local_date+k.at_time) at time zone p.time_zone as instant) due
  where p.push and d.updated_at > now()-interval '90 days'
    and ((k.kind='daily' and p.daily) or (k.kind='weekly' and p.weekly and extract(isodow from dates.local_date)=7))
    and now() >= due.instant and now() < due.instant+interval '2 hours'
    and p.updated_at <= due.instant
  on conflict(user_id,device_id,kind,local_date) do nothing;
  update public.recap_notifications n set status='cancelled',lease_until=null
    where n.status in ('pending','sending') and (n.expires_at <= now() or not exists(
      select 1 from public.recap_preferences p where p.user_id=n.user_id and p.push
      and p.time_zone=n.time_zone and case when n.kind='daily' then p.daily else p.weekly end
      and coalesce(n.scheduled_time,case when n.kind='weekly' then time '20:00' else time '08:00' end)=case when n.kind='daily' then p.daily_time else p.weekly_time end));
  update public.recap_notifications set status='failed',lease_until=null
    where status='sending' and lease_until < now() and attempts>=8;
  delete from public.recap_notifications where expires_at < now()-interval '30 days';
  return query update public.recap_notifications set status='sending',attempts=attempts+1,lease_until=now()+interval '5 minutes'
    where id in(select id from public.recap_notifications where due_at<=now() and expires_at>now() and attempts<8
      and (status='pending' or (status='sending' and lease_until<now()))
      order by due_at for update skip locked limit 20) returning *;
end;
$$;
