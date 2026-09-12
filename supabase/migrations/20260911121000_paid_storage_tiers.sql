-- Apply only with the paid-plan rollout: unpaid accounts cannot reserve new uploads.
-- Existing documents are retained. Prior premium grants become Family grants.
alter table public.user_storage_entitlements
  drop constraint user_storage_entitlements_tier_check,
  drop constraint user_storage_entitlements_storage_limit_bytes_check,
  alter column tier set default 'none',
  alter column storage_limit_bytes set default 0;

update public.user_storage_entitlements
set tier = case tier when 'free' then 'none' when 'premium' then 'family' else tier end,
    storage_limit_bytes = case tier
      when 'plus' then 26843545600
      when 'premium' then 107374182400
      else 0 end,
    updated_at = timezone('utc', now());

alter table public.user_storage_entitlements
  add constraint user_storage_entitlements_tier_check
    check (tier in ('none', 'starter', 'plus', 'family')),
  add constraint user_storage_entitlements_storage_limit_bytes_check
    check (storage_limit_bytes = case tier
      when 'none' then 0
      when 'starter' then 5368709120
      when 'plus' then 26843545600
      when 'family' then 107374182400 end);

-- For verified billing events or deliberate administrative grants only.
-- 'none' removes upload entitlement without deleting stored documents.
create or replace function public.set_user_storage_plan(input_user_id uuid, input_tier text)
returns void language plpgsql security definer set search_path = public as $$
declare
  plan_bytes bigint;
begin
  plan_bytes := case input_tier
    when 'none' then 0
    when 'starter' then 5368709120
    when 'plus' then 26843545600
    when 'family' then 107374182400
    else null end;
  if plan_bytes is null then raise exception 'Invalid storage plan'; end if;
  perform pg_advisory_xact_lock(hashtextextended(input_user_id::text, 0));
  insert into public.user_storage_entitlements(user_id, tier, storage_limit_bytes)
  values (input_user_id, input_tier, plan_bytes)
  on conflict(user_id) do update
    set tier = excluded.tier, storage_limit_bytes = excluded.storage_limit_bytes,
        updated_at = timezone('utc', now());
end;
$$;
revoke all on function public.set_user_storage_plan(uuid, text) from public, anon, authenticated;
grant execute on function public.set_user_storage_plan(uuid, text) to service_role;
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
  current_storage_limit bigint := 0;
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
  current_storage_limit := coalesce(current_storage_limit, 0);

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

create or replace function public.get_user_storage_summary(input_user_id uuid)
returns table (tier text, used_bytes bigint, reserved_bytes bigint, storage_limit_bytes bigint)
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    coalesce(entitlement.tier, 'none') as tier,
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
    coalesce(entitlement.storage_limit_bytes, 0)::bigint as storage_limit_bytes
  from (select 1) as singleton
  left join public.user_storage_entitlements as entitlement
    on entitlement.user_id = input_user_id;
$$;


