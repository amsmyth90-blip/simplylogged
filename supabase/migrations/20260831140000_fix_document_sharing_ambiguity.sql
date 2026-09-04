create or replace function public.set_document_sharing(
  target_document_id text,
  new_visibility text,
  selected_user_ids uuid[] default '{}'::uuid[]
)
returns table (
  shared_resource_id uuid,
  visibility text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_household_id uuid;
  resource_id_value uuid;
  clean_selected_user_ids uuid[];
  audit_event_type text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if new_visibility not in ('PRIVATE', 'HOUSEHOLD', 'SELECTED_MEMBERS') then
    raise exception 'Unsupported resource visibility';
  end if;

  if not exists (
    select 1
    from public.documents as document
    where document.id::text = target_document_id
      and document.user_id = current_user_id
  ) then
    raise exception 'Document not found or access denied';
  end if;

  current_household_id := public.ensure_user_household();

  select coalesce(array_agg(distinct selected_user_id), '{}'::uuid[])
    into clean_selected_user_ids
  from unnest(coalesce(selected_user_ids, '{}'::uuid[])) as selected(selected_user_id)
  where selected_user_id <> current_user_id;

  if exists (
    select 1
    from unnest(clean_selected_user_ids) as selected(selected_user_id)
    where not exists (
      select 1
      from public.household_memberships as membership
      where membership.household_id = current_household_id
        and membership.user_id = selected_user_id
        and membership.status = 'active'
    )
  ) then
    raise exception 'Every selected person must be an active member of this household';
  end if;

  if new_visibility = 'SELECTED_MEMBERS' and cardinality(clean_selected_user_ids) = 0 then
    raise exception 'Choose at least one household member';
  end if;

  insert into public.shared_resources (
    owner_id,
    household_id,
    resource_type,
    resource_id,
    visibility
  )
  values (
    current_user_id,
    current_household_id,
    'document',
    target_document_id,
    new_visibility
  )
  on conflict (owner_id, resource_type, resource_id) do update
  set
    household_id = excluded.household_id,
    visibility = excluded.visibility
  returning id into resource_id_value;

  delete from public.resource_permissions as permission
  where permission.shared_resource_id = resource_id_value;

  if new_visibility = 'SELECTED_MEMBERS' then
    insert into public.resource_permissions (
      shared_resource_id,
      subject_user_id,
      can_view,
      can_edit,
      granted_by
    )
    select
      resource_id_value,
      selected_user_id,
      true,
      false,
      current_user_id
    from unnest(clean_selected_user_ids) as selected(selected_user_id);
  end if;

  update public.documents
  set shared_with = '[]'::jsonb
  where id::text = target_document_id
    and user_id = current_user_id;

  audit_event_type := case
    when new_visibility = 'PRIVATE' then 'RESOURCE_UNSHARED'
    else 'RESOURCE_SHARED'
  end;

  if to_regclass('public.audit_events') is not null then
    execute $audit$
      insert into public.audit_events (
        user_id,
        household_id,
        actor_type,
        actor_id,
        event_type,
        metadata
      )
      values ($1, $2, 'user', cast($1 as text), $3, jsonb_build_object(
        'resourceType', 'document',
        'resourceId', $4,
        'visibility', $5,
        'selectedMemberCount', $6
      ))
    $audit$
    using
      current_user_id,
      current_household_id,
      audit_event_type,
      target_document_id,
      new_visibility,
      cardinality(clean_selected_user_ids);
  end if;

  return query select resource_id_value, new_visibility;
end;
$$;

revoke all on function public.set_document_sharing(text, text, uuid[]) from public;
grant execute on function public.set_document_sharing(text, text, uuid[]) to authenticated;
