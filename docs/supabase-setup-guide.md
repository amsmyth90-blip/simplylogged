# Simply Logged Supabase Setup Guide

This guide connects Simply Logged to Supabase Auth, Database, and Storage.

## 1. Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

The app can run in local fallback mode without Supabase env vars, but production mode requires the Supabase values.

## 2. Where To Find Supabase Values

In Supabase:

1. Open your Supabase project.
2. Go to **Project Settings**.
3. Open **API**.
4. Copy these values:

| Env var | Supabase value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API key named `anon` / `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API key named `service_role` |

Important:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for browser use.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only. Never expose it in client components.
- `OPENAI_API_KEY` comes from the OpenAI platform, not Supabase.

## 3. Apply The SQL Migration

Migration file:

```text
supabase/migrations/20260616180000_production_foundation.sql
```

Option A: Supabase Dashboard

1. Open Supabase.
2. Go to **SQL Editor**.
3. Create a new query.
4. Paste the full contents of `supabase/migrations/20260616180000_production_foundation.sql`.
5. Run the query.

Option B: Supabase CLI

If this project is linked to a Supabase project:

```bash
supabase db push
```

After applying, confirm these tables exist:

- `profiles`
- `documents`
- `reminders`
- `family_members`
- `user_preferences`
- `activity_events`

Also confirm RLS is enabled on each table.

## 4. Confirm Documents Bucket

The migration creates a private bucket named:

```text
documents
```

To verify:

1. Open Supabase.
2. Go to **Storage**.
3. Confirm a bucket named `documents` exists.
4. Open the bucket settings.
5. Confirm the bucket is **not public**.

Expected storage path format:

```text
user_id/document_id/file_name
```

The storage policies only allow users to access files where the first path segment matches their own auth user id.

## 5. Test Signup And Login Locally

Start the app:

```bash
npm run dev
```

Open the setup status page first:

```text
http://localhost:3000/setup
```

This page confirms whether Supabase, OpenAI, database access, and the private storage bucket are configured. It does not expose secret values.

Open:

```text
http://localhost:3000/signup
```

Test signup:

1. Create a new test account.
2. Confirm the app redirects to `/account`.
3. In Supabase, open **Authentication > Users**.
4. Confirm a new `auth.users` record exists.
5. Open the `profiles` table.
6. Confirm a matching `profiles.id` row exists.

Test login:

1. Sign out from `/account` or `/settings`.
2. Open `/login`.
3. Log in with the same email/password.
4. Confirm protected pages such as `/dashboard`, `/vault`, and `/reminders` load.

## 6. Test Protected Routes

With Supabase env vars configured:

1. Sign out.
2. Open `/dashboard`.
3. Expected: redirected to `/login?next=%2Fdashboard`.
4. Repeat for:
   - `/add`
   - `/add/review`
   - `/vault`
   - `/room/garage`
   - `/reminders`
   - `/family`
   - `/mailbox`

If Supabase env vars are missing, local development fallback mode remains available.

## 7. Test Document Upload

1. Sign in.
2. Open `/add`.
3. Upload an image or PDF.
4. Click **Analyse document**.
5. Expected:
   - The file uploads to Supabase Storage.
   - The review page opens.
6. Click **Save document** or **Save & add reminder**.
7. In Supabase, confirm:
   - A row exists in `documents`.
   - `file_path` is populated.
   - `file_name`, `mime_type`, `file_size`, `document_type`, `analysis_source`, and `analysis_confidence` are populated where available.
8. In Storage, confirm the file exists under:

```text
documents/user_id/document_id/file_name
```

If storage upload fails in production mode, the app should stop the flow and show a clear error.

## 8. Test Reminders, Family, And Settings

Reminders:

1. Open `/reminders`.
2. Create a reminder.
3. Confirm a row exists in `reminders`.

Family:

1. Open `/family`.
2. Invite a family member.
3. Confirm a row exists in `family_members`.

Settings:

1. Open `/settings`.
2. Change theme, season, or emergency access.
3. Confirm a row exists in `user_preferences`.

## 9. Run The RLS Checklist

Use the checklist here:

```text
docs/supabase-rls-test-checklist.md
```

The checklist verifies:

- User A cannot see User B documents.
- User A cannot see User B reminders.
- User A cannot access User B storage files.
- User A cannot update User B profile rows.
- User A cannot update User B preferences.
- User A cannot update User B family rows.

Run this with two real test accounts after the migration is applied.

## 10. Vercel Environment Variables

In Vercel:

1. Open the Simply Logged project.
2. Go to **Settings > Environment Variables**.
3. Add:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

Recommended environments:

- Production
- Preview
- Development

After adding env vars:

1. Redeploy the app.
2. Test `/signup`.
3. Test `/login`.
4. Test `/add`.
5. Confirm files and rows appear in Supabase.

## 11. Quick Production Readiness Checks

- `documents` bucket is private.
- RLS is enabled on all app tables.
- Storage policies exist on `storage.objects`.
- Signup creates both auth and profile rows.
- Signed-out users cannot access protected pages.
- Document upload creates both a database row and a storage object.
- Two-user RLS checklist passes.
