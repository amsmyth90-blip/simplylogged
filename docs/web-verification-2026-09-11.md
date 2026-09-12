# DiaryDock verification — 11 September 2026

Update: the account-isolation and document-filing blockers below have since been repaired and retested. See [repair results](privacy-and-filing-repair.md). The original findings and check ledger are preserved as historical evidence; remaining integration and end-to-end coverage gaps still apply.

**Not ready for release. Full end-to-end verification is incomplete.** Live testing found a critical account-isolation failure and a document-filing failure. Missing external integrations also prevent a complete sign-off. Successful page responses below are navigation checks, not proof that every form and workflow works.

## Scope and environment

Local Next.js website at `http://127.0.0.1:3005`, connected to the existing DiaryDock Supabase project. The user explicitly authorised two labelled QA accounts. All live writes and cross-account probes targeted those synthetic accounts; no existing personal account records were intentionally modified or queried. QA accounts and fixtures are retained for reproduction and retesting. Their credentials are in a Git-ignored `.qa-web-e2e` directory, not this report.

The final live run performed 96 checks: 92 passed, four failed (two independently reproduce the same account-isolation issue). This includes 49 web entry-page HTTP checks and 24 mobile read-API checks. The API requests used real test-account sessions and the running website, not mocked database responses. They do not substitute for interacting with every browser control or a real phone.

## Release blockers

### Critical: direct cross-account database read

After QA A saved the synthetic profile name `DiaryDock QA A`, QA B's ordinary authenticated Supabase client could select A's `app_state` row. A second probe signed B in afresh and used its bearer token directly against PostgREST, requesting only A's known test row. It returned HTTP 200 and A's marker. The probe independently confirmed the signed-in user was B.

The application's bootstrap endpoint did not expose A's state to B, and its state-write endpoint rejected mismatched account IDs. Those application checks do not protect a direct database request. Supabase policies and RLS configuration on the deployed database need inspection and repair before release. The repository's `supabase/schema.sql` describes an owner-only policy, but this test does not establish which live policy/configuration differs. No production policy changes were applied during verification. Other tables and cross-account writes have not been exhaustively audited.

### High: uploading and filing a document fails

Quota reservation and signed upload to quarantine passed. A bare file commit passed in an earlier probe. The complete flow with a title, category and room failed at `commit_mobile_document_upload`, returning HTTP 503. A diagnostic against the same synthetic reservation returned PostgreSQL `42804`: `column "id" is of type uuid but expression is of type text`.

The SQL function in `20260901233600_mobile_document_upload_commit.sql` casts document IDs to text. Its assumptions need reconciliation with the deployed schema. No migration was applied. Owner download, cross-account file delivery and document appearance in the desktop list remain unverified for this complete flow because commit failed.

### External services and launch configuration

- Ask returned HTTP 200 with `usedAI: false`; only the deterministic fallback was exercised. `OPENAI_API_KEY` is unset, so AI extraction, recipe analysis and generated answers cannot receive full live verification.
- Email-address endpoint returned `configured: false`. Inbound email delivery, parsing and filing are not operationally verified.
- Purchasing, restore and subscription management remain launch placeholders. Paid storage migrations were not applied. No payment transactions were attempted.
- Local production preflight reports missing sync cursor secret, explicit capture scanner setting, deletion admin token and emails, cron secret, OpenAI key, and explicit inbound-email readiness setting. This assesses local configuration, not the deployed host's settings.
- The server credential posted in the earlier conversation still needs replacement.

## Verified changes and workflows

- Test-account password authentication and authenticated bootstrap.
- Desktop state save, fresh-request persistence, rejection of stale revisions and mismatched account writes, anonymous bootstrap rejection.
- Recipe creation and favourite update through the mobile API; that recipe was visible through desktop bootstrap. Deletion passed when another recipe remained. The existing implementation refuses deletion of the last recipe; this is a product limitation, not a passing last-recipe deletion test.
- Quota reservation, signed upload and synthetic PDF transfer. Full metadata filing failed as described above.
- Storage summary; 49 web entry-page responses; 24 mobile read endpoints.

