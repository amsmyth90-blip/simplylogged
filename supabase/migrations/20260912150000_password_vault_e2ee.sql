create table if not exists public.password_vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version smallint not null default 1 check (schema_version = 1),
  kdf_salt text not null check (char_length(kdf_salt) between 16 and 128),
  kdf_memory_kib integer not null check (kdf_memory_kib between 19456 and 262144),
  kdf_iterations integer not null check (kdf_iterations between 2 and 10),
  kdf_parallelism integer not null check (kdf_parallelism between 1 and 4),
  wrapped_key_nonce text not null check (char_length(wrapped_key_nonce) between 16 and 128),
  wrapped_key_ciphertext text not null check (char_length(wrapped_key_ciphertext) between 32 and 1024),
  revision bigint not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.password_vault_entries (
  user_id uuid not null references public.password_vaults(user_id) on delete cascade,
  id uuid not null,
  schema_version smallint not null default 1 check (schema_version = 1),
  nonce text not null check (char_length(nonce) between 16 and 128),
  ciphertext text not null check (char_length(ciphertext) between 24 and 65536),
  revision bigint not null default 1 check (revision >= 1),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

alter table public.password_vaults enable row level security;
alter table public.password_vaults force row level security;
alter table public.password_vault_entries enable row level security;
alter table public.password_vault_entries force row level security;

revoke all on table public.password_vaults from public, anon, authenticated;
revoke all on table public.password_vault_entries from public, anon, authenticated;
grant select, insert, update, delete on table public.password_vaults to service_role;
grant select, insert, update, delete on table public.password_vault_entries to service_role;

create index if not exists password_vault_entries_user_updated_idx
  on public.password_vault_entries (user_id, updated_at desc);

-- Serialize inserts per vault so concurrent requests cannot exceed the read limit.
create or replace function public.enforce_password_vault_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.password_vaults where user_id = new.user_id for update;
  if (select count(*) from public.password_vault_entries where user_id = new.user_id) >= 500 then
    raise exception 'Password vault capacity reached' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_password_vault_capacity() from public, anon, authenticated;
drop trigger if exists password_vault_capacity on public.password_vault_entries;
create trigger password_vault_capacity before insert on public.password_vault_entries
  for each row execute function public.enforce_password_vault_capacity();

