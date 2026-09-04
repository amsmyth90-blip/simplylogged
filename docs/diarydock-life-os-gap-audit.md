# DiaryDock Life OS gap audit

Date: 31 August 2026
Scope: repository state at commit `59413f2` on branch `codex/android-java21-main`, including tracked migrations and the existing uncommitted user files listed by `git status`. No production database, production storage, deployment, or external account was inspected or changed.

## Executive conclusion

DiaryDock is already a broad, polished consumer application. It is not a blank-slate build. The existing Next.js/Supabase/Capacitor foundation, room-based design language, private document bucket, document extraction endpoints, household invitation flow, structured `documents` and `reminders` tables, and most feature workspaces should be retained.

The requested Life OS is not complete, however. The repository has two architectural generations operating together:

1. The current product stores most domain data in the per-user `app_state.payload` JSON document, with a smaller household JSON document for selected shared areas.
2. The newer Life OS migration adds entity, relationship, fact, inbox, permission, action, event, provenance, and audit tables, but these tables are mostly foundations and are not yet the system of record used by the UI.

The largest release blockers are permission semantics and product truthfulness, not missing screens:

- household sharing is coarse-grained and a collaborator can read/write the whole `household_state.payload`; it does not implement `PRIVATE`, `HOUSEHOLD`, and `SELECTED_MEMBERS` per resource;
- document sharing stores a person's display name rather than an immutable membership/user identifier and does not grant the named person database access to the owner's row or file;
- the general capture flow automatically saves AI-classified data and a reminder before showing a review/confirmation step;
- the Vault is private server-managed storage, not end-to-end encrypted; some current UI labels imply device, backup, MFA, biometric, and auto-lock controls that the repository does not implement;
- emergency access is an authenticated view inside the same account, not a trusted-person access system;
- the Life OS tables use owner-only RLS and are not yet integrated with resource-aware household policies.

The safe strategy is evolutionary: preserve the house/room experience, replace broad JSON sharing with explicit server-enforced resource visibility, make capture confirmation authoritative, and migrate modules into the Life Graph incrementally.

### Post-audit implementation note

The first risk-reduction slice was implemented immediately after the baseline audit:

- general document capture now pauses at an editable “We found these details” screen and writes the document/reminder only after the user selects **Confirm and save**;
- Vault, Settings, and Emergency screens now describe the current private-storage/account-preview behaviour accurately and explicitly state that Vault documents are not end-to-end encrypted;
- `lib/resource-access.ts` defines the initial deny-by-default `PRIVATE` / `HOUSEHOLD` / `SELECTED_MEMBERS` decision contract, blocks generic Vault sharing, rejects removed/wrong-household access, and uses action-specific selected-member grants;
- `shared_resources` and stable-user `resource_permissions` now back the first real sharing slice for ordinary documents. One atomic RPC manages grants, document and storage RLS use the same active-membership decision, shared recipients are read-only, and non-owned documents are excluded from private app-state caches;
- sharing changes produce redacted `RESOURCE_SHARED` / `RESOURCE_UNSHARED` audit rows when the audit table is present;
- People & Sharing now exposes the real household directory, consumer-facing roles, email-bound invitation links, role/removal/leave/rename controls, per-person document visibility summaries, and redacted access history; household profiles remain a separate organisational concept;
- leaving or removal explicitly revokes selected grants, and leave creates an empty private household without copying broad shared JSON state;
- capture, authorization, household-role/summary, migration-invariant, RLS-target safety, and cache-isolation tests raise the current suite to 52 passing tests. The user-confirmed empty linked Supabase project now has the household migrations and UUID-compatibility forward fix applied. The live five-actor database and storage gate passes all 46 checks with clean test-data removal.

The classifications below describe the audited baseline unless the row explicitly references a later slice. Persistent document sharing and live RLS verification were delivered first; recent authentication and two-person ownership transfer are now implemented, while broader resource coverage and the remaining incremental Household experience continue beyond that baseline.

