alter table public.action_requests add column if not exists dedupe_key text;
alter table public.action_requests add column if not exists source_capture_job_id uuid references public.capture_jobs(id) on delete set null;

create unique index if not exists action_requests_user_dedupe_idx
on public.action_requests(user_id, dedupe_key);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'life_relationships_confidence_bounds') then
    alter table public.life_relationships add constraint life_relationships_confidence_bounds
      check (confidence is null or (confidence >= 0 and confidence <= 1));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'life_facts_confidence_bounds') then
    alter table public.life_facts add constraint life_facts_confidence_bounds
      check (confidence is null or (confidence >= 0 and confidence <= 1));
  end if;
end;
$$;

create or replace function public.enforce_life_relationship_ownership()
returns trigger language plpgsql set search_path = public as $$
declare
  source_owner uuid;
  target_owner uuid;
begin
  select user_id into source_owner from public.life_entities where id = new.source_entity_id;
  select user_id into target_owner from public.life_entities where id = new.target_entity_id;
  if source_owner is null or target_owner is null or source_owner <> new.user_id or target_owner <> new.user_id then
    raise exception 'Life Graph relationship entities must belong to the authenticated owner';
  end if;
  return new;
end;
$$;

drop trigger if exists life_relationships_enforce_owner on public.life_relationships;
create trigger life_relationships_enforce_owner before insert or update on public.life_relationships
for each row execute function public.enforce_life_relationship_ownership();

create or replace function public.enforce_life_fact_ownership()
returns trigger language plpgsql set search_path = public as $$
declare
  entity_owner uuid;
begin
  select user_id into entity_owner from public.life_entities where id = new.entity_id;
  if entity_owner is null or entity_owner <> new.user_id then
    raise exception 'Life Graph fact entity must belong to the authenticated owner';
  end if;
  return new;
end;
$$;

drop trigger if exists life_facts_enforce_owner on public.life_facts;
create trigger life_facts_enforce_owner before insert or update on public.life_facts
for each row execute function public.enforce_life_fact_ownership();

create or replace function public.enforce_life_document_link_ownership()
returns trigger language plpgsql set search_path = public as $$
declare
  entity_owner uuid;
begin
  select user_id into entity_owner from public.life_entities where id = new.entity_id;
  if entity_owner is null or entity_owner <> new.user_id then
    raise exception 'Life Graph document link entity must belong to the authenticated owner';
  end if;
  return new;
end;
$$;

drop trigger if exists life_document_links_enforce_owner on public.life_document_links;
create trigger life_document_links_enforce_owner before insert or update on public.life_document_links
for each row execute function public.enforce_life_document_link_ownership();

create or replace function public.enforce_action_request_entity_ownership()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.source_entity_id is not null and not exists (
    select 1 from public.life_entities where id = new.source_entity_id and user_id = new.user_id
  ) then
    raise exception 'Action source entity must belong to the authenticated owner';
  end if;
  if new.target_entity_id is not null and not exists (
    select 1 from public.life_entities where id = new.target_entity_id and user_id = new.user_id
  ) then
    raise exception 'Action target entity must belong to the authenticated owner';
  end if;
  return new;
end;
$$;

drop trigger if exists action_requests_enforce_entity_owner on public.action_requests;
create trigger action_requests_enforce_entity_owner before insert or update on public.action_requests
for each row execute function public.enforce_action_request_entity_ownership();
