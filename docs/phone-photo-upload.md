# Phone photo upload

Desktop photo inputs offer **Use my phone**. The QR opens `/phone-upload` on a phone without requiring account sign-in. The phone converts selected images to JPEG (up to 2200px on the longest side), then sends encrypted chunks through the existing Supabase Realtime service. The desktop previews received photos and passes them to the original file-input handler only after the user chooses **Use photo(s)**. Existing storage quota, validation and filing flows remain responsible for saving.

Each connection uses a random 256-bit AES-GCM key in the QR URL fragment. The fragment is not sent in the page request. The Realtime topic is derived with SHA-256; messages and acknowledgements are encrypted with fresh IVs. The phone has no account credentials or access to stored records. No new database tables, storage policies or account grants are created.

Connections expire locally after ten minutes and end on the desktop when the dialog closes or the account boundary unmounts. A receiver accepts at most twelve photos, four MB each, in bounded ordered chunks. Retries are acknowledged without duplicating a completed photo. Missing acknowledgements fail with an actionable message. Both devices must remain connected. Camera support depends on the phone browser; choosing existing photos is also available.

Validation: TypeScript and scoped ESLint; protocol tests for wrong keys, tampering, replay, ordering, expiry, count and size bounds; browser transfer of a synthetic JPEG and a two-photo batch including a larger multipart image. The signed-out sender used a separate localhost origin. Received photos appeared in document capture as three reviewable pages without saving them to the account. Physical phone camera capture was not exercised by this automated check.

The user explicitly approved sending encrypted photos through DiaryDock's Supabase backend from a phone that is not signed in.