## Classification legend

| Classification | Meaning |
|---|---|
| `COMPLETE` | Meets the requested repository-level requirement and has a working path plus proportionate verification. |
| `PARTIAL` | Useful working behaviour exists, but important requested behaviour is absent. |
| `MISSING` | No material implementation exists. |
| `NEEDS REFACTOR` | Existing behaviour should be retained but its current design cannot safely support the requested capability. |
| `SECURITY CONCERN` | Current behaviour or wording could create an access-control, privacy, data-integrity, or security-claim risk. |
| `NOT APPLICABLE` | The requirement does not apply to the current product/stack. |

## Current architecture

### Framework and delivery

- Next.js App Router `16.3.0`, React `19.1.0`, TypeScript `5.8.3`, Tailwind `3.4.17`.
- Supabase SSR/browser clients provide authentication, Postgres access, RLS, and private object storage.
- Capacitor `8.4.2` packages the local React mobile bundle for Android/iOS; Android includes a native share-import plugin.
- Vercel/Codemagic configuration exists. Remotion is used for promotional media, not the product runtime.
- `app/*` contains thin authenticated route wrappers; large client workspaces in `components/*` contain most UI and mutation logic.

Relevant files: `package.json`, `next.config.ts`, `proxy.ts`, `capacitor.config.ts`, `codemagic.yaml`, `app/layout.tsx`, `components/DiaryDockDataProvider.tsx`.

### Authentication

- Supabase email/password authentication is used.
- Protected page routes normally call `requireUser()` server-side.
- Sensitive API routes independently call `supabase.auth.getUser()`.
- Login, signup, callback, forgotten-password, reset-password, logout, and account-deletion flows exist.
- No repository-backed MFA enrolment, recent-auth challenge, trusted-device registry, biometric unlock, or recovery-code management was found.

Relevant files: `lib/auth.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts`, `app/login/*`, `app/signup/page.tsx`, `app/auth/callback/route.ts`, `app/reset-password/page.tsx`, `app/api/account/deletion/request/route.ts`.

### Database and current schema

The data layer is hybrid.

Current product tables in `supabase/schema.sql`:

- `app_state` — private, per-user JSON application state;
- `documents` — structured document metadata, OCR/extraction text, confidence, review state, storage reference, emergency flag, and legacy `shared_with` JSON;
- `reminders` — structured user reminders linked optionally to a document;
- legacy `household_members`, `family_invites`, and `document_permissions`;
- `rate_limit_buckets`;
- storage bucket/policies for `diarydock-documents`.

Later migrations add:

- `households`, `household_memberships`, `household_state`, and `household_invites`;
- `account_deletion_requests`;
- Life OS foundations: `life_entities`, `life_relationships`, `provenance_records`, `life_facts`, `life_document_links`, `life_events`, `life_inbox_items`, `permission_grants`, `action_requests`, `action_steps`, and `audit_events`.

Most specialist records—bills, policies, contracts, correspondence, contacts, vehicles, trips, health, wills, household profiles, pets/garden, and family stories—remain nested inside `app_state.payload`. `lib/diarydock-data.ts` is therefore still the main product repository.

The migration set is not consolidated into `supabase/schema.sql`; a new environment must apply both the baseline schema and migrations in the correct order. Production migration status was not inferred from repository files.

### Storage

- `diarydock-documents` is private, limited to 4 MB, and restricts declared MIME types.
- object names use `{auth.user.id}/{documentId}/{sanitisedName}`;
- storage RLS restricts a user to their prefix;
- signed preview/open links currently last 300/60 seconds;
- client and bucket validation check size and declared MIME type;
- no malware scanner, file signature/magic-byte validation, content disarm, quarantine state, or asynchronous security scan was found.

Relevant files: `supabase/schema.sql`, `lib/document-storage.ts`, `lib/document-rules.ts`, `lib/structured-data.ts`.

