-- Publish an immutable, minimal Home Handover snapshot to one verified email.
create table if not exists public.home_handover_publications (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.home_handover_packs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null check (
    recipient_email = lower(trim(recipient_email))
    and length(recipient_email) between 3 and 254
    and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  published_snapshot jsonb not null check (
    jsonb_typeof(published_snapshot) = 'object'
    and pg_column_size(published_snapshot) <= 262144
  ),
  published_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  check (expires_at > published_at and expires_at <= published_at + interval '30 days')
);

create unique index if not exists home_handover_one_active_publication_idx
on public.home_handover_publications(pack_id) where revoked_at is null;
create index if not exists home_handover_publications_recipient_idx
on public.home_handover_publications(recipient_email, expires_at desc)
where revoked_at is null;
create index if not exists home_handover_publications_owner_idx
on public.home_handover_publications(owner_id, updated_at desc);

alter table public.home_handover_publications enable row level security;
revoke all on public.home_handover_publications from public, anon, authenticated;
grant select on public.home_handover_publications to service_role;

create or replace function public.prepare_account_deletion(input_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  household_record record;
  deleting_email text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  select lower(email) into deleting_email from auth.users where id = input_user_id;
  if deleting_email is null then raise exception 'Invalid account'; end if;
  for household_record in
    select household.id from public.households as household
    where household.owner_id = input_user_id for update
  loop
    if exists (select 1 from public.household_memberships as membership
      where membership.household_id = household_record.id
        and membership.user_id <> input_user_id and membership.status = 'active') then
      raise exception 'Account deletion is paused because this person owns a household with other active members';
    end if;
    delete from public.households where id = household_record.id;
  end loop;
  delete from public.home_handover_publications publication
  where publication.owner_id = input_user_id
    or publication.recipient_email = deleting_email;
  return true;
end;
$$;

revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

create or replace function public.apply_home_handover_publication(
  input_user_id uuid,
  input_expected_revision timestamptz,
  input_mutation jsonb
)
returns table(status text, pack_id uuid, revision timestamptz, publication_id uuid)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  operation text;
  active_pack public.home_handover_packs%rowtype;
  active_publication public.home_handover_publications%rowtype;
  owner_email text;
  recipient text;
  item_count integer;
  shared_snapshot jsonb;
  result_revision timestamptz;
  result_publication_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  select lower(email), last_sign_in_at into owner_email, result_revision
  from auth.users where id = input_user_id;
  if result_revision is null then raise exception 'Invalid account'; end if;
  if result_revision < timezone('utc', now()) - interval '15 minutes' then
    return query select 'RECENT_AUTH_REQUIRED'::text, null::uuid,
      null::timestamptz, null::uuid;
    return;
  end if;
  if input_mutation is null or jsonb_typeof(input_mutation) <> 'object'
    or pg_column_size(input_mutation) > 4096 then
    raise exception 'Invalid Home Handover publication';
  end if;
  operation := input_mutation->>'operation';

  if operation = 'PUBLISH' then
    if input_expected_revision is null
      or not (input_mutation ?& array['operation', 'revision', 'packId', 'recipientEmail'])
      or input_mutation - array['operation', 'revision', 'packId', 'recipientEmail'] <> '{}'::jsonb
      or coalesce(input_mutation->>'packId', '') !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(input_mutation->>'revision', '') = '' then
      raise exception 'Invalid Home Handover publication';
    end if;
    recipient := lower(trim(coalesce(input_mutation->>'recipientEmail', '')));
    if length(recipient) not between 3 and 254
      or recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or recipient = owner_email then
      return query select 'INVALID_RECIPIENT'::text, null::uuid,
        null::timestamptz, null::uuid;
      return;
    end if;
    select * into active_pack from public.home_handover_packs pack
    where pack.id = (input_mutation->>'packId')::uuid and pack.owner_id = input_user_id
      and pack.status = 'DRAFT' for update;
    if active_pack.id is null then
      return query select 'NOT_FOUND'::text, null::uuid, null::timestamptz, null::uuid;
      return;
    end if;
    if input_expected_revision is distinct from active_pack.updated_at
      or (input_mutation->>'revision')::timestamptz is distinct from active_pack.updated_at then
      return query select 'CONFLICT'::text, active_pack.id,
        active_pack.updated_at, null::uuid;
      return;
    end if;
    select count(*)::integer into item_count from public.home_handover_items item
    where item.pack_id = active_pack.id and item.owner_id = input_user_id;
    if item_count < 1 then
      return query select 'EMPTY'::text, active_pack.id, active_pack.updated_at, null::uuid;
      return;
    end if;
    select jsonb_build_object('name', active_pack.name, 'items', jsonb_agg(
      jsonb_build_object(
        'id', item.id,
        'resourceType', item.resource_type,
        'label', left(coalesce(nullif(trim(item.preview_snapshot->>'name'), ''),
          nullif(trim(item.preview_snapshot->>'title'), ''), 'Selected item'), 160),
        'detail', left(concat_ws(' · ', nullif(item.preview_snapshot->>'type', ''),
          nullif(item.preview_snapshot->>'category', ''),
          nullif(item.preview_snapshot->>'location', ''),
          nullif(item.preview_snapshot->>'manufacturer', ''),
          nullif(item.preview_snapshot->>'model', '')), 400)
      ) order by item.added_at, item.id
    )) into shared_snapshot
    from public.home_handover_items item
    where item.pack_id = active_pack.id and item.owner_id = input_user_id;
    if pg_column_size(shared_snapshot) > 262144 then
      return query select 'TOO_LARGE'::text, active_pack.id,
        active_pack.updated_at, null::uuid;
      return;
    end if;
    update public.home_handover_publications publication
    set revoked_at = timezone('utc', now()), updated_at = clock_timestamp()
    where publication.pack_id = active_pack.id and publication.revoked_at is null;
    insert into public.home_handover_publications(
      pack_id, owner_id, recipient_email, published_snapshot, expires_at)
    values (active_pack.id, input_user_id, recipient, shared_snapshot,
      timezone('utc', now()) + interval '30 days')
    returning id into result_publication_id;
    update public.home_handover_packs pack set updated_at = clock_timestamp()
    where pack.id = active_pack.id returning pack.updated_at into result_revision;
    if to_regclass('public.audit_events') is not null then
      insert into public.audit_events(user_id, actor_type, actor_id, event_type, metadata)
      values (input_user_id, 'user', input_user_id::text, 'HOME_HANDOVER_PUBLISHED',
        jsonb_build_object('packId', active_pack.id,
          'publicationId', result_publication_id, 'itemCount', item_count));
    end if;
    return query select 'OK'::text, active_pack.id, result_revision, result_publication_id;
    return;
  end if;

  if operation <> 'REVOKE'
    or input_expected_revision is null
    or not (input_mutation ?& array['operation', 'publicationId', 'publicationRevision'])
    or input_mutation - array['operation', 'publicationId', 'publicationRevision'] <> '{}'::jsonb
    or coalesce(input_mutation->>'publicationId', '') !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid Home Handover revocation';
  end if;
  select * into active_publication from public.home_handover_publications publication
  where publication.id = (input_mutation->>'publicationId')::uuid
    and publication.owner_id = input_user_id and publication.revoked_at is null for update;
  if active_publication.id is null then
    return query select 'NOT_FOUND'::text, null::uuid, null::timestamptz, null::uuid;
    return;
  end if;
  if input_expected_revision is distinct from active_publication.updated_at
    or (input_mutation->>'publicationRevision')::timestamptz
      is distinct from active_publication.updated_at then
    return query select 'CONFLICT'::text, active_publication.pack_id,
      active_publication.updated_at, active_publication.id;
    return;
  end if;
  update public.home_handover_publications publication
  set revoked_at = timezone('utc', now()), updated_at = clock_timestamp()
  where publication.id = active_publication.id;
  update public.home_handover_packs pack set updated_at = clock_timestamp()
  where pack.id = active_publication.pack_id returning pack.updated_at into result_revision;
  if to_regclass('public.audit_events') is not null then
    insert into public.audit_events(user_id, actor_type, actor_id, event_type, metadata)
    values (input_user_id, 'user', input_user_id::text, 'HOME_HANDOVER_REVOKED',
      jsonb_build_object('packId', active_publication.pack_id,
        'publicationId', active_publication.id));
  end if;
  return query select 'OK'::text, active_publication.pack_id,
    result_revision, active_publication.id;
end;
$$;

revoke all on function public.apply_home_handover_publication(uuid,timestamptz,jsonb)
from public, anon, authenticated;
grant execute on function public.apply_home_handover_publication(uuid,timestamptz,jsonb)
to service_role;
