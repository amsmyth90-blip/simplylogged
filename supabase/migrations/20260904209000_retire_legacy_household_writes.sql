-- Legacy household display rows are read-only after migration to household access services.
revoke insert, update, delete on table public.household_members from authenticated;
revoke insert, update, delete on table public.family_invites from authenticated;
