# Android 0.1.40: Grocery capture

Adds photo/video grocery capture, editable product and date review, saved groceries,
and two-day/one-day expiry reminders. Uses the same private server records as the website.
Used up cancels remaining reminders. Grocery notification taps open the new screen.

Based on Android 0.1.39 (424775f7e3bc5294f0946997d90086fc1b6904ad), version code 40.
Mobile TypeScript and production bundle passed. Full workspace suite: 600 tests passed.
Live database isolation, idempotency, daylight-saving scheduling and cancellation passed.
Phone push credentials remain required; physical-device capture/delivery is unverified.
See grocery-expiry-2026-09-13.md for setup and verification details.

All 596 tests in the isolated release snapshot passed (the mobile dependency junction
was corrected before rerunning its nine foundation tests). Mobile compilation passed.
Actual AI reading passed on the deployed website using synthetic labels.
