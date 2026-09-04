create table if not exists public.shared_resources ( id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade, resource_type text not null,
  resource_id text not null, visibility text not null default 'PRIVATE'
    check (visibility in ('PRIVATE', 'HOUSEHOLD', 'SELECTED_MEMBERS')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()), unique (owner_id, resource_type, resource_id),
  check (length(resource_type) between 1 and 64), check (length(resource_id) between 1 and 200)
);
create table if not exists public.resource_permissions ( id uuid primary key default gen_random_uuid(),
  shared_resource_id uuid not null references public.shared_resources(id) on delete cascade,
  subject_user_id uuid not null references auth.users(id) on delete cascade, can_view boolean not null default true,
  can_edit boolean not null default false, granted_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()), revoked_at timestamptz,
  unique (shared_resource_id, subject_user_id)
);
create index if not exists shared_resources_household_visibility_idx
  on public.shared_resources (household_id, visibility, resource_type);
create index if not exists resource_permissions_subject_idx
  on public.resource_permissions (subject_user_id, shared_resource_id) where revoked_at is null;
drop trigger if exists shared_resources_set_updated_at on public.shared_resources;
create trigger shared_resources_set_updated_at
before update on public.shared_resources
for each row execute function public.touch_updated_at();
drop trigger if exists resource_permissions_set_updated_at on public.resource_permissions;
create trigger resource_permissions_set_updated_at
before update on public.resource_permissions
for each row execute function public.touch_updated_at();
create or replace function public.can_access_shared_resource( target_resource_type text, target_resource_id text,
  target_owner_id uuid, requested_action text default 'VIEW'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare current_user_id uuid := auth.uid(); resource_record public.shared_resources%rowtype;
begin if current_user_id is null then return false; end if; if current_user_id = target_owner_id then return true;
  end if; if requested_action not in ('VIEW', 'EDIT') then return false; end if;
  if target_resource_type = 'vault_document' then return false; end if; select resource.* into resource_record
  from public.shared_resources as resource where resource.owner_id = target_owner_id
    and resource.resource_type = target_resource_type and resource.resource_id = target_resource_id limit 1;
  if resource_record.id is null or resource_record.visibility = 'PRIVATE' then return false; end if; if not exists (
    select 1 from public.household_memberships as membership
    where membership.household_id = resource_record.household_id and membership.user_id = current_user_id
      and membership.status = 'active' ) then return false; end if; if not exists ( select 1
    from public.household_memberships as owner_membership
    where owner_membership.household_id = resource_record.household_id and owner_membership.user_id = target_owner_id
      and owner_membership.status = 'active' ) then return false; end if;
  if resource_record.visibility = 'HOUSEHOLD' then return requested_action = 'VIEW'; end if; return exists ( select 1
    from public.resource_permissions as permission where permission.shared_resource_id = resource_record.id
      and permission.subject_user_id = current_user_id and permission.revoked_at is null and case
        when requested_action = 'EDIT' then permission.can_edit else permission.can_view end );
end;
$$;
create or replace function public.can_read_document_storage(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$ select exists ( select 1 from public.documents as document where document.storage_path = object_name and (
        document.user_id = auth.uid()
        or public.can_access_shared_resource('document', document.id::text, document.user_id, 'VIEW') ) );
$$;
create or replace function public.set_document_sharing( target_document_id text, new_visibility text,
  selected_user_ids uuid[] default '{}'::uuid[]
)
returns table ( shared_resource_id uuid, visibility text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare current_user_id uuid := auth.uid(); current_household_id uuid; resource_id_value uuid;
  clean_selected_user_ids uuid[]; audit_event_type text;
begin if current_user_id is null then raise exception 'Authentication required'; end if;
  if new_visibility not in ('PRIVATE', 'HOUSEHOLD', 'SELECTED_MEMBERS') then
    raise exception 'Unsupported resource visibility'; end if; if not exists ( select 1
    from public.documents as document where document.id::text = target_document_id
      and document.user_id = current_user_id ) then raise exception 'Document not found or access denied'; end if;
  current_household_id := public.ensure_user_household();
  select coalesce(array_agg(distinct selected_user_id), '{}'::uuid[]) into clean_selected_user_ids
  from unnest(coalesce(selected_user_ids, '{}'::uuid[])) as selected(selected_user_id)
  where selected_user_id <> current_user_id; if exists ( select 1
    from unnest(clean_selected_user_ids) as selected(selected_user_id) where not exists ( select 1
      from public.household_memberships as membership where membership.household_id = current_household_id
        and membership.user_id = selected_user_id and membership.status = 'active' ) ) then
    raise exception 'Every selected person must be an active member of this household'; end if;
  if new_visibility = 'SELECTED_MEMBERS' and cardinality(clean_selected_user_ids) = 0 then
    raise exception 'Choose at least one household member'; end if; insert into public.shared_resources ( owner_id,
    household_id, resource_type, resource_id, visibility ) values ( current_user_id, current_household_id, 'document',
    target_document_id, new_visibility ) on conflict (owner_id, resource_type, resource_id) do update set
    household_id = excluded.household_id, visibility = excluded.visibility returning id into resource_id_value;
  delete from public.resource_permissions as permission where permission.shared_resource_id = resource_id_value;
  if new_visibility = 'SELECTED_MEMBERS' then insert into public.resource_permissions ( shared_resource_id,
      subject_user_id, can_view, can_edit, granted_by ) select resource_id_value, selected_user_id, true, false,
      current_user_id from unnest(clean_selected_user_ids) as selected(selected_user_id); end if;
  update public.documents set shared_with = '[]'::jsonb where id::text = target_document_id
    and user_id = current_user_id; audit_event_type := case when new_visibility = 'PRIVATE' then 'RESOURCE_UNSHARED'
    else 'RESOURCE_SHARED' end; if to_regclass('public.audit_events') is not null then execute $audit$
      insert into public.audit_events ( user_id, household_id, actor_type, actor_id, event_type, metadata )
      values ($1, $2, 'user', cast($1 as text), $3, jsonb_build_object( 'resourceType', 'document', 'resourceId', $4,
        'visibility', $5, 'selectedMemberCount', $6 )) $audit$ using current_user_id, current_household_id,
      audit_event_type, target_document_id, new_visibility, cardinality(clean_selected_user_ids); end if;
  return query select resource_id_value, new_visibility;
end;
$$;
create or replace function public.get_document_sharing(target_document_id text)
returns table ( visibility text, selected_user_ids uuid[]
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin if auth.uid() is null then raise exception 'Authentication required'; end if; if not exists ( select 1
    from public.documents as document where document.id::text = target_document_id and document.user_id = auth.uid()
  ) then raise exception 'Document not found or access denied'; end if; return query select resource.visibility,
    coalesce( array_agg(permission.subject_user_id)
        filter (where permission.subject_user_id is not null and permission.revoked_at is null), '{}'::uuid[] )
  from public.shared_resources as resource left join public.resource_permissions as permission
    on permission.shared_resource_id = resource.id where resource.owner_id = auth.uid()
    and resource.resource_type = 'document' and resource.resource_id = target_document_id group by resource.visibility;
  if not found then return query select 'PRIVATE'::text, '{}'::uuid[]; end if;
end;
$$;
create or replace function public.remove_document_shared_resource()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin delete from public.shared_resources where owner_id = old.user_id and resource_type = 'document'
    and resource_id = old.id::text; return old;
end;
$$;
drop trigger if exists documents_remove_shared_resource on public.documents;
create trigger documents_remove_shared_resource
after delete on public.documents
for each row execute function public.remove_document_shared_resource();
alter table public.shared_resources enable row level security;
alter table public.resource_permissions enable row level security;
drop policy if exists "Owners and authorized members can read shared resources" on public.shared_resources;
create policy "Owners and authorized members can read shared resources"
on public.shared_resources for select to authenticated
using ( owner_id = auth.uid() or public.can_access_shared_resource(resource_type, resource_id, owner_id, 'VIEW')
);
drop policy if exists "Owners can create shared resources" on public.shared_resources;
drop policy if exists "Owners can update shared resources" on public.shared_resources;
drop policy if exists "Owners can delete shared resources" on public.shared_resources;
drop policy if exists "Grant owners and subjects can read permissions" on public.resource_permissions;
create policy "Grant owners and subjects can read permissions"
on public.resource_permissions for select to authenticated
using ( subject_user_id = auth.uid() or exists ( select 1 from public.shared_resources as resource
    where resource.id = shared_resource_id and resource.owner_id = auth.uid() )
);
drop policy if exists "Resource owners can manage permissions" on public.resource_permissions;
drop policy if exists "DiaryDock document row access" on public.documents;
drop policy if exists "Owners can read documents" on public.documents;
drop policy if exists "Authorized members can read shared documents" on public.documents;
drop policy if exists "Owners can create documents" on public.documents;
drop policy if exists "Owners can update documents" on public.documents;
drop policy if exists "Owners can delete documents" on public.documents;
create policy "Owners can read documents"
on public.documents for select to authenticated
using (user_id = auth.uid());
create policy "Authorized members can read shared documents"
on public.documents for select to authenticated
using (public.can_access_shared_resource('document', id::text, user_id, 'VIEW'));
create policy "Owners can create documents"
on public.documents for insert to authenticated
with check (user_id = auth.uid());
create policy "Owners can update documents"
on public.documents for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy "Owners can delete documents"
on public.documents for delete to authenticated
using (user_id = auth.uid());
drop policy if exists "DiaryDock users can read own document files" on storage.objects;
drop policy if exists "DiaryDock users can read authorized document files" on storage.objects;
create policy "DiaryDock users can read authorized document files"
on storage.objects for select to authenticated
using ( bucket_id = 'diarydock-documents' and ( (storage.foldername(name))[1] = auth.uid()::text
    or public.can_read_document_storage(name) )
);
revoke all on function public.can_access_shared_resource(text, text, uuid, text) from public;
revoke all on function public.can_read_document_storage(text) from public;
revoke all on function public.set_document_sharing(text, text, uuid[]) from public;
revoke all on function public.get_document_sharing(text) from public;
grant execute on function public.can_access_shared_resource(text, text, uuid, text) to authenticated;
grant execute on function public.can_read_document_storage(text) to authenticated;
grant execute on function public.set_document_sharing(text, text, uuid[]) to authenticated;
grant execute on function public.get_document_sharing(text) to authenticated;
revoke insert, update, delete on public.shared_resources from authenticated;
revoke insert, update, delete on public.resource_permissions from authenticated;
grant select on public.shared_resources to authenticated;
grant select on public.resource_permissions to authenticated;
