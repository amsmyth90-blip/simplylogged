-- Keep document uploads below Vercel's 4.5 MB function payload ceiling.
update storage.buckets
set file_size_limit = 4194304
where id = 'diarydock-documents';
