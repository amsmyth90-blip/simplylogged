-- Replace the legacy shared JSON reminder ownership with an explicit database scope.
alter table public.reminders add column if not exists scope_kind text;
alter table public.reminders add column if not exists scope_id uuid;

update public.reminders as reminder
set scope_kind = case when exists (
      select 1 from public.household_memberships as member
      where member.user_id = reminder.user_id and member.status = 'active'
    ) then 'HOUSEHOLD' else 'USER' end,
    scope_id = coalesce((
      select member.household_id from public.household_memberships as member
      where member.user_id = reminder.user_id and member.status = 'active'
      limit 1
    ), reminder.user_id)
where reminder.scope_kind is null or reminder.scope_id is null;

update public.reminders
set scope_kind = 'USER', scope_id = user_id
where scope_kind is null or scope_id is null;

alter table public.reminders alter column scope_kind set not null;
alter table public.reminders alter column scope_id set not null;

alter table public.reminders
  drop constraint if exists reminders_scope_kind_check;
alter table public.reminders
  add constraint reminders_scope_kind_check
  check (scope_kind in ('USER','HOUSEHOLD'));
alter table public.reminders
  drop constraint if exists reminders_scope_identity_check;
alter table public.reminders
  add constraint reminders_scope_identity_check
  check (scope_kind = 'HOUSEHOLD' or scope_id = user_id);

create index if not exists reminders_household_created_idx
on public.reminders(scope_id, created_at desc, id desc)
where scope_kind = 'HOUSEHOLD';

create or replace function public.assign_reminder_scope()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  membership public.household_memberships%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      if auth.role() is distinct from 'service_role'
        or old.scope_kind <> 'HOUSEHOLD'
        or new.scope_kind is distinct from old.scope_kind
        or new.scope_id is distinct from old.scope_id
        or not exists (
          select 1 from public.household_memberships as member
          where member.household_id = old.scope_id
            and member.user_id = new.user_id and member.status = 'active'
            and member.role in ('owner','member')
        ) then
        raise exception 'Reminder owner transfer is forbidden';
      end if;
      return new;
    end if;
    if new.scope_kind is distinct from old.scope_kind
      or new.scope_id is distinct from old.scope_id then
      if old.scope_kind <> 'USER' or old.scope_id is distinct from old.user_id
        or new.scope_kind <> 'HOUSEHOLD'
        or not exists (
          select 1 from public.household_memberships as member
          where member.household_id = new.scope_id
            and member.user_id = new.user_id and member.status = 'active'
            and member.role in ('owner','member')
        ) then
        raise exception 'Reminder scope is immutable';
      end if;
    end if;
    return new;
  end if;
  if new.scope_kind is null and new.scope_id is null then
    select member.* into membership
    from public.household_memberships as member
    where member.user_id = new.user_id and member.status = 'active'
    limit 1;
    if membership.household_id is null then
      new.scope_kind := 'USER';
      new.scope_id := new.user_id;
    else
      new.scope_kind := 'HOUSEHOLD';
      new.scope_id := membership.household_id;
    end if;
  elsif new.scope_kind is null or new.scope_id is null then
    raise exception 'Reminder scope is incomplete';
  end if;
  if new.scope_kind = 'USER' and new.scope_id is distinct from new.user_id then
    raise exception 'Invalid private reminder scope';
  end if;
  if new.scope_kind = 'HOUSEHOLD' and not exists (
    select 1 from public.household_memberships as member
    where member.household_id = new.scope_id
      and member.user_id = new.user_id and member.status = 'active'
  ) then
    raise exception 'Invalid household reminder scope';
  end if;
  return new;
end;
$$;

revoke all on function public.assign_reminder_scope()
from public, anon, authenticated, service_role;
drop trigger if exists reminders_assign_scope on public.reminders;
create trigger reminders_assign_scope
before insert or update on public.reminders
for each row execute function public.assign_reminder_scope();

create or replace function public.refresh_reminder_membership_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status <> 'active' and new.status = 'active' then
    new.joined_at := timezone('utc', now());
  end if;
  return new;
end;
$$;