### API architecture

There are seven product API families:

- `/api/capture/extract` — authenticated, rate-limited AI vision extraction;
- `/api/kitchen/analyse`, `/api/kitchen/noticeboard/extract`, `/api/kitchen/recipes/scan` — authenticated AI features;
- `/api/kitchen/recipes/search` — authenticated external recipe search;
- `/api/import/email` and `/api/import/email-address` — inbound email ingestion/address management;
- `/api/account/deletion/request` and `/api/admin/account-deletion/process` — deletion workflow.

The product does not yet have server routes/services for household resource sharing, Guardian, central reminder generation, Ask DiaryDock, organisation scoring, physical links, trusted contacts, or universal search. Household management is performed by Supabase RPCs called from the browser.

### Existing AI and document processing

- OpenAI vision extraction exists behind `createVisionJsonResponse()`.
- General document, will, bill, insurance, and vehicle-receipt schemas/prompts exist.
- AI endpoints authenticate and rate-limit requests and use structured JSON schemas.
- Feature-specific extraction contains good cautionary language for wills, bills, insurance, and receipts.
- General capture accepts photographed image pages, compresses them in the browser, optionally combines multiple pages into a PDF, extracts data, stores the original, creates a document, and may create a reminder.
- Email/share-sheet import and a review inbox exist.

The adapter only abstracts one OpenAI vision call shape; classification, OCR, prompts, persistence, and review state are not yet expressed as a provider-neutral processing job/pipeline. Extracted data is mostly one summary object, not per-field `{value, confidence, source, userConfirmed}` facts.

Relevant files: `app/api/capture/extract/route.ts`, `lib/brain/provider-adapters/openai.ts`, `lib/brain/extraction/confidence.ts`, `lib/document-extraction.ts`, specialised `*-document-analysis.ts` files, `components/DocumentCaptureWorkspace.tsx`, `lib/life-inbox/*`.

### Current permissions and sharing

- Owner rows in `app_state`, `documents`, `reminders`, and Life OS tables use `auth.uid()` RLS.
- Household membership/invite RPCs validate authenticated membership and owner-only management for role changes/removal.
- `household_state` permits owner/member read and write of one shared JSON payload.
- The shared payload currently includes reminders, meal planning, kitchen data, family calendar, kid schedules, and household profiles.
- Viewer membership has no `household_state` read policy.
- Document `sharedWith` values are converted into `document_permissions.subject_name`; the subject is not a user/membership foreign key and there is no recipient-side RLS/storage policy.
- The `permission_grants` Life OS table is owner-only and unused by normal resource retrieval.

This is deny-by-default for owner records but is not yet a functional explicit sharing system.

### Security architecture

Existing strengths:

- authenticated server routes and owner-scoped RLS;
- private storage and short-lived signed URLs;
- server-only service-role client;
- shared database rate limiter;
- inbound webhook verification and deduplication;
- input schemas for AI responses;
- CSP and common browser security headers;
- account-deletion workflow;
- confirmation policy primitives for future actions.

Current concerns:

- broad household JSON read/write prevents per-resource privacy and safe revocation semantics;
- some domain mutations happen entirely in client state and rely on later persistence rather than a server-authorised operation;
- the general capture endpoint trusts a file's declared MIME type and sends its content directly to the AI provider;
- uploaded content has no explicit prompt-injection/hostile-document boundary;
- the production web CSP permits `'unsafe-inline'` for the current Next.js rendering mode but no longer permits `'unsafe-eval'`; the packaged mobile CSP permits neither;
- no recent-auth check protects sensitive security/share changes;
- no application service writes meaningful `audit_events`;
- no cross-user/household negative integration tests exist;
- UI security labels exceed implemented guarantees.

### Existing modules and pages

