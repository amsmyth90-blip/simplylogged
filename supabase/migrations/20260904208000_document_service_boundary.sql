-- Keep document writes server-controlled and make file deletion recoverable.
create table if not exists public.document_storage_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id text not null,
  storage_bucket text not null,
  storage_path text not null,
  attempts integer not null default 0 check (attempts between 0 and 100),
  next_attempt_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint document_cleanup_bucket check (storage_bucket = 'diarydock-documents'),
  constraint document_cleanup_path_size check (length(storage_path) between 1 and 1024)
);

create index if not exists document_storage_cleanup_due_idx
on public.document_storage_cleanup_jobs(next_attempt_at, id);

alter table public.document_storage_cleanup_jobs enable row level security;
alter table public.document_storage_cleanup_jobs force row level security;
revoke all on public.document_storage_cleanup_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.document_storage_cleanup_jobs to service_role;

create or replace function public.delete_diarydock_document(
  input_user_id uuid,
  input_document_id text
)
returns table (
  status text,
  storage_bucket text,
  storage_path text,
  cleanup_id uuid
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target public.documents;
  queued_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  if input_user_id is null or input_document_id is null
    or length(input_document_id) not between 1 and 128 then
    raise exception 'Invalid document deletion';
  end if;

  select * into target from public.documents
  where id = input_document_id and user_id = input_user_id
  for update;
  if target.id is null then
    return query select 'NOT_FOUND'::text, null::text, null::text, null::uuid;
    return;
  end if;

  if target.storage_bucket is not null or target.storage_path is not null then
    if target.storage_bucket is distinct from 'diarydock-documents'
      or target.storage_path is null
      or target.storage_path not like input_user_id::text || '/' || input_document_id || '/%'
      or array_length(string_to_array(target.storage_path, '/'), 1) <> 3 then
      raise exception 'Invalid document storage reference';
    end if;
    insert into public.document_storage_cleanup_jobs (
      owner_id, document_id, storage_bucket, storage_path
    ) values (
      input_user_id, input_document_id, target.storage_bucket, target.storage_path
    ) returning id into queued_id;
  end if;

  delete from public.documents
  where id = input_document_id and user_id = input_user_id;

  return query select
    'DELETED'::text, target.storage_bucket, target.storage_path, queued_id;
end;
$$;

revoke all on function public.delete_diarydock_document(uuid, text)
from public, anon, authenticated;
grant execute on function public.delete_diarydock_document(uuid, text)
to service_role;

revoke insert, update, delete on table public.documents from authenticated;
revoke insert, update, delete on table public.document_permissions from authenticated;
