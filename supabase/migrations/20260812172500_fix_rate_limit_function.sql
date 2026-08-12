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
    v_now
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