Implemented user-facing areas include dashboard/rooms, files and document detail, capture/review inbox, Vault, reminders, search, onboarding, family/household/schedules/calendar, emergency, kitchen, office bills/contracts/correspondence/contacts/insurance, wills, vehicles/MOT/tax/service/costs, trips/travel checklist, health, garden/pets sections, attic/family stories, settings/support/legal, and account deletion.

The room metaphor and responsive dashboard are strong product assets. The build should add services beneath these workspaces rather than replace them with an enterprise-style navigation or administration console.

### Testing and analytics

The current automated suite has 25 passing tests covering action-risk decisions, dashboard area selection, upload validation, inbound-email helpers, inbox dedupe, rate limiting, and recipe search. Type checking, lint, and the 134-route production build pass on the audited commit.

No browser/integration database tests, RLS tests, household isolation tests, AI retrieval tests, Guardian/reminder-engine tests, NFC tests, emergency-access tests, or organisation-score tests were found.

No product analytics SDK/service or central event catalogue exists. `audit_events` is a table definition only. The cookie page correctly states that non-essential analytics are not currently present.

## Feature-by-feature gap classification

### Phase 1 — DiaryDock Household

| Feature | Status | What exists / gap / security implication |
|---|---|---|
| Household and membership | `PARTIAL` | `households`, `household_memberships`, owner/member/viewer roles, auto-provisioning, and a directory UI exist. Requested `OWNER/ADULT/MEMBER` semantics and future-granular role design are not final. |
| Create household | `PARTIAL` | `ensure_user_household()` silently creates one household per user. There is no deliberate create/rename/select household experience. |
| Invite and accept | `PARTIAL` | Email-bound, expiring UUID invites and acceptance exist. The repository does not send the invitation itself and invite access labels are mapped heuristically to roles. |
| Remove member | `PARTIAL` | Owner-only soft removal exists. Removed-member resource tests and audit events are absent. |
| Leave household | `MISSING` | No self-leave/ownership-transfer flow exists. |
| Resource visibility | `MISSING` | No durable `PRIVATE`, `HOUSEHOLD`, `SELECTED_MEMBERS` visibility on supported resources. |
| SharedResource/ResourcePermission | `SECURITY CONCERN` | Broad `household_state.payload` and display-name document permissions cannot safely answer or enforce “Who can see this?”. |
| Revoke access | `PARTIAL` | Member removal and invite cancellation exist, but per-resource grant revocation does not. |
| Access audit | `MISSING` | `audit_events` exists but household/share operations do not write it. |
| People & Sharing UX | `PARTIAL` | Household profile/directory screens exist, but profile presence, app membership, role, and resource visibility are not presented as one authoritative access view. |

Dependencies: security/audit contracts, stable member identifiers, server-side authorization functions, structured resources, and migration away from shared JSON.

### Phase 2 — Intelligent Capture

| Feature | Status | What exists / gap / security implication |
|---|---|---|
| Camera/photo/image capture | `PARTIAL` | Multi-page photographed image capture exists; the general capture picker does not accept PDF despite storage supporting it. Feature-specific upload flows also exist. |
| Upload validation | `PARTIAL` | Size, page count, filename, declared MIME, and binary-signature checks exist. The scanner interface and durable security status are present, but the default honestly reports scanner unavailability; production malware scanning and pre-validation quarantine remain. |
| OCR/classification/extraction | `PARTIAL` | AI vision supplies text, room/category suggestions, dates and confidence. Requested extensible document classes and per-field provenance/confirmation are absent. |
| Provider abstraction | `PARTIAL` | Capture analysis now uses a provider-neutral interface with OpenAI as the current adapter. Business prompts remain in the route and should move into versioned classifiers as automatic record proposals are added. |
| Confidence and review | `PARTIAL` | The post-audit slice adds explicit editable confirmation before persistence. Per-field `{value, confidence, source, userConfirmed}` facts and durable capture jobs remain outstanding. |
| Processing job lifecycle | `PARTIAL` | Owner-scoped `capture_jobs` persist extraction, review, confirmation and failure states without retaining original bytes or OCR text. Earlier received/validated/quarantine persistence and specialist-workflow confirmation links remain. |

