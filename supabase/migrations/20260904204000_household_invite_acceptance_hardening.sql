-- Require a fresh authenticated session for the account-wide household join boundary.
create or replace function public.accept_household_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  invite_record public.household_invites%rowtype;
  signed_in_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  member_object jsonb;
  member_list jsonb;
  rate_allowed boolean;
begin
  perform public.require_recent_authentication(900);
  select result.allowed into rate_allowed
  from public.check_rate_limit(
    'household-invite-accept:' || auth.uid()::text,
    30,
    600
  ) as result;
  if not coalesce(rate_allowed, false) then
    raise exception 'Too many invitation attempts';
  end if;

  select * into invite_record
  from public.household_invites
  where token = invite_token
  for update;

  if invite_record.token is null
    or invite_record.status <> 'pending'
    or invite_record.expires_at <= timezone('utc', now()) then
    raise exception 'This invite is no longer active';
  end if;
  if lower(invite_record.email) <> signed_in_email then
    raise exception 'Sign in with the email address this invite was sent to';
  end if;
  if exists (
    select 1 from public.household_memberships
    where user_id = auth.uid()
      and household_id <> invite_record.household_id
      and status = 'active'
  ) then
    raise exception 'This account already belongs to another household';
  end if;

  insert into public.household_memberships (
    household_id, user_id, role, display_name, relation
  ) values (
    invite_record.household_id, auth.uid(), invite_record.role,
    invite_record.name, invite_record.relation
  )
  on conflict (household_id, user_id) do update set
    role = excluded.role,
    display_name = excluded.display_name,
    relation = excluded.relation,
    status = 'active';

  update public.household_invites
  set status = 'accepted', accepted_by = auth.uid(),
    accepted_at = timezone('utc', now())
  where token = invite_token and status = 'pending';

  member_object := jsonb_build_object(
    'id', auth.uid()::text,
    'name', invite_record.name,
    'role', invite_record.relation,
    'access', case when invite_record.role = 'member' then 'Shared access' else 'Limited access' end,
    'accessTone', case when invite_record.role = 'member' then 'shared' else 'limited' end,
    'note', invite_record.relation || ' joined through a secure DiaryDock invite.',
    'initials', upper(left(invite_record.name, 1)),
    'manages', case when invite_record.role = 'member'
      then '["Kitchen","Calendar","Reminders","Family Room"]'::jsonb
      else '[]'::jsonb
    end,
    'lastActive', 'Now'
  );
  select coalesce(jsonb_agg(item), '[]'::jsonb) into member_list
  from jsonb_array_elements(coalesce(
    (select payload -> 'householdMembers' from public.household_state
      where household_id = invite_record.household_id),
    '[]'::jsonb
  )) as item
  where item ->> 'id' <> auth.uid()::text;

  update public.household_state
  set payload = jsonb_set(
    jsonb_set(payload, '{householdMembers}', member_list || member_object, true),
    '{familyInvites}',
    coalesce((
      select jsonb_agg(item)
      from jsonb_array_elements(coalesce(payload -> 'familyInvites', '[]'::jsonb)) as item
      where item ->> 'id' <> invite_token::text
    ), '[]'::jsonb),
    true
  )
  where household_id = invite_record.household_id;

  return invite_record.household_id;
end;
$$;

revoke all on function public.accept_household_invite(uuid) from public, anon;
grant execute on function public.accept_household_invite(uuid) to authenticated;
