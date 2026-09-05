-- Reminder identifiers originate in both UUID-backed records and deterministic
-- application workflows. Store them as text so both forms share one boundary.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reminders'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    alter table public.reminders alter column id drop default;
    alter table public.reminders alter column id type text using id::text;
    alter table public.reminders alter column id set default gen_random_uuid()::text;
  end if;
end;
$$;
