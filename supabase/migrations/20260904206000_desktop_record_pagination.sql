-- Support bounded immutable-keyset pages for the desktop bootstrap.
create index if not exists documents_owner_created_page_idx
on public.documents(user_id, created_at desc, id desc);

create index if not exists documents_created_page_idx
on public.documents(created_at desc, id desc);

create index if not exists reminders_owner_created_page_idx
on public.reminders(user_id, created_at desc, id desc);
