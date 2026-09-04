create or replace function public.cleanup_sync_idempotency()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare deleted_count bigint;
begin
  with expired as (
    select owner_id, idempotency_key
    from public.sync_idempotency
    where expires_at < timezone('utc', now())
    order by expires_at
    limit 10000
  )
  delete from public.sync_idempotency as stored
  using expired
  where stored.owner_id = expired.owner_id
    and stored.idempotency_key = expired.idempotency_key;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_sync_idempotency() from public, anon, authenticated;
grant execute on function public.cleanup_sync_idempotency() to service_role;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'diarydock-sync-idempotency-cleanup',
  '*/15 * * * *',
  $job$select public.cleanup_sync_idempotency();$job$
);

select cron.schedule(
  'diarydock-cron-history-cleanup',
  '15 3 * * *',
  $job$
    delete from cron.job_run_details
    where end_time < timezone('utc', now()) - interval '14 days';
  $job$
);
