# Supabase RLS Live-Test Checklist

Use two separate test accounts:

- User A: `user-a@example.com`
- User B: `user-b@example.com`

Run these checks against a Supabase project with the production migration applied.

## 1. Documents

- Sign in as User A.
- Upload and save a document.
- Confirm the `documents.user_id` matches User A.
- Sign out.
- Sign in as User B.
- Confirm User A's document does not appear in `/vault`, `/mailbox`, `/dashboard`, or any `/room/[roomId]` page.
- In Supabase SQL or API tests, attempt to select User A's document while authenticated as User B.
- Expected result: zero rows.
- Attempt to update or delete User A's document as User B.
- Expected result: no rows updated or deleted.

## 2. Reminders

- Sign in as User A.
- Create a reminder from `/reminders` or save a document with reminders from `/add/review`.
- Confirm the `reminders.user_id` matches User A.
- Sign out.
- Sign in as User B.
- Confirm User A's reminder does not appear in `/reminders`, `/dashboard`, or related room pages.
- Attempt to select, update, and delete User A's reminder as User B.
- Expected result: zero rows returned, updated, or deleted.

## 3. Storage Files

- Sign in as User A.
- Upload a document file.
- Confirm the object path starts with User A's auth id:
  `user_a_id/document_id/file_name`.
- Sign out.
- Sign in as User B.
- Attempt to create a signed URL or download User A's storage object.
- Expected result: access denied.
- Attempt to upload into User A's path as User B.
- Expected result: access denied.
- Attempt to delete User A's storage object as User B.
- Expected result: access denied.

## 4. Profiles

- Sign in as User A.
- Confirm User A can read and update only `profiles.id = auth.uid()`.
- Sign in as User B.
- Attempt to select User A's profile row.
- Expected result: zero rows.
- Attempt to update User A's profile row.
- Expected result: no rows updated.

## 5. Preferences

- Sign in as User A.
- Change settings in `/settings`.
- Confirm a `user_preferences` row exists for User A.
- Sign in as User B.
- Attempt to select or update User A's preferences row.
- Expected result: zero rows returned or updated.

## 6. Family Members

- Sign in as User A.
- Invite a family member from `/family`.
- Confirm the `family_members.user_id` matches User A.
- Sign in as User B.
- Confirm User A's family member does not appear in `/family`.
- Attempt to select, update, and delete User A's `family_members` row as User B.
- Expected result: zero rows returned, updated, or deleted.

## Pass Criteria

- User A and User B can each access their own rows and storage files.
- Neither user can read, update, delete, or upload into the other user's rows or storage paths.
- App screens show only data owned by the signed-in user.
