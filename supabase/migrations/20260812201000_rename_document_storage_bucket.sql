insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'diarydock-documents',
  'diarydock-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "LifeDock users can read own document files" on storage.objects;
drop policy if exists "LifeDock users can upload own document files" on storage.objects;
drop policy if exists "LifeDock users can update own document files" on storage.objects;
drop policy if exists "LifeDock users can delete own document files" on storage.objects;
drop policy if exists "DiaryDock users can read own document files" on storage.objects;
create policy "DiaryDock users can read own document files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'diarydock-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "DiaryDock users can upload own document files" on storage.objects;
create policy "DiaryDock users can upload own document files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'diarydock-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "DiaryDock users can update own document files" on storage.objects;
create policy "DiaryDock users can update own document files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'diarydock-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'diarydock-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "DiaryDock users can delete own document files" on storage.objects;
create policy "DiaryDock users can delete own document files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'diarydock-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