A real save defect was fixed during testing: checking the origin only against Next's normalized request URL rejected valid local requests. The shared helper now compares against the request's target Host and scheme while rejecting cross-site origins and ignoring forwarded-host input. Applied to state saves, document mutations, proposal actions and document sharing. Two regression tests cover hostname normalization and invalid/cross-site origins. The state-save integration test passed after the fix. Other changed mutation endpoints still need complete UI workflow tests.

Generated preview bundles and ignored QA artifacts were excluded from ESLint. This removes generated-code lint failures without excluding application source.

## Build and automated checks

- Source-size check, web/mobile/scanner TypeScript checks passed.
- ESLint passed with three existing mobile image warnings and no errors.
- 553 automated tests passed, including the two new origin checks.
- Production build passed after retrying with access to generated build files. An initial build attempt failed on filesystem permissions; a separate live test attempt encountered a transient Windows connection-buffer error and was retried.

## Remaining end-to-end coverage

Page-load and read-API coverage must not be described as full feature verification. Still outstanding: browser-driven create/edit/delete across bills, insurance, contracts, correspondence, contacts, health, vehicles, trips, family schedules, wills and memories; household invitation/acceptance/roles; trusted emergency access; physical links and home handover; reminder lifecycle; capture/review/document sharing and downloads; signup/reset-email delivery; account deletion; real phone offline/online sync, conflicts and device permissions; real subscription transactions; deployed-domain checks. Relevant automated contract tests passed, but these live user journeys have not all been exercised.

The immediate next step is fixing database isolation and the document schema mismatch, then repeating the blocked checks before continuing the remaining user journeys. No public deployment occurred.

## Final live check ledger

