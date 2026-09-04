-- Preserve records owned by the household when a non-owner deletes their account.
create or replace function public.prepare_account_deletion(input_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  household_record record;
  membership_record record;
  deleting_email text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  select lower(email) into deleting_email
  from auth.users where id = input_user_id;
  if deleting_email is null then raise exception 'Invalid account'; end if;

  for membership_record in
    select membership.household_id, household.owner_id
    from public.household_memberships as membership
    join public.households as household on household.id = membership.household_id
    where membership.user_id = input_user_id
      and membership.status = 'active'
      and household.owner_id <> input_user_id
    for update of membership, household
  loop
    if not exists (
      select 1 from public.household_memberships as owner_membership
      where owner_membership.household_id = membership_record.household_id
        and owner_membership.user_id = membership_record.owner_id
        and owner_membership.status = 'active'
        and owner_membership.role = 'owner'
    ) then
      raise exception 'Account deletion is paused because household ownership is invalid';
    end if;
    update public.reminders as reminder
    set
      dedupe_key = case when reminder.dedupe_key is not null and exists (
        select 1 from public.reminders as existing
        where existing.user_id = membership_record.owner_id
          and existing.dedupe_key = reminder.dedupe_key
          and existing.id <> reminder.id
      ) then 'transferred:' || reminder.id else reminder.dedupe_key end,
      user_id = membership_record.owner_id
    where reminder.user_id = input_user_id
      and reminder.scope_kind = 'HOUSEHOLD'
      and reminder.scope_id = membership_record.household_id;
  end loop;

  for household_record in
    select household.id from public.households as household
    where household.owner_id = input_user_id for update
  loop
    if exists (
      select 1 from public.household_memberships as membership
      where membership.household_id = household_record.id
        and membership.user_id <> input_user_id
        and membership.status = 'active'
    ) then
      raise exception 'Account deletion is paused because this person owns a household with other active members';
    end if;
    delete from public.households where id = household_record.id;
  end loop;

  delete from public.home_handover_publications as publication
  where publication.owner_id = input_user_id
    or publication.recipient_email = deleting_email;
  return true;
end;
$$;

revoke all on function public.prepare_account_deletion(uuid)
from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
