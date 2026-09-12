# Daily and Sunday recaps — 12 September 2026

## Prepared behaviour
- Daily recap defaults to 8am; Sunday recap defaults to 8pm. Each account can choose either time using the shared app and website time controls. Both schedules use the account's chosen IANA time zone, including daylight-saving changes. Sunday keeps both recaps.
- Web route: /recaps; linked from dashboard and Settings → Daily & Sunday recaps.
- Mobile: Recaps on Home and in Settings. A Sunday notification opens the weekly tab.
- Today shows dated reminders and planned health appointments due today or overdue. Week ahead includes overdue items and dates through the next seven days.
- Views are live summaries, not historical snapshots; no password-vault data is included.
- Individual users opt in with separate daily, weekly and push controls. The initial time zone comes from their device; they can update it when travelling.
- Five items per page keeps desktop content compact. Invalid dates are excluded; bounded lists explain when further items exist.

## Privacy and delivery
Source reads use the authenticated Supabase client and existing row-level security. Private appointments are filtered by the signed-in user's ID; reminder visibility follows current household membership. Notification messages contain no personal record titles, medical details, account identifiers or passwords.
Preferences are account-owned. The service-only outbox has unique user/device/kind/local-date keys, leased claims, bounded retry backoff and a two-hour expiry. Delivery rechecks consent and device ownership. Provider collapse IDs/tags reduce duplicates, but external push delivery is at least once and cannot guarantee exactly once after ambiguous network failures.
Outbox entries expire after 30 days. Preferences and notifications cascade on account deletion. Push uses the existing APNs/FCM adapter and creates the Android recaps channel.

## Validation
- Six domain/database tests passed: local date selection; deduplication and bounds; input validation; PostgreSQL account isolation, schedule times, Sunday dual recaps, daylight saving, timezone changes, leases and expiry; existing appointment transaction tests with text and UUID document IDs.
- Website and mobile TypeScript/build checks passed, alongside changed-file ESLint and the repository 300-line source-size check.
- Headless local UI checks with the explicitly authorised QA account and simulated recap responses passed: saving/disabled feedback, error feedback, restored preferences, pagination, 1366×768 no page scrolling and 390px no horizontal overflow.
- Unauthenticated recap API returns 401; unauthorised scheduler requests return 404.
- Read-only live QA account checks verified that authenticated reminder and private appointment source reads work.
- After user approval, the migration was applied successfully to production through the Supabase SQL editor. Real QA account preference saves and reloads passed against the production database.
- Test account B could neither read nor update A’s preferences. Anonymous API access, forged ownership, direct device/outbox access and non-service queue claims were denied. Mobile bearer-token API access passed. The service queue claim succeeded with zero push jobs. QA preferences were restored.
- Native push receipt has NOT been tested because provider credentials are absent.

## Remaining activation steps
1. Completed with explicit user approval: applied supabase/migrations/20260912190000_recaps.sql to the production DiaryDock Supabase project (izfjmdquwenskzoprsvb). It creates the missing phone-device table, recap preferences and the service-only outbox, applies RLS/grants, and installs the schedule claim function. No existing user records are changed.
2. Completed: real settings persistence and account separation verified with the two authorised QA accounts; their settings were restored.
3. Completed: published to Vercel, deployment dpl_5w4PL2tYNYQrk4nuWbBhUdYWQo5d, READY and aliased to diarydock.com. Its new cron calls /api/internal/recap-notifications once per minute using the existing CRON_SECRET.
4. Configure Firebase credentials for Android and Apple push credentials for iOS, then release/install an updated mobile app and verify on a real phone. Production currently has CRON_SECRET but no FCM_* or APNS_* credentials. No browser Web Push service has been added.

Automatic approval review blocked execution of the production SQL migration on 12 September, citing unapproved production schema/privilege changes and potential effects on notification-device access. The user subsequently explicitly approved the database update and website publication. The SQL completed successfully on the approved retry; website deployment completed. Live diarydock.com save/reload, cross-account protection, mobile bearer API access and scheduler claims passed; test preferences were restored afterwards. One initial page-load timeout immediately after deployment resolved on the subsequent live verification.
The existing appointment migration was adjusted to use CREATE TABLE IF NOT EXISTS for the shared device table so either feature's deployment order is safe.

## Custom-time update and Android 0.1.37 (prepared, not published)
- Migration 20260912203000_recap_times.sql adds minute-precision account times with the existing defaults, and a nullable scheduled time on outbox records. Existing outbox rows require no backfill. The scheduler uses each account's selected time and handles retries across midnight. Consent and time changes cancel stale queued messages. Existing access rules remain in place.
- Full npm run check passed, including web/mobile builds and the custom-time PostgreSQL tests. UI checks passed for default and edited times, save/error feedback, desktop height and phone width. Live custom-time persistence awaits migration approval.
- Android versionName 0.1.37 and versionCode 37 are prepared. Native build and phone receipt verification remain pending.
- Automatic approval review rejected executing the first custom-time production migration, citing missing approval for this specific schema/function change and an unbounded backfill UPDATE. The revised migration removes that backfill; it has not been executed. The fixed-time production deployment remains active.
