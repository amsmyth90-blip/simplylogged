-- Put Home Handover behind one versioned, service-only mutation boundary.
with ranked as (
  select id, row_number() over (partition by owner_id order by updated_at desc, id) as position
  from public.home_handover_packs where status = 'DRAFT'
)
update public.home_handover_packs pack set status = 'ARCHIVED'
from ranked where ranked.id = pack.id and ranked.position > 1;

create unique index if not exists home_handover_one_draft_per_owner_idx
on public.home_handover_packs(owner_id) where status = 'DRAFT';

create or replace function public.apply_home_handover_mutation(
  input_user_id uuid,
  input_expected_revision timestamptz,
  input_mutation jsonb
)
returns table(status text, pack_id uuid, revision timestamptz)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  operation text;
  active_pack public.home_handover_packs%rowtype;
  asset_record public.assets%rowtype;
  document_record public.documents%rowtype;
  resource_snapshot jsonb;
  selected_resource_type text;
  selected_resource_id uuid;
  signed_in_at timestamptz;
  result_revision timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  select last_sign_in_at into signed_in_at from auth.users where id = input_user_id;
  if signed_in_at is null then raise exception 'Invalid account'; end if;
  if signed_in_at < timezone('utc', now()) - interval '15 minutes' then
    return query select 'RECENT_AUTH_REQUIRED'::text, null::uuid, null::timestamptz;
    return;
  end if;
  if input_mutation is null or jsonb_typeof(input_mutation) <> 'object'
    or pg_column_size(input_mutation) > 4096 then
    raise exception 'Invalid Home Handover change';
  end if;

  operation := input_mutation->>'operation';
  if operation = 'CREATE_PACK' then
    if input_expected_revision is not null
      or not (input_mutation ?& array['operation', 'name'])
      or input_mutation - array['operation', 'name'] <> '{}'::jsonb
      or length(trim(coalesce(input_mutation->>'name', ''))) not between 1 and 120 then
      raise exception 'Invalid Home Handover draft';
    end if;
    select * into active_pack from public.home_handover_packs pack
    where pack.owner_id = input_user_id and pack.status = 'DRAFT'
    order by pack.updated_at desc limit 1 for update;
    if active_pack.id is not null then
      return query select 'EXISTS'::text, active_pack.id, active_pack.updated_at;
      return;
    end if;
    begin
      insert into public.home_handover_packs(owner_id, name)
      values (input_user_id, trim(input_mutation->>'name'))
      returning id, updated_at into active_pack.id, result_revision;
    exception when unique_violation then
      select * into active_pack from public.home_handover_packs pack
      where pack.owner_id = input_user_id and pack.status = 'DRAFT'
      order by pack.updated_at desc limit 1;
      return query select 'EXISTS'::text, active_pack.id, active_pack.updated_at;
      return;
    end;
    if to_regclass('public.audit_events') is not null then
      insert into public.audit_events(user_id, actor_type, actor_id, event_type, metadata)
      values (input_user_id, 'user', input_user_id::text, 'HOME_HANDOVER_DRAFT_CREATED',
        jsonb_build_object('packId', active_pack.id));
    end if;
    return query select 'OK'::text, active_pack.id, result_revision;
    return;
  end if;

  if operation <> 'SET_ITEM'
    or not (input_mutation ?& array['operation', 'revision', 'packId', 'resourceType',
      'resourceId', 'selected'])
    or input_mutation - array['operation', 'revision', 'packId', 'resourceType',
      'resourceId', 'selected'] <> '{}'::jsonb
    or jsonb_typeof(input_mutation->'selected') <> 'boolean'
    or coalesce(input_mutation->>'resourceType', '') not in ('ASSET', 'DOCUMENT')
    or coalesce(input_mutation->>'packId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(input_mutation->>'resourceId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid Home Handover item';
  end if;
  select * into active_pack from public.home_handover_packs pack
  where pack.id = (input_mutation->>'packId')::uuid and pack.owner_id = input_user_id
    and pack.status = 'DRAFT' for update;
  if active_pack.id is null then
    return query select 'NOT_FOUND'::text, null::uuid, null::timestamptz;
    return;
  end if;
  if input_expected_revision is distinct from active_pack.updated_at then
    return query select 'CONFLICT'::text, active_pack.id, active_pack.updated_at;
    return;
  end if;
  selected_resource_type := input_mutation->>'resourceType';
  selected_resource_id := (input_mutation->>'resourceId')::uuid;

  if (input_mutation->>'selected')::boolean is false then
    delete from public.home_handover_items item where item.pack_id = active_pack.id
      and item.owner_id = input_user_id and item.resource_type = selected_resource_type
      and item.resource_id = selected_resource_id::text;
  else
    if not exists (select 1 from public.home_handover_items item
      where item.pack_id = active_pack.id and item.resource_type = selected_resource_type
        and item.resource_id = selected_resource_id::text)
      and (select count(*) from public.home_handover_items item
        where item.pack_id = active_pack.id) >= 200 then
      return query select 'CAPACITY'::text, active_pack.id, active_pack.updated_at;
      return;
    end if;
    if selected_resource_type = 'ASSET' then
      select * into asset_record from public.assets asset where asset.id = selected_resource_id
        and asset.owner_id = input_user_id and asset.category in ('APPLIANCE', 'BOILER', 'EQUIPMENT');
      if asset_record.id is null then
        return query select 'INVALID_REFERENCE'::text, active_pack.id, active_pack.updated_at;
        return;
      end if;
      resource_snapshot := jsonb_strip_nulls(jsonb_build_object('name', asset_record.name,
        'type', asset_record.category, 'location', nullif(asset_record.location, ''),
        'manufacturer', nullif(asset_record.manufacturer, ''),
        'model', nullif(asset_record.model, ''), 'warrantyDueAt', asset_record.warranty_due_at,
        'nextServiceAt', asset_record.next_service_at));
      update public.assets set handover_eligible = true
      where id = selected_resource_id and owner_id = input_user_id;
    else
      select document.* into document_record from public.documents document
      where document.id = selected_resource_id and document.user_id = input_user_id
        and lower(document.category) ~ '(manual|warranty|appliance|property|home)'
        and lower(document.category) !~ '(finance|financial|identity|legal|estate|health|medical|correspondence|insurance|receipt|bill|bank|tax|passport|travel|pet)'
        and exists (select 1 from public.assets asset where asset.owner_id = input_user_id
          and asset.category in ('APPLIANCE', 'BOILER', 'EQUIPMENT')
          and document.id::text = any(asset.document_ids));
      if document_record.id is null then
        return query select 'INVALID_REFERENCE'::text, active_pack.id, active_pack.updated_at;
        return;
      end if;
      resource_snapshot := jsonb_strip_nulls(jsonb_build_object('title', document_record.title,
        'category', document_record.category, 'kind', document_record.kind,
        'issuer', document_record.issuer));
      update public.documents set handover_eligible = true
      where id = selected_resource_id and user_id = input_user_id;
    end if;
    insert into public.home_handover_items(pack_id, owner_id, resource_type, resource_id,
      preview_snapshot, provenance)
    values (active_pack.id, input_user_id, selected_resource_type, selected_resource_id::text,
      resource_snapshot,
      jsonb_build_object('sourceTable', case when selected_resource_type = 'ASSET' then 'assets'
        else 'documents' end, 'sourceId', selected_resource_id,
        'selectedAt', timezone('utc', now())))
    on conflict on constraint home_handover_items_pack_id_resource_type_resource_id_key do update set
      preview_snapshot = excluded.preview_snapshot, provenance = excluded.provenance,
      added_at = timezone('utc', now());
  end if;

  update public.home_handover_packs pack set updated_at = clock_timestamp()
  where pack.id = active_pack.id returning pack.updated_at into result_revision;
  if to_regclass('public.audit_events') is not null then
    insert into public.audit_events(user_id, actor_type, actor_id, event_type, metadata)
    values (input_user_id, 'user', input_user_id::text,
      case when (input_mutation->>'selected')::boolean then 'HOME_HANDOVER_ITEM_ADDED'
        else 'HOME_HANDOVER_ITEM_REMOVED' end,
      jsonb_build_object('packId', active_pack.id, 'resourceType', selected_resource_type,
        'resourceId', selected_resource_id));
  end if;
  return query select 'OK'::text, active_pack.id, result_revision;
end;
$$;

revoke select on public.home_handover_packs, public.home_handover_items from authenticated;
revoke all on function public.create_home_handover_pack(text) from authenticated;
revoke all on function public.set_home_handover_item(uuid,text,text,boolean) from authenticated;
revoke all on function public.apply_home_handover_mutation(uuid,timestamptz,jsonb)
from public, anon, authenticated;
grant execute on function public.apply_home_handover_mutation(uuid,timestamptz,jsonb)
to service_role;
