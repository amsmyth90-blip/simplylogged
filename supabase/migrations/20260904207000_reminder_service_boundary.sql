-- Desktop and mobile reminder mutations now pass through bounded service RPCs.
revoke insert, update, delete on table public.reminders
from authenticated;
