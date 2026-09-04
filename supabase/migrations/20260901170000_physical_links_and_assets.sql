create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 120),
  category text not null default 'APPLIANCE' check (category in ('APPLIANCE', 'BOILER', 'EQUIPMENT', 'OTHER')),
  location text not null default '',
  manufacturer text not null default '',
  model text not null default '',
  serial_number_masked text not null default '',
  warranty_due_at timestamptz,
  next_service_at timestamptz,
  document_ids text[] not null default '{}',
  service_history jsonb not null default '[]'::jsonb check (jsonb_typeof(service_history) = 'array'),
  maintenance_notes text not null default '',
  visibility text not null default 'PRIVATE' check (visibility in ('PRIVATE', 'HOUSEHOLD', 'SELECTED_MEMBERS')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.physical_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 120),
  public_id text not null unique check (public_id ~ '^[A-Za-z0-9_-]{20,64}$'),
  secret_hash text not null check (secret_hash ~ '^[a-f0-9]{64}$'),
  resource_type text not null default 'asset' check (resource_type = 'asset'),
  resource_id uuid not null references public.assets(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED', 'REVOKED', 'REPLACED')),
  replacement_of uuid references public.physical_links(id) on delete set null,
  replaced_by uuid references public.physical_links(id) on delete set null,
  expires_at timestamptz,
  last_used_at timestamptz,
  last_used_by uuid references auth.users(id) on delete set null,
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists assets_owner_category_idx on public.assets(owner_id, category, created_at desc);
create index if not exists physical_links_owner_status_idx on public.physical_links(owner_id, status, created_at desc);
create index if not exists physical_links_resource_idx on public.physical_links(resource_id, status);

drop trigger if exists assets_touch_updated_at on public.assets;
create trigger assets_touch_updated_at before update on public.assets for each row execute function public.touch_updated_at();
drop trigger if exists physical_links_touch_updated_at on public.physical_links;
create trigger physical_links_touch_updated_at before update on public.physical_links for each row execute function public.touch_updated_at();

create or replace function public.protect_asset_authority()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.owner_id <> old.owner_id or new.household_id is distinct from old.household_id then
    raise exception 'Asset authority cannot be changed directly';
  end if;
  return new;
end;
$$;
drop trigger if exists assets_protect_authority on public.assets;
create trigger assets_protect_authority before update on public.assets for each row execute function public.protect_asset_authority();

alter table public.assets enable row level security;
alter table public.physical_links enable row level security;

drop policy if exists assets_authorized_read on public.assets;
create policy assets_authorized_read on public.assets for select to authenticated
using (owner_id = auth.uid() or public.can_access_shared_resource('asset', id::text, owner_id, 'VIEW'));
drop policy if exists assets_owner_create on public.assets;
create policy assets_owner_create on public.assets for insert to authenticated
with check (owner_id = auth.uid() and (household_id is null or public.household_role(household_id) is not null));
drop policy if exists assets_authorized_update on public.assets;
create policy assets_authorized_update on public.assets for update to authenticated
using (owner_id = auth.uid() or public.can_access_shared_resource('asset', id::text, owner_id, 'EDIT'))
with check (owner_id = auth.uid() or public.can_access_shared_resource('asset', id::text, owner_id, 'EDIT'));
drop policy if exists assets_owner_delete on public.assets;
create policy assets_owner_delete on public.assets for delete to authenticated using (owner_id = auth.uid());

drop policy if exists physical_links_owner_read on public.physical_links;
create policy physical_links_owner_read on public.physical_links for select to authenticated using (owner_id = auth.uid());

grant select, insert, update, delete on public.assets to authenticated;
grant select on public.physical_links to authenticated;
revoke all on public.assets, public.physical_links from anon;
revoke insert, update, delete on public.physical_links from authenticated;

create or replace function public.create_asset_physical_link(
  input_asset_id uuid,
  input_name text,
  input_public_id text,
  input_secret_hash text,
  input_expires_at timestamptz default null
)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  current_household_id uuid;
  new_link_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if input_public_id !~ '^[A-Za-z0-9_-]{20,64}$' or input_secret_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid link verifier'; end if;
  if length(trim(input_name)) not between 1 and 120 then raise exception 'A link name is required'; end if;
  select household_id into current_household_id from public.assets where id = input_asset_id and owner_id = current_user_id;
  if not found then raise exception 'Asset not found or access denied'; end if;
  insert into public.physical_links(owner_id, household_id, name, public_id, secret_hash, resource_id, expires_at)
  values (current_user_id, current_household_id, trim(input_name), input_public_id, input_secret_hash, input_asset_id, input_expires_at)
  returning id into new_link_id;
  return new_link_id;
end;
$$;

create or replace function public.manage_asset_physical_link(input_link_id uuid, input_action text, input_value text default null)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  target_asset_id uuid;
  target_household_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if input_action = 'RENAME' then
    if length(trim(coalesce(input_value, ''))) not between 1 and 120 then raise exception 'A link name is required'; end if;
    update public.physical_links set name = trim(input_value) where id = input_link_id and owner_id = current_user_id and status <> 'REPLACED';
  elsif input_action = 'DISABLE' then
    update public.physical_links set status = 'DISABLED' where id = input_link_id and owner_id = current_user_id and status = 'ACTIVE';
  elsif input_action = 'ENABLE' then
    update public.physical_links set status = 'ACTIVE' where id = input_link_id and owner_id = current_user_id and status = 'DISABLED' and (expires_at is null or expires_at > now());
  elsif input_action = 'REVOKE' then
    update public.physical_links set status = 'REVOKED' where id = input_link_id and owner_id = current_user_id and status in ('ACTIVE', 'DISABLED');
  elsif input_action = 'REASSIGN' then
    begin target_asset_id := input_value::uuid; exception when others then raise exception 'Choose a valid asset'; end;
    select household_id into target_household_id from public.assets where id = target_asset_id and owner_id = current_user_id;
    if not found then raise exception 'Asset not found or access denied'; end if;
    update public.physical_links set resource_id = target_asset_id, household_id = target_household_id where id = input_link_id and owner_id = current_user_id and status in ('ACTIVE', 'DISABLED');
  else
    raise exception 'Unsupported link action';
  end if;
  return found;
end;
$$;

create or replace function public.replace_asset_physical_link(input_link_id uuid, input_public_id text, input_secret_hash text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  old_link public.physical_links%rowtype;
  new_link_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if input_public_id !~ '^[A-Za-z0-9_-]{20,64}$' or input_secret_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid link verifier'; end if;
  select * into old_link from public.physical_links where id = input_link_id and owner_id = current_user_id and status in ('ACTIVE', 'DISABLED') for update;
  if old_link.id is null then raise exception 'Link not found or access denied'; end if;
  insert into public.physical_links(owner_id, household_id, name, public_id, secret_hash, resource_id, replacement_of, expires_at)
  values (current_user_id, old_link.household_id, old_link.name, input_public_id, input_secret_hash, old_link.resource_id, old_link.id, old_link.expires_at)
  returning id into new_link_id;
  update public.physical_links set status = 'REPLACED', replaced_by = new_link_id where id = old_link.id;
  return new_link_id;
end;
$$;

create or replace function public.resolve_asset_physical_link(input_public_id text, input_secret_hash text)
returns table(resource_type text, resource_id uuid)
language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  link_record public.physical_links%rowtype;
begin
  if current_user_id is null then return; end if;
  if input_public_id !~ '^[A-Za-z0-9_-]{20,64}$' or input_secret_hash !~ '^[a-f0-9]{64}$' then return; end if;
  select * into link_record from public.physical_links
  where public_id = input_public_id and secret_hash = input_secret_hash and status = 'ACTIVE'
    and (expires_at is null or expires_at > now())
  limit 1;
  if link_record.id is null then return; end if;
  if not public.can_access_shared_resource(link_record.resource_type, link_record.resource_id::text, link_record.owner_id, 'VIEW') then return; end if;
  update public.physical_links set last_used_at = timezone('utc', now()), last_used_by = current_user_id, use_count = use_count + 1 where id = link_record.id;
  if to_regclass('public.audit_events') is not null then
    insert into public.audit_events(user_id, household_id, actor_type, actor_id, event_type, metadata)
    values (link_record.owner_id, link_record.household_id, 'user', current_user_id::text, 'PHYSICAL_LINK_OPENED', jsonb_build_object('physicalLinkId', link_record.id, 'resourceType', link_record.resource_type, 'resourceId', link_record.resource_id));
  end if;
  return query select link_record.resource_type, link_record.resource_id;
end;
$$;

revoke all on function public.create_asset_physical_link(uuid,text,text,text,timestamptz) from public;
revoke all on function public.manage_asset_physical_link(uuid,text,text) from public;
revoke all on function public.replace_asset_physical_link(uuid,text,text) from public;
revoke all on function public.resolve_asset_physical_link(text,text) from public;
grant execute on function public.create_asset_physical_link(uuid,text,text,text,timestamptz) to authenticated;
grant execute on function public.manage_asset_physical_link(uuid,text,text) to authenticated;
grant execute on function public.replace_asset_physical_link(uuid,text,text) to authenticated;
grant execute on function public.resolve_asset_physical_link(text,text) to authenticated;