Dependencies: private file policy, capture job schema, provider interface, provenance/facts, and explicit confirmation UI.

### Phase 3 — Automatic record creation

Status: `MISSING`.

Feature-specific bill/insurance/vehicle-receipt import can populate records, and general capture can create a document/reminder, but there is no reusable proposal system that offers multiple user-controlled actions such as create appliance, attach receipt, create warranty, update vehicle, or record vaccination. The existing `action_requests` table/types are suitable foundations but are not integrated.

Dependencies: confirmed capture facts, Life Graph entity/document links, action proposals, module adapters, and idempotency.

### Phase 4 — DiaryDock Guardian

Status: `PARTIAL`.

`lib/watch/rules.ts` deterministically converts generic life events within 90 days into insights. `life_events` exists. There is no `GuardianFinding` persistence, rule registry/versioning, requested types/severities/statuses, scheduled evaluation, user briefing, dismissal/resolution flow, or module-specific rules. Existing wording for overdue items should be softened to match Guardian's non-alarmist requirement.

Dependencies: structured dates/events, central reminder engine, Life Graph links, and audit/events.

### Phase 5 — Automated reminder engine

Status: `NEEDS REFACTOR`.

Structured reminders and a useful manual reminder UI exist, and capture can create a reminder. The model stores human display labels rather than an authoritative due timestamp and has no `USER_CREATED`/`SYSTEM_GENERATED`, source rule, source resource, dedupe key, schedule offsets, or safe resynchronisation when a source date changes. Reminder creation remains distributed across workflows.

Dependencies: typed due dates/events, idempotency keys, central rule registry, provenance, and notification delivery decisions.

### Phase 6 — Ask DiaryDock

Status: `MISSING`.

There is no conversational endpoint/UI, permission-aware retrieval service, citation model, minimal context builder, or AI permission-boundary test. Existing extraction AI must not be treated as Ask DiaryDock.

Dependencies: authoritative resource authorization, universal search/retrieval, Life Graph migration, audit policy, and cited answer schema.

### Phase 7 — Life Organisation Score

Status: `MISSING`.

No scoring engine, configurable weighting, applicability registry, category score, recommendation rule, or UI exists. Onboarding selections can provide applicability inputs later.

Dependencies: Life Check answers, module completeness adapters, confirmed facts, and deterministic rule configuration.

### Phase 8 — DiaryDock Life Check

Status: `PARTIAL`.

Four-step onboarding asks name, household shape, and optional areas, then personalises dashboard visibility. It covers vehicle, pets, travel, family, health, and memories. It does not capture own/rent, international travel, document/reminder preferences, explicit not-applicable decisions, or initialise an organisation score. The existing experience is a good UX foundation.

Dependencies: applicability schema and organisation-score registry.

### Phase 9 — NFC and QR physical linking

Status: `MISSING`.

No physical-link schema, token service, resolver route, QR generation, NFC write/read flow, revocation, replacement, last-used audit, or negative tests exist. Capacitor provides a future native integration path but no NFC feature is implemented.

Dependencies: resource registry, authorization service, audit logging, cryptographically random hashed/token design, and authenticated deep links.

### Phase 10 — Smart appliance / asset record

Status: `PARTIAL`.

`asset` is a Life Graph type, kitchen/home inventory and high-value item screens exist, and documents/warranties can be filed. There is no generic asset system of record with the requested fields, service history, linked documents, maintenance schedule, physical location, visibility, or Physical Links. UI must reuse progressive disclosure rather than add a 20-field form.

Dependencies: Life Graph entities/relationships, document links, reminders, household visibility, and capture proposals.

### Phase 11 — Emergency access

Status: `PARTIAL` after the post-audit wording correction.

