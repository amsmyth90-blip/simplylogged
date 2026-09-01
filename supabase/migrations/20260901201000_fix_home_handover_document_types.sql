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

revoke all on function public.set_home_handover_item(uuid,text,text,boolean) from public;
grant execute on function public.set_home_handover_item(uuid,text,text,boolean) to authenticated;
