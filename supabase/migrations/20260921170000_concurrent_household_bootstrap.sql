-- Serialize first-load household creation for one account. Concurrent browser
-- bootstraps must converge on the same membership instead of returning 503.
create or replace function public.ensure_user_household()
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_household_id uuid;
  private_payload jsonb;
  household_name text;
  display_name text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 607291900)
  );

  select membership.household_id
    into current_household_id
  from public.household_memberships as membership
  where membership.user_id = current_user_id
    and membership.status = 'active'
  limit 1;
  if current_household_id is not null then
    return current_household_id;
  end if;

  select state.payload
    into private_payload
  from public.app_state as state
  where state.id::text = current_user_id::text;

  household_name := coalesce(
    nullif(private_payload #>> '{onboarding,householdName}', ''),
    split_part(coalesce(auth.jwt() ->> 'email', 'My'), '@', 1) || '''s household'
  );
  display_name := coalesce(
    nullif(private_payload #>> '{settingsProfile,name}', ''),
    split_part(coalesce(auth.jwt() ->> 'email', 'Household owner'), '@', 1)
  );

  insert into public.households (name, owner_id)
  values (household_name, current_user_id)
  returning id into current_household_id;

  insert into public.household_memberships (
    household_id, user_id, role, display_name, relation
  ) values (
    current_household_id, current_user_id, 'owner', display_name, 'Household owner'
  );

  insert into public.household_state (household_id, payload)
  values (
    current_household_id,
    jsonb_strip_nulls(jsonb_build_object(
      'householdMembers', private_payload -> 'householdMembers',
      'familyInvites', private_payload -> 'familyInvites',
      'reminders', private_payload -> 'reminders',
      'mealPlan', private_payload -> 'mealPlan',
      'kitchenItems', private_payload -> 'kitchenItems',
      'kitchenRecipes', private_payload -> 'kitchenRecipes',
      'kitchenNoticeboard', private_payload -> 'kitchenNoticeboard',
      'familyCalendarEvents', private_payload -> 'familyCalendarEvents'
    ))
  );

  return current_household_id;
end;
$$;

revoke all on function public.ensure_user_household() from public, anon;
grant execute on function public.ensure_user_household() to authenticated;
