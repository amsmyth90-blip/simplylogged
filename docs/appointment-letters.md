# Appointment letters

The website's **My Health → Appointments** page and the phone app's **Health → Visits** area include **Appointment from a letter**. The phone app also exposes it on the Health overview.

Users attach a PDF or JPG/PNG/WebP (up to 4 MB), review the date, time, location, provider, preparation notes, timezone and calendar duration, choose a reminder, and confirm. The original letter uses the existing private upload/quarantine/storage-quota pipeline and remains accessible from the appointment. A 30-minute calendar slot is an explicit editable default, never an extracted duration.

## Activation status

The owner has approved the OpenAI connection. Automatic reading is wired to the authenticated, rate-limited letter endpoint. Each letter requires explicit, unchecked consent identifying OpenAI and the health information being sent; choosing another file resets consent. The server rejects missing or invalid consent before scanning or extraction. Manual entry remains available.

The endpoint accepts a single supported letter within a bounded 4 MB upload and runs signature and malware checks before forwarding it. PDFs are limited to twelve pages. Configure `OPENAI_API_KEY` and optionally the existing `OPENAI_VISION_MODEL` on the server; without a key the endpoint returns a setup message without reading the request body. The extractor uses structured output, `store: false`, no tools, and no medical advice; uncertain dates/times and cancellations require review.

## Deployment prerequisites

1. Apply `supabase/migrations/20260912130000_appointment_letter_delivery.sql` after the existing migrations. It creates private device registrations, import idempotency records, and the notification outbox. Its save RPC commits the appointment, timeline entry, reminder and notification jobs in one transaction, preserving native text/UUID document and reminder schemas.
2. Configure `CRON_SECRET` (at least 32 characters) on the server. The new `/api/internal/appointment-notifications` Vercel cron runs every minute; this cadence requires a hosting plan that supports minute-level cron. An authenticated external scheduler may call the same endpoint if needed.
3. For iOS remote push, configure `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID=com.diarydock.app`. `APNS_ENVIRONMENT=sandbox` is for development tokens; leave unset or use `production` for TestFlight/App Store tokens. Private keys accept PEM newlines or escaped newlines. Enable Push Notifications on the Apple App ID and regenerate provisioning profiles with the entitlement. The development entitlement is replaced by distribution signing for TestFlight/App Store builds.
4. For Android remote push, configure `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, and `FCM_PRIVATE_KEY` for a service account authorized to send FCM messages. Supply the matching Android `google-services.json` securely at build time. Do not commit secrets. The existing Gradle setup applies Google Services when that file exists.
5. Rebuild and run `npx cap sync`. Calendar, local notifications and push plugins are installed and native project registrations are generated. iOS includes calendar usage descriptions and APNs delegate callbacks. Device signing, provisioning and real-phone delivery must be verified on the platform build machines.

## Behaviour and limits

- Phone users can enable remote alerts from Health. A website-created appointment reaches registered phones through the server outbox. If no phone is registered, the website explicitly reports that alerts cannot be sent.
- If remote push is not configured, appointments created in the installed app can schedule local device alerts with permission. These work without a server scheduler; OS settings and power management can affect timing. Local alerts are tied to that device and are cleared on explicit sign-out. Changes made elsewhere are not automatically reconciled into these local alerts.
- Calendar writes are separate from notifications. The installed app requests write permission and adds to the default phone calendar. The website downloads an `.ics` event which the user must open/import into their calendar. It does not silently add website-created appointments to a remote iPhone calendar.
- Initial calendar export is implemented. Later edits/cancellations are **not** automatically synced to the calendar, and the UI says so. No existing calendar events are read.
- Notification text contains no appointment title, location, patient name, letter contents or preparation notes. Calendar export includes the confirmed title, date/time and location but excludes the letter and medical notes.
- Retries within the review dialog reuse the letter reservation and immutable appointment request. The database prevents duplicate import IDs and duplicate appointment details. Per-device outbox leases prevent overlapping workers from normally delivering twice; delivery is at least once, so a crash after provider acceptance can repeat an alert. APNs collapse IDs and Android notification tags reduce visible duplicates.
- The remote worker suppresses reminders for removed/cancelled appointments and completed/deleted reminders, checks appointment time against the queued time, retries temporary failures with backoff, and removes invalid device tokens. Account deletion cascades through the new tables. Device registrations expire from new scheduling after 90 days without refresh.

## Verification

The 17 appointment tests pass. They cover extraction-output bounds, absent/ambiguous times, UK summer/winter time, skipped/repeated clock-change times, calendar escaping and UTF-8 folding, private document ownership, native UUID/text database types, atomic/idempotent save, outbox leases and retries, and account cleanup. The letter endpoint tests also verify authentication, configuration, explicit consent, upload bounds, scanner rejection, provider error redaction and client consent submission using mocks; no real letter leaves the test process.

After activating the connection, changed-file linting, mobile TypeScript checks and the mobile production build passed. Capacitor sync copied the current build into iOS and Android and registered the three new plugins. The earlier Next.js build passed before unrelated password-vault work appeared in the shared workspace. The latest web typecheck/build is blocked by unresolved `@diarydock/password-vault` imports and a syntax error in `components/password-vault/usePasswordVault.ts:69`. These files are outside this feature.

The inspected local environment has no OpenAI, APNs, FCM or cron credentials configured. Production settings were not inspected or modified.

The full suite ran 569 tests: 568 initially passed; the one failed assertion assumed only the document-cleanup cron existed. It was updated to check that cleanup remains configured, and the affected test plus all new tests then passed (11/11). The source-size gate currently reports an unrelated pre-existing long line in `components/PhonePhotoUpload.tsx:89`.

No real appointment letter was sent to an AI provider, no remote push was sent, no phone calendar was changed, and no production database migration or deployment was performed during implementation.
