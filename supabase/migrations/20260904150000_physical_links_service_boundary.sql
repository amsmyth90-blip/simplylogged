-- Make Physical Links mutations versioned and available only through the server boundary.
create table if not exists public.physical_link_revisions (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.physical_link_revisions enable row level security;
drop policy if exists physical_link_revisions_owner_read on public.physical_link_revisions;
create policy physical_link_revisions_owner_read on public.physical_link_revisions
for select to authenticated using (owner_id = auth.uid());
grant select on public.physical_link_revisions to authenticated;
revoke insert, update, delete on public.physical_link_revisions from authenticated;

create or replace function public.apply_physical_links_mutation(
  input_user_id uuid,
  input_expected_revision bigint,
  input_mutation jsonb,
  input_public_id text default null,
  input_secret_hash text default null
)
returns table(status text, entity_id uuid, revision bigint)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_revision bigint;
  operation text;
  action text;
  target_id uuid;
  old_link public.physical_links%rowtype;
  target_household_id uuid;
  affected integer;
  raw_serial text;
  clean_serial text;
  expiry timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  if input_user_id is null
    or not exists (select 1 from auth.users where id = input_user_id) then
    raise exception 'Invalid account';
  end if;
  if input_mutation is null or jsonb_typeof(input_mutation) <> 'object'
    or pg_column_size(input_mutation) > 16384 then
    raise exception 'Invalid Physical Links update';
  end if;
  insert into public.physical_link_revisions(owner_id)
  values (input_user_id) on conflict (owner_id) do nothing;
  select item.revision into current_revision
  from public.physical_link_revisions item
  where item.owner_id = input_user_id for update;
  if input_expected_revision is distinct from current_revision then
    return query select 'CONFLICT'::text, null::uuid, current_revision;
    return;
  end if;

  operation := input_mutation->>'operation';
  if operation = 'CREATE_ASSET' then
    if (select count(*) from public.assets where owner_id = input_user_id) >= 200 then
      return query select 'CAPACITY'::text, null::uuid, current_revision;
      return;
    end if;
    select household_id into target_household_id
    from public.household_memberships membership
    where membership.user_id = input_user_id and membership.status = 'active'
    order by membership.created_at limit 1;
    raw_serial := coalesce(input_mutation->'asset'->>'serialNumber', '');
    clean_serial := regexp_replace(raw_serial, '[^A-Za-z0-9]', '', 'g');
    insert into public.assets(
      owner_id, household_id, name, category, location, manufacturer, model,
      serial_number_masked, warranty_due_at, next_service_at, maintenance_notes
    ) values (
      input_user_id, target_household_id, trim(input_mutation->'asset'->>'name'),
      input_mutation->'asset'->>'category', coalesce(input_mutation->'asset'->>'location', ''),
      coalesce(input_mutation->'asset'->>'manufacturer', ''),
      coalesce(input_mutation->'asset'->>'model', ''),
      case when clean_serial = '' then '' else '•••• ' || right(clean_serial, 4) end,
      case when input_mutation->'asset'->>'warrantyDueAt' is null then null
        else ((input_mutation->'asset'->>'warrantyDueAt') || 'T09:00:00.000Z')::timestamptz end,
      case when input_mutation->'asset'->>'nextServiceAt' is null then null
        else ((input_mutation->'asset'->>'nextServiceAt') || 'T09:00:00.000Z')::timestamptz end,
      coalesce(input_mutation->'asset'->>'maintenanceNotes', '')
    ) returning id into target_id;
  elsif operation = 'CREATE_LINK' then
    if (select count(*) from public.physical_links where owner_id = input_user_id) >= 400 then
      return query select 'CAPACITY'::text, null::uuid, current_revision;
      return;
    end if;
    select household_id into target_household_id from public.assets
    where id = (input_mutation->>'assetId')::uuid and owner_id = input_user_id;
    if not found then
      return query select 'INVALID_REFERENCE'::text, null::uuid, current_revision;
      return;
    end if;
    if input_public_id !~ '^[A-Za-z0-9_-]{20,64}$'
      or input_secret_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'Invalid link verifier';
    end if;
    expiry := case when input_mutation->>'expiresAt' is null then null
      else ((input_mutation->>'expiresAt') || 'T23:59:59.000Z')::timestamptz end;
    insert into public.physical_links(
      owner_id, household_id, name, public_id, secret_hash, resource_id, expires_at
    ) values (
      input_user_id, target_household_id, trim(input_mutation->>'name'), input_public_id,
      input_secret_hash, (input_mutation->>'assetId')::uuid, expiry
    ) returning id into target_id;
  elsif operation = 'REPLACE_LINK' then
    if (select count(*) from public.physical_links where owner_id = input_user_id) >= 400 then
      return query select 'CAPACITY'::text, null::uuid, current_revision;
      return;
    end if;
    select * into old_link from public.physical_links item
    where item.id = (input_mutation->>'linkId')::uuid and item.owner_id = input_user_id
      and item.status in ('ACTIVE', 'DISABLED') for update;
    if old_link.id is null then
      return query select 'NOT_FOUND'::text, null::uuid, current_revision;
      return;
    end if;
    if input_public_id !~ '^[A-Za-z0-9_-]{20,64}$'
      or input_secret_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'Invalid link verifier';
    end if;
    insert into public.physical_links(
      owner_id, household_id, name, public_id, secret_hash, resource_id,
      replacement_of, expires_at
    ) values (
      input_user_id, old_link.household_id, old_link.name, input_public_id,
      input_secret_hash, old_link.resource_id, old_link.id, old_link.expires_at
    ) returning id into target_id;
    update public.physical_links item set status = 'REPLACED', replaced_by = target_id
    where item.id = old_link.id;
  elsif operation = 'MANAGE_LINK' then
    action := input_mutation->>'action';
    target_id := (input_mutation->>'linkId')::uuid;
    if action = 'REASSIGN' then
      select household_id into target_household_id from public.assets
      where id = (input_mutation->>'value')::uuid and owner_id = input_user_id;
      if not found then
        return query select 'INVALID_REFERENCE'::text, null::uuid, current_revision;
        return;
      end if;
      update public.physical_links item set resource_id = (input_mutation->>'value')::uuid,
        household_id = target_household_id
      where item.id = target_id and item.owner_id = input_user_id
        and item.status in ('ACTIVE', 'DISABLED');
    elsif action = 'RENAME' then
      update public.physical_links item set name = trim(input_mutation->>'value')
      where item.id = target_id and item.owner_id = input_user_id and item.status <> 'REPLACED';
    elsif action = 'DISABLE' then
      update public.physical_links item set status = 'DISABLED'
      where item.id = target_id and item.owner_id = input_user_id and item.status = 'ACTIVE';
    elsif action = 'ENABLE' then
      update public.physical_links item set status = 'ACTIVE'
      where item.id = target_id and item.owner_id = input_user_id and item.status = 'DISABLED'
        and (item.expires_at is null or item.expires_at > now());
    elsif action = 'REVOKE' then
      update public.physical_links item set status = 'REVOKED'
      where item.id = target_id and item.owner_id = input_user_id
        and item.status in ('ACTIVE', 'DISABLED');
    else
      raise exception 'Unsupported link action';
    end if;
    get diagnostics affected = row_count;
    if affected <> 1 then
      return query select 'NOT_FOUND'::text, null::uuid, current_revision;
      return;
    end if;
  else
    raise exception 'Unsupported Physical Links operation';
  end if;

  update public.physical_link_revisions item
  set revision = item.revision + 1, updated_at = timezone('utc', now())
  where owner_id = input_user_id returning item.revision into current_revision;
  return query select 'OK'::text, target_id, current_revision;
end;
$$;

revoke insert, update, delete on public.assets from authenticated;
revoke all on function public.create_asset_physical_link(uuid,text,text,text,timestamptz)
from authenticated;
revoke all on function public.manage_asset_physical_link(uuid,text,text) from authenticated;
revoke all on function public.replace_asset_physical_link(uuid,text,text) from authenticated;
revoke all on function public.apply_physical_links_mutation(uuid,bigint,jsonb,text,text)
from public, anon, authenticated;
grant execute on function public.apply_physical_links_mutation(uuid,bigint,jsonb,text,text)
to service_role;
