-- Provision the household required by server-owned onboarding transactions.
create or replace function public.ensure_service_user_household(
  input_user_id uuid,
  input_household_name text,
  input_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_household_id uuid;
  removed_household_id uuid;
  clean_household_name text := trim(input_household_name);
  clean_display_name text := trim(input_display_name);
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  if input_user_id is null
    or not exists (select 1 from auth.users where id = input_user_id) then
    raise exception 'Invalid account';
  end if;
  if length(clean_household_name) not between 1 and 160
    or length(clean_display_name) not between 1 and 160 then
    raise exception 'Invalid household profile';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(input_user_id::text, 509052000));
  select membership.household_id into current_household_id
  from public.household_memberships as membership
  where membership.user_id = input_user_id and membership.status = 'active'
  limit 1;
  if current_household_id is not null then return current_household_id; end if;

  select membership.household_id into removed_household_id
  from public.household_memberships as membership
  where membership.user_id = input_user_id and membership.status = 'removed'
  limit 1 for update;

  insert into public.households(name, owner_id)
  values (clean_household_name, input_user_id)
  returning id into current_household_id;

  if removed_household_id is null then
    insert into public.household_memberships(
      household_id, user_id, role, display_name, relation, status
    ) values (
      current_household_id, input_user_id, 'owner', clean_display_name,
      'Household owner', 'active'
    );
  else
    update public.household_memberships
    set household_id = current_household_id,
      role = 'owner', display_name = clean_display_name,
      relation = 'Household owner', status = 'active',
      joined_at = timezone('utc', now())
    where household_id = removed_household_id and user_id = input_user_id;
  end if;
  return current_household_id;
end;
$$;

revoke all on function public.ensure_service_user_household(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.ensure_service_user_household(uuid, text, text)
to service_role;
