alter table public.assets add column if not exists handover_eligible boolean not null default false;
alter table public.documents add column if not exists handover_eligible boolean not null default false;

create table if not exists public.home_handover_packs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ARCHIVED')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.home_handover_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.home_handover_packs(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('ASSET', 'DOCUMENT')),
  resource_id text not null,
  preview_snapshot jsonb not null check (jsonb_typeof(preview_snapshot) = 'object'),
  provenance jsonb not null check (jsonb_typeof(provenance) = 'object'),
  added_at timestamptz not null default timezone('utc', now()),
  unique(pack_id, resource_type, resource_id)
);

create index if not exists home_handover_packs_owner_status_idx on public.home_handover_packs(owner_id, status, updated_at desc);
create index if not exists home_handover_items_pack_idx on public.home_handover_items(pack_id, added_at);

drop trigger if exists home_handover_packs_touch_updated_at on public.home_handover_packs;
create trigger home_handover_packs_touch_updated_at before update on public.home_handover_packs
for each row execute function public.touch_updated_at();

alter table public.home_handover_packs enable row level security;
alter table public.home_handover_items enable row level security;

drop policy if exists home_handover_packs_owner_read on public.home_handover_packs;
create policy home_handover_packs_owner_read on public.home_handover_packs for select to authenticated
using (owner_id = auth.uid());
drop policy if exists home_handover_items_owner_read on public.home_handover_items;
create policy home_handover_items_owner_read on public.home_handover_items for select to authenticated
using (owner_id = auth.uid() and exists (
  select 1 from public.home_handover_packs pack where pack.id = pack_id and pack.owner_id = auth.uid()
));

revoke all on public.home_handover_packs, public.home_handover_items from anon, authenticated;
grant select on public.home_handover_packs, public.home_handover_items to authenticated;

create or replace function public.require_recent_handover_auth()
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  signed_in_at timestamptz;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select last_sign_in_at into signed_in_at from auth.users where id = current_user_id;
  if signed_in_at is null or signed_in_at < timezone('utc', now()) - interval '15 minutes' then
    raise exception 'Recent authentication required';
  end if;
end;
$$;

create or replace function public.create_home_handover_pack(input_name text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  new_pack_id uuid;
begin
  perform public.require_recent_handover_auth();
  if length(trim(coalesce(input_name, ''))) not between 1 and 120 then raise exception 'A pack name is required'; end if;
  insert into public.home_handover_packs(owner_id, name)
  values (current_user_id, trim(input_name)) returning id into new_pack_id;
  if to_regclass('public.audit_events') is not null then
    insert into public.audit_events(user_id, actor_type, actor_id, event_type, metadata)
    values (current_user_id, 'user', current_user_id::text, 'HOME_HANDOVER_DRAFT_CREATED', jsonb_build_object('packId', new_pack_id));
  end if;
  return new_pack_id;
end;
$$;

create or replace function public.set_home_handover_item(
  input_pack_id uuid,
  input_resource_type text,
  input_resource_id text,
  input_selected boolean
)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare
  current_user_id uuid := auth.uid();
  pack_record public.home_handover_packs%rowtype;
  asset_record public.assets%rowtype;
  document_record public.documents%rowtype;
  resource_snapshot jsonb;
begin
  perform public.require_recent_handover_auth();
  select * into pack_record from public.home_handover_packs
  where id = input_pack_id and owner_id = current_user_id and status = 'DRAFT' for update;
  if pack_record.id is null then raise exception 'Handover draft not found or access denied'; end if;
  if input_resource_type not in ('ASSET', 'DOCUMENT') then raise exception 'Unsupported handover resource'; end if;

  if not coalesce(input_selected, false) then
    delete from public.home_handover_items
    where pack_id = input_pack_id and owner_id = current_user_id
      and resource_type = input_resource_type and resource_id = input_resource_id;
    if found and to_regclass('public.audit_events') is not null then
      insert into public.audit_events(user_id, actor_type, actor_id, event_type, metadata)
      values (current_user_id, 'user', current_user_id::text, 'HOME_HANDOVER_ITEM_REMOVED',
        jsonb_build_object('packId', input_pack_id, 'resourceType', input_resource_type, 'resourceId', input_resource_id));
    end if;
    return true;
  end if;

  if input_resource_type = 'ASSET' then
    begin
      select * into asset_record from public.assets
      where id = input_resource_id::uuid and owner_id = current_user_id
        and category in ('APPLIANCE', 'BOILER', 'EQUIPMENT');
    exception when invalid_text_representation then
      raise exception 'Eligible item not found or access denied';
    end;
    if asset_record.id is null then raise exception 'Eligible item not found or access denied'; end if;
    resource_snapshot := jsonb_strip_nulls(jsonb_build_object(
      'name', asset_record.name,
      'type', asset_record.category,
      'location', nullif(asset_record.location, ''),
      'manufacturer', nullif(asset_record.manufacturer, ''),
      'model', nullif(asset_record.model, ''),
      'warrantyDueAt', asset_record.warranty_due_at,
      'nextServiceAt', asset_record.next_service_at
    ));
    update public.assets set handover_eligible = true where id = asset_record.id and owner_id = current_user_id;
  else
    select document.* into document_record
    from public.documents document
    where document.id::text = input_resource_id and document.user_id = current_user_id
      and lower(document.category) ~ '(manual|warranty|appliance|property|home)'
      and lower(document.category) !~ '(finance|financial|identity|legal|estate|health|medical|correspondence|insurance|receipt|bill|bank|tax|passport|travel|pet)'
      and exists (
        select 1 from public.assets asset
        where asset.owner_id = current_user_id
          and asset.category in ('APPLIANCE', 'BOILER', 'EQUIPMENT')
          and document.id::text = any(asset.document_ids)
      );
    if document_record.id is null then raise exception 'Eligible property document not found or access denied'; end if;
    resource_snapshot := jsonb_strip_nulls(jsonb_build_object(
      'title', document_record.title,
      'category', document_record.category,
      'kind', document_record.kind,
      'issuer', document_record.issuer
    ));
    update public.documents set handover_eligible = true where id = document_record.id and user_id = current_user_id;
  end if;

  insert into public.home_handover_items(pack_id, owner_id, resource_type, resource_id, preview_snapshot, provenance)
  values (input_pack_id, current_user_id, input_resource_type, input_resource_id, resource_snapshot,
    jsonb_build_object('sourceTable', case when input_resource_type = 'ASSET' then 'assets' else 'documents' end,
      'sourceId', input_resource_id, 'selectedAt', timezone('utc', now())))
  on conflict(pack_id, resource_type, resource_id) do update
    set preview_snapshot = excluded.preview_snapshot, provenance = excluded.provenance, added_at = timezone('utc', now());

  if to_regclass('public.audit_events') is not null then
    insert into public.audit_events(user_id, actor_type, actor_id, event_type, metadata)
    values (current_user_id, 'user', current_user_id::text, 'HOME_HANDOVER_ITEM_ADDED',
      jsonb_build_object('packId', input_pack_id, 'resourceType', input_resource_type, 'resourceId', input_resource_id));
  end if;
  return true;
end;
$$;

revoke all on function public.require_recent_handover_auth() from public;
revoke all on function public.create_home_handover_pack(text) from public;
revoke all on function public.set_home_handover_item(uuid,text,text,boolean) from public;
grant execute on function public.create_home_handover_pack(text) to authenticated;
grant execute on function public.set_home_handover_item(uuid,text,text,boolean) to authenticated;
