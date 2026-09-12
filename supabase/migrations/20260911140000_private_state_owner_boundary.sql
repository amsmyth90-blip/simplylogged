-- app_state is private. Shared household data has its own table and policies.
begin;
alter table public.app_state enable row level security;
revoke all on table public.app_state from public, anon;
revoke insert, update, delete, truncate, references, trigger on table public.app_state from authenticated;
grant select on table public.app_state to authenticated;
drop policy if exists "DiaryDock app state access" on public.app_state;
create policy "DiaryDock app state access" on public.app_state
for select to authenticated using (id::text = (select auth.uid()::text));
-- A restrictive boundary also prevents an additional permissive policy bypass.
drop policy if exists "DiaryDock private owner boundary" on public.app_state;
create policy "DiaryDock private owner boundary" on public.app_state
as restrictive for all to authenticated
using (id::text = (select auth.uid()::text))
with check (id::text = (select auth.uid()::text));
commit;
