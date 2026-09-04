-- Direct private uploads with server-controlled storage entitlements.
-- Files land in an unreadable quarantine bucket and are promoted only after inspection.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diarydock-document-quarantine',
  'diarydock-document-quarantine',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- No authenticated storage policies are created for quarantine. A short-lived,
-- single-path signed upload token is the only client capability.

create table if not exists public.user_storage_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'plus', 'premium')),
  storage_limit_bytes bigint not null default 262144000
    check (storage_limit_bytes between 1048576 and 10737418240),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.document_upload_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null,
  expected_bytes bigint not null check (expected_bytes between 1 and 4194304),
  quarantine_path text not null unique,
  final_path text not null,
  mime_type text not null,
  expires_at timestamptz not null default timezone('utc', now()) + interval '2 hours',
  committed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (not (committed_at is not null and cancelled_at is not null))
);

create index if not exists document_upload_reservations_active_user_idx
on public.document_upload_reservations (user_id, expires_at)
where committed_at is null and cancelled_at is null;

alter table public.user_storage_entitlements enable row level security;
alter table public.document_upload_reservations enable row level security;
revoke all on table public.user_storage_entitlements from public, anon, authenticated;
revoke all on table public.document_upload_reservations from public, anon, authenticated;

create or replace function public.reserve_document_upload(
  input_user_id uuid,
  input_document_id uuid,
  input_safe_name text,
  input_mime_type text,
  input_expected_bytes bigint
)
returns table (
  reservation_id uuid,
  quarantine_path text,
  final_path text,
  used_bytes bigint,
  reserved_bytes bigint,
  storage_limit_bytes bigint
)
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  new_reservation_id uuid := gen_random_uuid();
  current_used_bytes bigint := 0;
  current_reserved_bytes bigint := 0;
  current_storage_limit bigint := 262144000;
  clean_name text := lower(trim(input_safe_name));
  next_quarantine_path text;
  next_final_path text;
begin
  if input_user_id is null or input_document_id is null then
    raise exception 'A user and document are required';
  end if;
  if input_expected_bytes is null or input_expected_bytes < 1 or input_expected_bytes > 4194304 then
    raise exception 'The document size is invalid';
  end if;
  if clean_name = '' or length(clean_name) > 96 or clean_name !~ '^[a-z0-9][a-z0-9.-]*$' or clean_name like '%..%' then
    raise exception 'The document filename is invalid';
  end if;
  if input_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf') then
    raise exception 'The document type is invalid';
  end if;

  -- Serialise quota decisions for this user so simultaneous browser tabs cannot overbook storage.
  perform pg_advisory_xact_lock(hashtextextended(input_user_id::text, 0));

  select entitlement.storage_limit_bytes
    into current_storage_limit
  from public.user_storage_entitlements as entitlement
  where entitlement.user_id = input_user_id;
  current_storage_limit := coalesce(current_storage_limit, 262144000);

  select coalesce(sum(
    case when (object.metadata ->> 'size') ~ '^[0-9]+$'
      then (object.metadata ->> 'size')::bigint else 0 end
  ), 0)
    into current_used_bytes
  from storage.objects as object
  where object.bucket_id = 'diarydock-documents'
    and split_part(object.name, '/', 1) = input_user_id::text;

  select coalesce(sum(reservation.expected_bytes), 0)
    into current_reserved_bytes
  from public.document_upload_reservations as reservation
  where reservation.user_id = input_user_id
    and reservation.committed_at is null
    and reservation.cancelled_at is null
    and reservation.expires_at > timezone('utc', now());

  if current_used_bytes + current_reserved_bytes + input_expected_bytes > current_storage_limit then
    raise exception 'STORAGE_LIMIT_EXCEEDED';
  end if;

  next_quarantine_path := input_user_id::text || '/' || new_reservation_id::text || '/' || input_document_id::text || '/' || clean_name;
  next_final_path := input_user_id::text || '/' || input_document_id::text || '/' || clean_name;

  insert into public.document_upload_reservations (
    id, user_id, document_id, expected_bytes, quarantine_path, final_path, mime_type
  ) values (
    new_reservation_id, input_user_id, input_document_id, input_expected_bytes,
    next_quarantine_path, next_final_path, input_mime_type
  );

  reservation_id := new_reservation_id;
  quarantine_path := next_quarantine_path;
  final_path := next_final_path;
  used_bytes := current_used_bytes;
  reserved_bytes := current_reserved_bytes + input_expected_bytes;
  storage_limit_bytes := current_storage_limit;
  return next;
end;
$$;