| Check | Result | Evidence |
| --- | --- | --- |
| QA A password sign-in | Pass |  |
| QA B password sign-in | Pass |  |
| QA A authenticated bootstrap | Pass | HTTP 200 |
| QA B authenticated bootstrap | Pass | HTTP 200 |
| Desktop save reaches database | Pass | HTTP 200  |
| Saved profile survives fresh request | Pass |  |
| QA B cannot see QA A private state | Pass |  |
| Database ownership prevents cross-account read | Fail | rows=1 error=none |
| Cross-account delayed write rejected | Pass | HTTP 409 |
| Stale revision cannot overwrite newer changes | Pass | HTTP 409 |
| Anonymous account data blocked | Pass |  |
| Isolation probe uses QA B identity | Pass |  |
| Raw QA B token cannot retrieve QA A marker | Fail | HTTP 200; only synthetic QA A row queried |
| Recipe create via mobile API | Pass | HTTP 200  |
| Mobile recipe visible to desktop bootstrap | Pass |  |
| Recipe update persists | Pass | HTTP 200 |
| Recipe deletion persists when another recipe remains | Pass | HTTP 200  |
| Document quota and signed upload preparation | Pass | HTTP 200  |
| Synthetic PDF reaches quarantine | Pass |  |
| Document validation and commit | Fail | HTTP 503; scanner=unavailable DiaryDock could not confirm this upload. Please try again. |
| Ask response | Pass | HTTP 200; usedAI=false  |
| Inbound email configured | Fail | HTTP 200; configured=false |
| Page /dashboard | Pass | HTTP 200 |
| Page /files | Pass | HTTP 200 |
| Page /capture | Pass | HTTP 200 |
| Page /intake | Pass | HTTP 200 |
| Page /review-inbox | Pass | HTTP 200 |
| Page /reminders | Pass | HTTP 200 |
| Page /search | Pass | HTTP 200 |
| Page /ask | Pass | HTTP 200 |
| Page /guardian | Pass | HTTP 200 |
| Page /review-actions | Pass | HTTP 200 |
| Page /room/kitchen | Pass | HTTP 200 |
| Page /kitchen/calendar | Pass | HTTP 200 |
| Page /kitchen/meal-planner | Pass | HTTP 200 |
| Page /kitchen/pantry | Pass | HTTP 200 |
| Page /kitchen/recipes | Pass | HTTP 200 |
| Page /kitchen/notes | Pass | HTTP 200 |
| Page /kitchen/documents | Pass | HTTP 200 |
| Page /family | Pass | HTTP 200 |
| Page /family/household | Pass | HTTP 200 |
| Page /family/household/profiles | Pass | HTTP 200 |
| Page /family/schedules | Pass | HTTP 200 |
| Page /family/kids-schedules | Pass | HTTP 200 |
| Page /bedroom | Pass | HTTP 200 |
| Page /room/office | Pass | HTTP 200 |
| Page /office/bills | Pass | HTTP 200 |
| Page /office/insurance | Pass | HTTP 200 |
| Page /office/contracts | Pass | HTTP 200 |
| Page /office/correspondence | Pass | HTTP 200 |
| Page /office/contacts | Pass | HTTP 200 |
| Page /vault | Pass | HTTP 200 |
| Page /room/garage | Pass | HTTP 200 |
| Page /garden | Pass | HTTP 200 |
| Page /room/driveway | Pass | HTTP 200 |
| Page /driveway/trips | Pass | HTTP 200 |
| Page /driveway/travel-checklist | Pass | HTTP 200 |
| Page /driveway/parking-permits | Pass | HTTP 200 |
| Page /home-handover | Pass | HTTP 200 |
| Page /physical-links | Pass | HTTP 200 |
| Page /room/attic | Pass | HTTP 200 |
| Page /wills | Pass | HTTP 200 |
| Page /wills/letters-of-wishes | Pass | HTTP 200 |
| Page /emergency | Pass | HTTP 200 |
| Page /emergency/access | Pass | HTTP 200 |
| Page /settings | Pass | HTTP 200 |
| Page /subscription | Pass | HTTP 200 |
| Page /life-check | Pass | HTTP 200 |
| Page /onboarding | Pass | HTTP 200 |
| Page /analytics-privacy | Pass | HTTP 200 |
| Page /support | Pass | HTTP 200 |
| Mobile API /api/mobile/attic | Pass | HTTP 200 |
| Mobile API /api/mobile/emergency | Pass | HTTP 200 |
| Mobile API /api/mobile/emergency-access | Pass | HTTP 200 |
| Mobile API /api/mobile/family/schedules | Pass | HTTP 200 |
| Mobile API /api/mobile/garage | Pass | HTTP 200 |
| Mobile API /api/mobile/guardian | Pass | HTTP 200 |
| Mobile API /api/mobile/health | Pass | HTTP 200 |
| Mobile API /api/mobile/household | Pass | HTTP 200 |
| Mobile API /api/mobile/kitchen/calendar | Pass | HTTP 200 |
| Mobile API /api/mobile/kitchen/notices | Pass | HTTP 200 |
| Mobile API /api/mobile/kitchen/planning | Pass | HTTP 200 |
| Mobile API /api/mobile/kitchen | Pass | HTTP 200 |
| Mobile API /api/mobile/life-check | Pass | HTTP 200 |
| Mobile API /api/mobile/mailbox | Pass | HTTP 200 |
| Mobile API /api/mobile/office/bills | Pass | HTTP 200 |
| Mobile API /api/mobile/office/contacts | Pass | HTTP 200 |
| Mobile API /api/mobile/office/contracts | Pass | HTTP 200 |
| Mobile API /api/mobile/office/correspondence | Pass | HTTP 200 |
| Mobile API /api/mobile/office/insurance | Pass | HTTP 200 |
| Mobile API /api/mobile/onboarding | Pass | HTTP 200 |
| Mobile API /api/mobile/search | Pass | HTTP 200 |
| Mobile API /api/mobile/settings | Pass | HTTP 200 |
| Mobile API /api/mobile/travel | Pass | HTTP 200 |
| Mobile API /api/mobile/wills | Pass | HTTP 200 |
| Storage usage API | Pass |  |
