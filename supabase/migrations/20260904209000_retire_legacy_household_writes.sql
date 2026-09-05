-- Legacy household display rows are read-only after migration to household access services.
do $$
begin
  if to_regclass('public.household_members') is not null then
    revoke insert, update, delete on table public.household_members from authenticated;
  end if;
  if to_regclass('public.family_invites') is not null then
    revoke insert, update, delete on table public.family_invites from authenticated;
  end if;
end;
$$;
