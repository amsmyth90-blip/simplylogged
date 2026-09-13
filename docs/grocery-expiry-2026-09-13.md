# Grocery capture and expiry reminders

Web and mobile share the Groceries screen: Kitchen > Pantry & shopping > Scan groceries.
Capture photos or a video up to 45 seconds, or add products manually. Videos are decoded
on the device into at most 12 still frames. Only the selected label images are sent to
OpenAI after the user clicks Read labels; original video is not uploaded. Images are
resized, metadata stripped, and not stored by DiaryDock. The Responses request uses store:false.
This is AI processing of label images, not end-to-end encrypted image analysis.

Every result is editable and must be explicitly checked before saving. Missing or
uncertain dates, including a missing printed year, stay blank. Date types distinguish
use-by and best-before. No expiry reminder is created without a confirmed date.
The feature does not determine whether food is safe to eat.

Two account-private reminders are created at 08:00 in the saved IANA time zone, two
calendar days and one calendar day before the date. Elapsed reminder windows are skipped.
Used up marks the item consumed and cancels remaining reminders and queued phone alerts.
Batch identifiers make retries idempotent. Limits: 40 products per save, 300 active
products, 12 images/frames and 3.5 MB total upload. Active items use pagination.

Migration 20260913100000_grocery_expiry.sql was applied transactionally through the
DiaryDock Supabase SQL editor on 13 September 2026. The migration adds only grocery
objects and service-only functions; existing account records remain intact. It relies
on the existing appointment_devices and structured reminders schema.

Validation: full workspace suite 600/600; web and mobile TypeScript/builds; source-size
check; browser photo and real WebM video decoding; review gate, missing dates, uncertain
save retry, used-up and phone width. SQL tests cover account isolation, DST, atomic
rollback, deduplication, notification leases and cancellation. Live database testing
with the two authorized QA accounts verified saving once across retries, account B
unable to read account A's grocery, correct DST reminder times, and cancellation.
The labelled QA grocery was marked used; real user groceries were not touched.

Production has OPENAI_API_KEY configured as a non-downloadable secret. Actual label
recognition passed on the deployed endpoint using synthetic labels: both date types were
read correctly, and a label without a year stayed blank. Authentication and consent
checks also passed. Website deployment dpl_XQ9xLX3P7j5kZfWtCAJ3Uhn8s9qB is live. Phone push
requires FCM_PROJECT_ID, FCM_CLIENT_EMAIL and FCM_PRIVATE_KEY for Android; APNS_TEAM_ID,
APNS_KEY_ID, APNS_PRIVATE_KEY, APNS_BUNDLE_ID and the correct APNS_ENVIRONMENT for iOS.
These push credentials were absent from the production environment when checked.
Store them only in the hosting provider's secret settings, never in source control.

The cron /api/internal/grocery-notifications runs every minute using the existing
CRON_SECRET. Phone delivery requires user permission and a registered device; alerts
omit product names on lock screens. Pending delivery expires after 20 hours. Device
capture and delivered notifications still require testing on physical Android/iOS.