create or replace function public.finish_document_upload(
  input_user_id uuid,
  input_reservation_id uuid,
  input_commit boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if input_commit then
    update public.document_upload_reservations
    set committed_at = timezone('utc', now())
    where id = input_reservation_id
      and user_id = input_user_id
      and committed_at is null
      and cancelled_at is null
      and expires_at > timezone('utc', now());
  else
    update public.document_upload_reservations
    set cancelled_at = timezone('utc', now())
    where id = input_reservation_id
      and user_id = input_user_id
      and committed_at is null
      and cancelled_at is null;
  end if;
  return found;
end;
$$;

create or replace function public.cleanup_document_upload_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count integer;
begin
  delete from public.document_upload_reservations
  where (expires_at < timezone('utc', now()) - interval '1 day' and committed_at is null)
     or created_at < timezone('utc', now()) - interval '30 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.get_user_storage_summary(input_user_id uuid)
returns table (tier text, used_bytes bigint, reserved_bytes bigint, storage_limit_bytes bigint)
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    coalesce(entitlement.tier, 'free') as tier,
    coalesce((
      select sum(case when (object.metadata ->> 'size') ~ '^[0-9]+$' then (object.metadata ->> 'size')::bigint else 0 end)
      from storage.objects as object
      where object.bucket_id = 'diarydock-documents'
        and split_part(object.name, '/', 1) = input_user_id::text
    ), 0)::bigint as used_bytes,
    coalesce((
      select sum(reservation.expected_bytes)
      from public.document_upload_reservations as reservation
      where reservation.user_id = input_user_id
        and reservation.committed_at is null
        and reservation.cancelled_at is null
        and reservation.expires_at > timezone('utc', now())
    ), 0)::bigint as reserved_bytes,
    coalesce(entitlement.storage_limit_bytes, 262144000)::bigint as storage_limit_bytes
  from (select 1) as singleton
  left join public.user_storage_entitlements as entitlement
    on entitlement.user_id = input_user_id;
$$;

revoke all on function public.reserve_document_upload(uuid, uuid, text, text, bigint) from public, anon, authenticated;
revoke all on function public.finish_document_upload(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.cleanup_document_upload_reservations() from public, anon, authenticated;
revoke all on function public.get_user_storage_summary(uuid) from public, anon, authenticated;
grant execute on function public.reserve_document_upload(uuid, uuid, text, text, bigint) to service_role;
grant execute on function public.finish_document_upload(uuid, uuid, boolean) to service_role;
grant execute on function public.cleanup_document_upload_reservations() to service_role;
grant execute on function public.get_user_storage_summary(uuid) to service_role;

-- Keep the hot rate-limit operation to one atomic upsert. Cleanup is now a separate,
-- low-frequency maintenance operation instead of a table-wide delete on every request.
create or replace function public.check_rate_limit(
  bucket_key text,
  max_requests integer,
  window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer, reset_at timestamptz)
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
  if bucket_key is null or length(bucket_key) < 16 then raise exception 'bucket_key must be at least 16 characters'; end if;
  effective_max := greatest(1, least(coalesce(max_requests, 1), 1000));
  effective_window_seconds := greatest(1, least(coalesce(window_seconds, 60), 86400));
  hashed_key := encode(extensions.digest(bucket_key, 'sha256'), 'hex');

  insert into public.rate_limit_buckets (key_hash, request_count, reset_at, created_at, updated_at)
  values (hashed_key, 1, v_now + make_interval(secs => effective_window_seconds), v_now, v_now)
  on conflict (key_hash) do update set
    request_count = case when public.rate_limit_buckets.reset_at <= v_now then 1 else public.rate_limit_buckets.request_count + 1 end,
    reset_at = case when public.rate_limit_buckets.reset_at <= v_now then v_now + make_interval(secs => effective_window_seconds) else public.rate_limit_buckets.reset_at end,
    updated_at = v_now
  returning request_count, public.rate_limit_buckets.reset_at into current_count, current_reset_at;

  allowed := current_count <= effective_max;
  remaining := greatest(0, effective_max - current_count);
  retry_after_seconds := case when allowed then 0 else greatest(1, ceil(extract(epoch from current_reset_at - v_now))::integer) end;
  reset_at := current_reset_at;
  return next;
end;
$$;

create or replace function public.cleanup_rate_limit_buckets()
returns integer language plpgsql security definer set search_path = public as $$
declare deleted_count integer;
begin
  delete from public.rate_limit_buckets
  where reset_at < timezone('utc', now()) - interval '1 hour'
    and updated_at < timezone('utc', now()) - interval '1 hour';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.cleanup_rate_limit_buckets() from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.cleanup_rate_limit_buckets() to service_role;
