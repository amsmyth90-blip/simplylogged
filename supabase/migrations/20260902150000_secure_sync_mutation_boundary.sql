-- Bound sync work at the database boundary and add a server-only entry point.
create table if not exists public.sync_mutation_rate_limits (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  request_count integer not null check (request_count >= 0),
  window_started_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.sync_mutation_rate_limits enable row level security;
alter table public.sync_mutation_rate_limits force row level security;
revoke all on table public.sync_mutation_rate_limits
from public, anon, authenticated, service_role;

create or replace function public.apply_sync_mutations_core(
  target_user_id uuid,
  request_body jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  mutation jsonb;
  result jsonb;
  stored public.sync_idempotency;
  inserted_count integer;
  active_count integer;
  incoming_count integer;
  rate_count integer;
  results jsonb := '[]'::jsonb;
  target_idempotency_key uuid;
  request_time timestamptz := timezone('utc', now());
begin
  if target_user_id is null
    or not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Authentication required';
  end if;
  if not public.is_valid_sync_push_request(request_body) then
    raise exception 'Invalid sync request';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('diarydock-sync:' || target_user_id::text, 0)
  );

  insert into public.sync_mutation_rate_limits (
    owner_id, request_count, window_started_at, updated_at
  ) values (
    target_user_id, 1, request_time, request_time
  ) on conflict (owner_id) do update set
    request_count = case
      when sync_mutation_rate_limits.window_started_at <= request_time - interval '5 minutes'
        then 1
      else sync_mutation_rate_limits.request_count + 1
    end,
    window_started_at = case
      when sync_mutation_rate_limits.window_started_at <= request_time - interval '5 minutes'
        then request_time
      else sync_mutation_rate_limits.window_started_at
    end,
    updated_at = request_time
  returning sync_mutation_rate_limits.request_count into rate_count;

  if rate_count > 120 then
    for mutation in select value from jsonb_array_elements(request_body -> 'mutations') loop
      result := jsonb_build_object(
        'status', 'REJECTED',
        'record', null,
        'errorCode', case
          when mutation ->> 'entityType' in ('document', 'reminder') then 'RETRY_LATER'
          else 'UNSUPPORTED_SCHEMA'
        end,
        'idempotencyKey', mutation ->> 'idempotencyKey'
      );
      results := results || jsonb_build_array(result);
    end loop;
    return jsonb_build_object(
      'apiVersion', '2026-09-01',
      'batchId', request_body ->> 'batchId',
      'results', results
    );
  end if;

  delete from public.sync_idempotency
  where owner_id = target_user_id
    and expires_at <= timezone('utc', now());

  select count(*) into active_count
  from public.sync_idempotency
  where owner_id = target_user_id;
  select count(*) into incoming_count
  from jsonb_array_elements(request_body -> 'mutations') as item
  where item ->> 'entityType' in ('document', 'reminder')
    and not exists (
      select 1 from public.sync_idempotency as existing
      where existing.owner_id = target_user_id
        and existing.idempotency_key = (item ->> 'idempotencyKey')::uuid
    );

  if active_count + incoming_count > 10000 then
    for mutation in select value from jsonb_array_elements(request_body -> 'mutations') loop
      result := jsonb_build_object(
        'status', 'REJECTED',
        'record', null,
        'errorCode', case
          when mutation ->> 'entityType' in ('document', 'reminder') then 'RETRY_LATER'
          else 'UNSUPPORTED_SCHEMA'
        end,
        'idempotencyKey', mutation ->> 'idempotencyKey'
      );
      results := results || jsonb_build_array(result);
    end loop;
    return jsonb_build_object(
      'apiVersion', '2026-09-01',
      'batchId', request_body ->> 'batchId',
      'results', results
    );
  end if;

  for mutation in select value from jsonb_array_elements(request_body -> 'mutations') loop
    target_idempotency_key := (mutation ->> 'idempotencyKey')::uuid;
    if mutation ->> 'entityType' not in ('document', 'reminder') then
      result := jsonb_build_object(
        'status', 'REJECTED', 'record', null, 'errorCode', 'UNSUPPORTED_SCHEMA'
      );
    else
      insert into public.sync_idempotency (
        owner_id, idempotency_key, request_payload
      ) values (
        target_user_id, target_idempotency_key, mutation
      ) on conflict do nothing;
      get diagnostics inserted_count = row_count;

      if inserted_count = 0 then
        select * into stored from public.sync_idempotency
        where owner_id = target_user_id
          and idempotency_key = target_idempotency_key
        for update;
        if stored.request_payload <> mutation or stored.response_payload is null then
          result := jsonb_build_object(
            'status', 'REJECTED', 'record', null, 'errorCode', 'INVALID_MUTATION'
          );
        else
          result := stored.response_payload;
        end if;
      else
        result := case mutation ->> 'entityType'
          when 'reminder' then public.apply_reminder_sync_mutation(target_user_id, mutation)
          when 'document' then public.apply_document_sync_mutation(target_user_id, mutation)
        end;
        update public.sync_idempotency set response_payload = result
        where owner_id = target_user_id
          and idempotency_key = target_idempotency_key;
      end if;
    end if;

    results := results || jsonb_build_array(
      result || jsonb_build_object('idempotencyKey', target_idempotency_key::text)
    );
  end loop;

  return jsonb_build_object(
    'apiVersion', '2026-09-01',
    'batchId', request_body ->> 'batchId',
    'results', results
  );
end;
$$;

revoke all on function public.apply_sync_mutations_core(uuid, jsonb)
from public, anon, authenticated, service_role;

create or replace function public.apply_sync_mutations(request_body jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return public.apply_sync_mutations_core(auth.uid(), request_body);
end;
$$;

revoke all on function public.apply_sync_mutations(jsonb) from public, anon;
grant execute on function public.apply_sync_mutations(jsonb) to authenticated;

create or replace function public.apply_sync_mutations_server(
  input_user_id uuid,
  request_body jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  return public.apply_sync_mutations_core(input_user_id, request_body);
end;
$$;

revoke all on function public.apply_sync_mutations_server(uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.apply_sync_mutations_server(uuid, jsonb)
to service_role;