revoke all on function public.refresh_reminder_membership_scope()
from public, anon, authenticated, service_role;
drop trigger if exists household_membership_refresh_joined_at
on public.household_memberships;
create trigger household_membership_refresh_joined_at
before update of status on public.household_memberships
for each row execute function public.refresh_reminder_membership_scope();

create or replace function public.promote_private_reminders_to_household()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'active' and new.role in ('owner','member') then
    update public.reminders
    set scope_kind = 'HOUSEHOLD', scope_id = new.household_id
    where user_id = new.user_id and scope_kind = 'USER';
  end if;
  return new;
end;
$$;

revoke all on function public.promote_private_reminders_to_household()
from public, anon, authenticated, service_role;
drop trigger if exists household_membership_promote_reminders
on public.household_memberships;
create trigger household_membership_promote_reminders
after insert or update of status, role on public.household_memberships
for each row execute function public.promote_private_reminders_to_household();

alter table public.reminders enable row level security;
drop policy if exists "DiaryDock reminder row access" on public.reminders;
drop policy if exists reminder_scope_read on public.reminders;
create policy reminder_scope_read on public.reminders
for select to authenticated
using (
  (scope_kind = 'USER' and user_id = (select auth.uid()))
  or (scope_kind = 'HOUSEHOLD' and exists (
    select 1 from public.household_memberships as member
    where member.household_id = reminders.scope_id
      and member.user_id = (select auth.uid()) and member.status = 'active'
  ))
);

drop policy if exists sync_records_owner_read on public.sync_records;
drop policy if exists sync_records_scope_read on public.sync_records;
create policy sync_records_scope_read on public.sync_records
for select to authenticated
using (
  (scope_kind = 'USER' and owner_id = (select auth.uid()))
  or (scope_kind = 'HOUSEHOLD' and exists (
    select 1 from public.household_memberships as member
    where member.household_id = sync_records.scope_id
      and member.user_id = (select auth.uid()) and member.status = 'active'
  ))
);

create or replace function public.project_reminder_for_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    update public.sync_records
    set revision = revision + 1,
        payload = '{}'::jsonb,
        updated_at = timezone('utc', now()),
        deleted_at = timezone('utc', now()),
        change_sequence = nextval('public.sync_change_sequence')
    where owner_id = old.user_id
      and entity_type = 'reminder' and source_id = old.id;
    return old;
  end if;

  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    update public.sync_records
    set owner_id = new.user_id,
        scope_kind = new.scope_kind,
        scope_id = new.scope_id,
        revision = revision + 1,
        payload = public.reminder_sync_payload(new),
        updated_at = new.updated_at,
        deleted_at = null,
        change_sequence = nextval('public.sync_change_sequence')
    where owner_id = old.user_id
      and entity_type = 'reminder' and source_id = old.id;
    if found then return new; end if;
  end if;

  insert into public.sync_records(
    record_id, entity_type, owner_id, source_id, scope_kind, scope_id,
    revision, schema_version, payload, updated_at, deleted_at, change_sequence
  ) values (
    case when new.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then new.id::uuid else gen_random_uuid() end,
    'reminder', new.user_id, new.id, new.scope_kind, new.scope_id,
    1, 1, public.reminder_sync_payload(new), new.updated_at, null,
    nextval('public.sync_change_sequence')
  ) on conflict (owner_id, entity_type, source_id) do update set
    scope_kind = excluded.scope_kind,
    scope_id = excluded.scope_id,
    revision = public.sync_records.revision + 1,
    payload = excluded.payload,
    updated_at = excluded.updated_at,
    deleted_at = null,
    change_sequence = excluded.change_sequence;
  return new;
end;
$$;

revoke all on function public.project_reminder_for_sync()
from public, anon, authenticated, service_role;

update public.sync_records as record
set scope_kind = reminder.scope_kind, scope_id = reminder.scope_id,
    change_sequence = nextval('public.sync_change_sequence')
from public.reminders as reminder
where record.entity_type = 'reminder'
  and record.owner_id = reminder.user_id and record.source_id = reminder.id
  and (record.scope_kind is distinct from reminder.scope_kind
    or record.scope_id is distinct from reminder.scope_id);
