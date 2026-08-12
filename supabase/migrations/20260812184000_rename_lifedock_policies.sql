do $$
begin
  if to_regclass('public.app_state') is not null
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_state' and policyname = 'LifeDock app state access')
    and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_state' and policyname = 'DiaryDock app state access') then
    alter policy "LifeDock app state access" on public.app_state rename to "DiaryDock app state access";
  end if;

  if to_regclass('public.documents') is not null
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'LifeDock document row access')
    and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'DiaryDock document row access') then
    alter policy "LifeDock document row access" on public.documents rename to "DiaryDock document row access";
  end if;

  if to_regclass('public.reminders') is not null
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reminders' and policyname = 'LifeDock reminder row access')
    and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reminders' and policyname = 'DiaryDock reminder row access') then
    alter policy "LifeDock reminder row access" on public.reminders rename to "DiaryDock reminder row access";
  end if;

  if to_regclass('public.household_members') is not null
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'household_members' and policyname = 'LifeDock household member row access')
    and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'household_members' and policyname = 'DiaryDock household member row access') then
    alter policy "LifeDock household member row access" on public.household_members rename to "DiaryDock household member row access";
  end if;

  if to_regclass('public.family_invites') is not null
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'family_invites' and policyname = 'LifeDock family invite row access')
    and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'family_invites' and policyname = 'DiaryDock family invite row access') then
    alter policy "LifeDock family invite row access" on public.family_invites rename to "DiaryDock family invite row access";
  end if;

  if to_regclass('public.document_permissions') is not null
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'document_permissions' and policyname = 'LifeDock document permission row access')
    and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'document_permissions' and policyname = 'DiaryDock document permission row access') then
    alter policy "LifeDock document permission row access" on public.document_permissions rename to "DiaryDock document permission row access";
  end if;
end $$;
