alter table public.reminders
  drop constraint if exists reminders_priority_check;

alter table public.reminders
  add constraint reminders_priority_check
  check (priority in ('low', 'normal', 'medium', 'high'));
