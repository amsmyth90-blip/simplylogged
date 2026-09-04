-- Final Life OS security hardening: authoritative recent authentication,
-- storage-object binding, deletion cascades, trusted rate limiting, and audit integrity.
create or replace function public.require_recent_authentication(max_age_seconds integer default 900)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare current_user_id uuid := auth.uid(); current_session_id uuid; session_created_at timestamptz;
  effective_max_age integer := greatest(60, least(coalesce(max_age_seconds, 900), 3600));
begin if current_user_id is null then raise exception 'Authentication required'; end if; begin
    current_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid; exception when invalid_text_representation then
    current_session_id := null; end; if current_session_id is null then
    raise exception 'Recent authentication required'; end if; select session.created_at into session_created_at
  from auth.sessions as session where session.id = current_session_id and session.user_id = current_user_id;
  if session_created_at is null
    or session_created_at < timezone('utc', now()) - make_interval(secs => effective_max_age) then
    raise exception 'Recent authentication required'; end if;
end;
$$;
revoke all on function public.require_recent_authentication(integer) from public;
revoke all on function public.require_recent_authentication(integer) from anon;
revoke all on function public.require_recent_authentication(integer) from authenticated;
create or replace function public.require_recent_handover_auth()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin perform public.require_recent_authentication(900);
end;
$$;
revoke all on function public.require_recent_handover_auth() from public;
revoke all on function public.require_recent_handover_auth() from anon;
revoke all on function public.require_recent_handover_auth() from authenticated;
-- Preserve the existing, ownership-aware implementations behind recent-auth wrappers.
alter function public.set_document_sharing(text, text, uuid[]) rename to set_document_sharing_without_recent_auth;
revoke all on function public.set_document_sharing_without_recent_auth(text, text, uuid[]) from public, anon, authenticated;
create function public.set_document_sharing( target_document_id text, new_visibility text,
  selected_user_ids uuid[] default '{}'::uuid[]
)
returns table (shared_resource_id uuid, visibility text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin perform public.require_recent_authentication(900); return query
  select result.shared_resource_id, result.visibility from public.set_document_sharing_without_recent_auth(
    target_document_id, new_visibility, selected_user_ids ) as result;
end;
$$;
alter function public.create_household_invite(text, text, text, text) rename to create_household_invite_without_recent_auth;
revoke all on function public.create_household_invite_without_recent_auth(text, text, text, text) from public, anon, authenticated;
create function public.create_household_invite(invite_email text, invite_name text, invite_relation text, invite_access text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900);
  return public.create_household_invite_without_recent_auth(invite_email, invite_name, invite_relation, invite_access);
end;
$$;
alter function public.create_household_role_invite(text, text, text, text) rename to create_household_role_invite_without_recent_auth;
revoke all on function public.create_household_role_invite_without_recent_auth(text, text, text, text) from public, anon, authenticated;
create function public.create_household_role_invite(invite_email text, invite_name text, invite_relation text, invite_role text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900);
  return public.create_household_role_invite_without_recent_auth(invite_email, invite_name, invite_relation, invite_role);
end;
$$;
alter function public.cancel_household_invite(uuid) rename to cancel_household_invite_without_recent_auth;
revoke all on function public.cancel_household_invite_without_recent_auth(uuid) from public, anon, authenticated;
create function public.cancel_household_invite(invite_token uuid)
returns boolean language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900);
  return public.cancel_household_invite_without_recent_auth(invite_token);
end;
$$;
alter function public.renew_household_invite(uuid) rename to renew_household_invite_without_recent_auth;
revoke all on function public.renew_household_invite_without_recent_auth(uuid) from public, anon, authenticated;
create function public.renew_household_invite(invite_token uuid)
returns boolean language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900);
  return public.renew_household_invite_without_recent_auth(invite_token);
end;
$$;
alter function public.update_household_member_role(uuid, text) rename to update_household_member_role_without_recent_auth;
revoke all on function public.update_household_member_role_without_recent_auth(uuid, text) from public, anon, authenticated;
create function public.update_household_member_role(member_user_id uuid, new_role text)
returns boolean language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900);
  return public.update_household_member_role_without_recent_auth(member_user_id, new_role);
end;
$$;
alter function public.remove_household_member(uuid) rename to remove_household_member_without_recent_auth;
revoke all on function public.remove_household_member_without_recent_auth(uuid) from public, anon, authenticated;
create function public.remove_household_member(member_user_id uuid)
returns boolean language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900);
  return public.remove_household_member_without_recent_auth(member_user_id);
end;
$$;
alter function public.rename_household(text) rename to rename_household_without_recent_auth;
revoke all on function public.rename_household_without_recent_auth(text) from public, anon, authenticated;
create function public.rename_household(new_name text)
returns boolean language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900); return public.rename_household_without_recent_auth(new_name);
end;
$$;
alter function public.leave_household() rename to leave_household_without_recent_auth;
revoke all on function public.leave_household_without_recent_auth() from public, anon, authenticated;
create function public.leave_household()
returns uuid language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900); return public.leave_household_without_recent_auth();
end;
$$;
alter function public.create_trusted_emergency_contact(text, text, text, text, text) rename to create_trusted_emergency_contact_without_recent_auth;
revoke all on function public.create_trusted_emergency_contact_without_recent_auth(text, text, text, text, text) from public, anon, authenticated;
create function public.create_trusted_emergency_contact(input_name text, input_email text, input_relation text, input_public_id text, input_secret_hash text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900);
  return public.create_trusted_emergency_contact_without_recent_auth(input_name, input_email, input_relation, input_public_id, input_secret_hash);
