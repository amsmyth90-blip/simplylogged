# Privacy and document-filing repairs — 11 September 2026

Outcome: **fixed for the two reported failures**, verified against the live DiaryDock database through isolated QA accounts. This is not a full security audit or release sign-off.

Publication update: the website changes were deployed to https://diarydock.com on 11 September 2026. Vercel reported READY for deployment `dpl_6vgLwsmLZHwJZddoZFnZXeDUjZKb`; its production configuration preflight and build passed. Read-only QA-account checks returned HTTP 200 for `/features`, `/subscription`, `/api/diarydock/bootstrap` (matching identity and document list), and `/api/storage/summary`. The public homepage was also verified in the browser. This supersedes the local-only deployment notes below.

## Changes

- `supabase/migrations/20260911140000_private_state_owner_boundary.sql`: replaces the live `app_state` policy whose condition was `true` for public access with owner-only authenticated reads and a restrictive owner boundary. Anonymous access and direct client writes are revoked. Existing service-role save functions remain available. Shared household state remains in its separate table.
- `supabase/migrations/20260911141000_upload_native_id_types.sql`: binds document and reminder IDs to their actual column types using `%type`. This preserves text-schema compatibility and fixes the deployed combination of UUID document IDs, text reminder IDs and UUID reminder references. Reservation ownership, input validation, repeat submissions and service-only execution remain intact.
- `lib/diarydock-record-page-server.ts` and `lib/legacy-document-permissions.ts`: tolerate only a missing legacy display-label table. The live project lacks `document_permissions`; current resource-permission queries, authentication errors and all other database errors still fail closed. This code change is local and requires normal website deployment for a public host to receive it.

The two database repairs were applied through the project's SQL editor. The upload function was updated with guarded substitutions equivalent to the canonical migration, preserving the existing definition outside ID declarations and uses. The first policy submission failed to parse because the editor inserted text into the old inspection query; it applied nothing. The corrected policy transaction and upload-function transaction each returned success. Unrelated pending migrations, including paid-storage changes, were not applied. The migration files are idempotent and remain available for normal migration tooling; SQL-editor application was not recorded as a CLI migration-history operation.

## Ordered verification

1. **Syntax and local boundary tests:** 12 focused PostgreSQL/PGlite tests passed for private state and upload commits, followed by four record-pagination/optional-label tests. Upload tests cover text/text, UUID/text and UUID/UUID document/reminder schemas, wrong-owner rejection, RPC permission denial, repeat commits and linked reminders. RLS tests also add a permissive sibling policy and verify it cannot bypass the restrictive owner rule. Scoped ESLint passed.
2. **Original failures and alternate access paths:** live QA B now receives zero rows for QA A's private state through both the Supabase SDK and raw authenticated PostgREST. Direct cross-owner updates are denied. Mismatched-account saves and stale revisions return 409; anonymous bootstrap is denied.
3. **Legitimate controls:** QA sign-in, bootstrap, server-mediated saves and reloads passed. Synthetic PDF reservation, quarantine transfer, metadata commit, owner download, desktop document listing and linked reminder listing passed. The other QA account received 404 for the document download.
4. **Regression suite:** `npm test` passed all 557 tests. `git diff --check` and `npm run build` passed.

The fresh read-only candidate reviewer found no concrete bypass or regression in the two SQL repairs. The initial independent investigator was interrupted by its safety system after returning preliminary source evidence; the parent completed the remaining pre-patch investigation. The later missing legacy-table issue was reviewed locally at its read/display boundary and verified by the real document-list request.

Live verification command: `DIARYDOCK_E2E_CONFIRM=two-test-accounts node tools/verify-web-e2e.mjs --extended --state-only` (set the variable using PowerShell syntax on Windows). All checks relevant to these repairs passed. The broader command exited 1 because its existing inbound-email check still reports `configured=false`; that is outside this repair. The scanner returned `UNAVAILABLE` and Ask used its non-AI fallback. No claim is made that malware scanning, AI, payments or email are ready.

Only labelled QA records were used for live verification. The accounts and synthetic fixtures remain available for retesting in the ignored `.qa-web-e2e` directory. No existing personal records were intentionally modified, deleted or read. The previously disclosed server key still needs replacement as a separate operation.