Emergency contacts/plans/home notes and an `emergencyVisible` document flag exist. `/emergency/access` is merely another authenticated preview in the account and reads the current user's state. There is no trusted-contact identity, selected-resource grant, external access flow, recent authentication, notification, revocation history, or audit. The post-audit slice now labels this accurately as an account preview rather than working delegated access.

Dependencies: household-independent subject identities, explicit grants, audit/notifications, recent auth, file authorization, and a Vault exclusion policy.

### Phase 12 — DiaryDock Vault

Status: `SECURITY CONCERN`.

The Vault has private Supabase storage, owner RLS, signed links, review filters, and document metadata. It is not client-side/E2EE and the server/provider can process plaintext. No key generation, device enrolment, recovery, rotation, encrypted metadata, or offline key model exists. The post-audit slice removed unsupported device/backup/MFA/biometric/auto-lock claims and now describes this as private authenticated storage with short-lived links, explicitly not end-to-end encrypted.

Dependencies: dedicated threat model, platform/key/recovery decisions, cryptographic library review, encrypted object/version schema, and a migration plan. Do not implement E2EE until the three required security documents are approved.

### Phase 13 — Universal search

Status: `NEEDS REFACTOR`.

Client-side search covers current user's documents (including OCR text), static rooms, reminders, mailbox items, and emergency state with direct links. It does not search most structured feature records, has no server-side ranking/category/date filters, and has no explicit authorization boundary beyond whatever data was already loaded into client state. Broad household JSON makes private/shared search isolation unprovable.

Dependencies: resource projections, authorization-aware server retrieval, stable result/citation schema, and module adapters.

### Phase 14 — Connections between modules

Status: `PARTIAL`.

Documents and reminders link by document ID; modules also keep ad hoc arrays/IDs. The Life OS migration and `lib/life-graph/types.ts` define generic entities, relationships, facts, provenance, events, and document links. These are not yet populated or used by normal module pages. This foundation should be integrated rather than replaced with dozens of new foreign-key pairs.

Dependencies: Life Graph repository/service, migration adapters, authorization propagation, and relationship constraints.

### Phase 15 — Home handover foundation

Status: `MISSING`.

No handover selection, transferable-resource classification, export manifest, recipient grant, or pack exists. Generic assets/relationships and explicit sensitivity/visibility are prerequisites. Vault, financial, correspondence, and personal records must remain structurally ineligible.

### Phase 16 — Security hardening

Status: `PARTIAL`.

Authentication, owner RLS, private storage, signed links, rate limiting, upload limits, and action-risk primitives exist. Missing or unproven requirements include per-resource household RLS, IDOR/BOLA tests, revoked-member tests, expired physical-link tests, AI retrieval isolation, recent auth, malware/file-signature checks, central input validation, audit writes, and deny-by-default shared retrieval. The CSP also requires a later nonce-based review.

### Phase 17 — Audit logging

Status: `PARTIAL`.

`audit_events` exists with actor, entity/document/action references and metadata, but there is no audit service, event-name catalogue, append-only restriction, retention/redaction policy, user-visible history, or writes for the requested events. Login/logout may remain primarily in the auth provider unless an application-level event is reliably generated.

Dependencies: central security event service and server-side mutations.

### Phase 18 — Analytics

Status: `MISSING`.

No analytics provider, consent decision, event constants, payload allow-list, funnel events, or subscription linkage exists. Sensitive content must be structurally impossible to add to events. Analytics should be designed after privacy/consent decisions, not mixed with security audit data.

### Phase 19 — UX requirements

Status: `PARTIAL`.

The mobile-first room metaphor, plain-language onboarding, responsive desktop layouts, scan entry point, and progressive cards are strong. Some workspaces are very large and form-heavy, capture hides the confirmation decision, and household/emergency/security wording does not always match technical reality. Future infrastructure should remain invisible behind one clear action per screen.

### Phase 20 — Testing

Status: `PARTIAL`.