end;
$$;
alter function public.set_emergency_access_grant(uuid, text, text, boolean) rename to set_emergency_access_grant_without_recent_auth;
revoke all on function public.set_emergency_access_grant_without_recent_auth(uuid, text, text, boolean) from public, anon, authenticated;
create function public.set_emergency_access_grant(input_contact_id uuid, input_resource_type text, input_resource_id text, input_grant boolean)
returns uuid language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900);
  return public.set_emergency_access_grant_without_recent_auth(input_contact_id, input_resource_type, input_resource_id, input_grant);
end;
$$;
alter function public.revoke_trusted_emergency_contact(uuid) rename to revoke_trusted_emergency_contact_without_recent_auth;
revoke all on function public.revoke_trusted_emergency_contact_without_recent_auth(uuid) from public, anon, authenticated;
create function public.revoke_trusted_emergency_contact(input_contact_id uuid)
returns boolean language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900);
  return public.revoke_trusted_emergency_contact_without_recent_auth(input_contact_id);
end;
$$;
alter function public.request_account_deletion(text, text) rename to request_account_deletion_without_recent_auth;
revoke all on function public.request_account_deletion_without_recent_auth(text, text) from public, anon, authenticated;
create function public.request_account_deletion(request_source text default 'settings', request_user_agent text default '')
returns table (id uuid, status text, requested_at timestamptz, last_requested_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin perform public.require_recent_authentication(900); return query
  select result.id, result.status, result.requested_at, result.last_requested_at
  from public.request_account_deletion_without_recent_auth(request_source, request_user_agent) as result;
end;
$$;
grant execute on function public.set_document_sharing(text, text, uuid[]) to authenticated;
grant execute on function public.create_household_invite(text, text, text, text) to authenticated;
grant execute on function public.create_household_role_invite(text, text, text, text) to authenticated;
grant execute on function public.cancel_household_invite(uuid) to authenticated;
grant execute on function public.renew_household_invite(uuid) to authenticated;
grant execute on function public.update_household_member_role(uuid, text) to authenticated;
grant execute on function public.remove_household_member(uuid) to authenticated;
grant execute on function public.rename_household(text) to authenticated;
grant execute on function public.leave_household() to authenticated;
grant execute on function public.create_trusted_emergency_contact(text, text, text, text, text) to authenticated;
grant execute on function public.set_emergency_access_grant(uuid, text, text, boolean) to authenticated;
grant execute on function public.revoke_trusted_emergency_contact(uuid) to authenticated;
grant execute on function public.request_account_deletion(text, text) to authenticated;
-- A document can authorize only a file beneath its own immutable owner/id prefix.
alter table public.documents add constraint documents_storage_binding_check check (
    (storage_bucket is null and storage_path is null) or ( storage_bucket = 'diarydock-documents'
      and split_part(storage_path, '/', 1) = user_id::text and split_part(storage_path, '/', 2) = id::text
      and split_part(storage_path, '/', 3) <> '' ) ) not valid;
create or replace function public.can_read_document_storage(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$ select exists ( select 1 from public.documents as document where document.storage_bucket = 'diarydock-documents'
      and document.storage_path = object_name and split_part(document.storage_path, '/', 1) = document.user_id::text
      and split_part(document.storage_path, '/', 2) = document.id::text and ( document.user_id = auth.uid()
        or public.can_access_shared_resource('document', document.id::text, document.user_id, 'VIEW') ) );
$$;
revoke all on function public.can_read_document_storage(text) from public;
grant execute on function public.can_read_document_storage(text) to authenticated;
-- Files become readable only after the authenticated server has inspected their bytes.
drop policy if exists "DiaryDock users can upload own document files" on storage.objects;
drop policy if exists "DiaryDock users can update own document files" on storage.objects;
-- User-owned Life OS data must follow the Auth user deletion lifecycle.
alter table public.life_entities add constraint life_entities_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.life_relationships add constraint life_relationships_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.provenance_records add constraint provenance_records_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.life_facts add constraint life_facts_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.life_document_links add constraint life_document_links_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.life_events add constraint life_events_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.life_inbox_items add constraint life_inbox_items_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.permission_grants add constraint permission_grants_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.action_requests add constraint action_requests_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.action_steps add constraint action_steps_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.audit_events add constraint audit_events_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade not valid;
-- Auth deletion must never implicitly dissolve a household that still has other users.
alter table public.households drop constraint if exists households_owner_id_fkey;
alter table public.households add constraint households_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete restrict;
-- Rate limiting is a trusted server primitive, not a public arbitrary-key API.
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
-- Audit completion at a narrow authoritative boundary without allowing forged events.
create unique index if not exists audit_events_action_completed_unique_idx
on public.audit_events (action_request_id, event_type)
where action_request_id is not null and event_type = 'ACTION_COMPLETED';
create or replace function public.record_action_completed(input_action_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare action_record public.action_requests%rowtype;
begin if auth.uid() is null then raise exception 'Authentication required'; end if; select request.* into action_record
  from public.action_requests as request where request.id = input_action_request_id and request.user_id = auth.uid()
    and request.status = 'completed'; if action_record.id is null then
    raise exception 'Completed action not found or access denied'; end if;
  insert into public.audit_events (user_id, actor_type, actor_id, event_type, action_request_id, metadata) values (
    auth.uid(), 'user', auth.uid()::text, 'ACTION_COMPLETED', action_record.id,
    jsonb_build_object('actionType', action_record.action_type) ) on conflict (action_request_id, event_type)
    where action_request_id is not null and event_type = 'ACTION_COMPLETED' do nothing; return true;
end;
$$;
revoke all on function public.record_action_completed(uuid) from public, anon;
grant execute on function public.record_action_completed(uuid) to authenticated;