The current 25 unit tests pass. The requested domain, integration, RLS, negative permission, Guardian, reminders, score, NFC, search, AI retrieval, and emergency-access suites are missing. Database authorization must be tested against a disposable Supabase instance or equivalent real Postgres/RLS environment; mocked policy tests are insufficient.

### Phase 21 — Documentation

Status: `PARTIAL`.

Strong current-state, target-architecture, Life Graph, AI Brain, permission/action, roadmap, and risk-register documents already exist under `docs/architecture`. The specifically requested household, capture, Guardian, reminder, physical-link, score, Ask, security, Vault E2EE, and product documents do not yet exist. Those should be written alongside their implementation, not filled with aspirational claims.

## Cross-cutting decisions

1. Preserve Next.js, Supabase Auth/Postgres/Storage, Capacitor, the room metaphor, existing module workspaces, and private user storage.
2. Treat `app_state` and `household_state` as transitional compatibility stores. Do not add new security-sensitive resource sharing to them.
3. Make stable user/membership IDs—not display names—the subject of every permission.
4. Add explicit visibility to shareable resources, defaulting to `PRIVATE`; Vault resources remain private unless a separate eligible resource is deliberately selected.
5. Put authorization in database policy functions and server application services. The frontend may request a subject/resource but may not assert ownership or household identity.
6. Treat AI output as proposed facts/actions until confirmed. Confidence controls review priority, not authority.
7. Keep Guardian, reminders, and organisation scoring deterministic; AI may explain results but must not be the safety rule.
8. Use Life Graph tables as the cross-module connection layer, populated incrementally through adapters.
9. Separate security audit events from opt-in product analytics.
10. Do not claim E2EE, biometric unlock, MFA, trusted devices, backup state, auto-lock, or recovery controls unless the corresponding end-to-end implementation is present and verified.

## Phase 0 verification baseline

Executed on 31 August 2026:

- `npm test`: 25 passed, 0 failed;
- `npm run typecheck`: passed;
- `npm run lint`: passed;
- `npm run build`: passed; Next.js generated 134 routes.

## Immediate risk register

| Priority | Risk | Required response |
|---|---|---|
| Addressed in first slice | AI capture auto-saved unconfirmed extracted data | An explicit review/confirm boundary now prevents authoritative persistence or system reminders until confirmation. Per-field confirmed facts remain future work. |
| P0 | Household sharing is a broad mutable JSON document | Stop adding resources to it; introduce explicit resource visibility/grants and migrate one module at a time. |
| Addressed in first slice | Security UI implied unavailable controls | UI now states the current private-storage guarantees and E2EE limitation. |
| Addressed in first slice | Emergency “trusted person” wording exceeded implementation | The screen is now clearly an owner account preview pending a real trusted-contact grant flow. |
| P1 | Display-name document permissions are not authorization identities | Migrate to membership/user IDs and recipient-aware RLS/file access. |
| P1 | Life OS tables are disconnected owner-only scaffolding | Add services, constraints, household-aware policies, and migration adapters before depending on them. |
| Partially addressed | Upload trust is based on declared MIME and direct AI processing | Binary signatures, a replaceable scanner boundary, provider abstraction and durable safe failure states are implemented. A real malware-scanner adapter and quarantine storage still remain. |
| Resolved | No negative database authorization tests | A fail-closed five-actor Supabase harness now verifies document and storage allow/deny paths, removal, and cleanup. |
| P2 | CSP permits unsafe script execution modes | Review nonce/hashing feasibility after current Next.js guidance and deployed behaviour are measured. |

## Dependency outcome

The first implementation milestone must combine truthful security UX, authoritative resource authorization, audit plumbing, and the Household visibility model. Intelligent Capture confirmation should follow immediately because it is a current data-integrity risk. Guardian, reminder automation, scoring, NFC, search/Ask, emergency access, and Vault E2EE all depend on those foundations and should not be implemented ahead of them.
