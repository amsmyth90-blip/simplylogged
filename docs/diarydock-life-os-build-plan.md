# DiaryDock Life OS build plan

Date: 1 September 2026
Source audit: `docs/diarydock-life-os-gap-audit.md`

## Delivery strategy

Build the Life OS underneath the existing DiaryDock house. Do not replace the room experience or rewrite working modules. Migrate capabilities vertically: add a secure shared foundation, move one real resource through it, prove isolation, then expand to the next resource.

The numbered product phases are not the safe execution order. This plan reorders them by security and data dependency while retaining every requested outcome.

## Non-negotiable release gates

Every milestone that changes runtime behaviour must pass:

1. schema/migration review, including rollback or forward-fix notes;
2. server-side authorization review and relevant RLS policy tests;
3. negative cross-user and cross-household tests;
4. unit and integration tests for new business rules;
5. `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`;
6. mobile and tablet review for changed workflows;
7. security-claim review—UI wording must describe only implemented guarantees;
8. documentation update and a list of deliberately deferred risks.

Do not use production data to develop or test migrations. Use reversible migrations where practical; for irreversible backfills, use an idempotent forward-fix design and record reconciliation counts.

## Milestone 0 — Audit and baseline

Status: complete for repository audit.

Deliverables:

- `docs/diarydock-life-os-gap-audit.md`;
- this dependency-ordered plan;
- clean baseline of 25 passing tests, type checking, lint, and production build.

Production database migration state remains an explicit pre-deployment check because it was outside the repository-only audit scope.

## Milestone 1 — Security truth and authorization kernel

Phases covered: 16, 17, and prerequisites for 1, 6, 9, 11, 12, 13.

Status: in progress. Truthful Vault/Settings/Emergency wording and the typed deny-by-default resource contract are complete. The first persistent vertical slice now supports private, household, and selected-member document visibility using stable user IDs, an atomic sharing RPC, matching document/storage RLS, redacted share/unshare audit events, owner-only mutations, recipient-cache isolation, and a 15-minute recent-sign-in gate for household access changes. The fail-closed live document/storage gate passed all 46 checks against the user-confirmed empty linked project. The migrations are applied to the linked project and the slice is deployed to production. The broader audit service and additional resource types remain.

### Work

- Replace unsupported Vault/settings/trusted-person claims with accurate wording.
- Define central resource types, visibility values (`PRIVATE`, `HOUSEHOLD`, `SELECTED_MEMBERS`), stable subjects, actions, and denial reasons.
- Implement a server-side authorization service and Postgres policy helpers that derive the authenticated user and active memberships internally.
- Add an append-only audit service/catalogue with redacted metadata allow-lists.
- Add recent-auth hooks/interfaces for sensitive changes, initially failing closed where the auth flow cannot prove recency.
- Add disposable Supabase/Postgres test infrastructure for real RLS tests.
- Add security event names for household invitation/join/removal and resource share/unshare; keep analytics separate.

### Exit criteria

- User A cannot select/update/delete User B resources.
- A household member cannot read a private owner resource.
- Removing a member invalidates all household and selected-member grants.
- UI makes no unimplemented E2EE, MFA, biometric, trusted-device, backup, or delegated-emergency claims.

## Milestone 2 — Household and People & Sharing

Phases covered: 1 and part of 17/20.

Status: in progress. Ordinary documents are the first migrated resource. The reusable tables and authorization helper exist, Vault remains excluded, and document interfaces use stable household user IDs. People & Sharing now distinguishes accounts from local profiles and supports explicit Adult/Member invitations, link copy/renew/cancel, role changes, removal, safe non-owner leave into a new empty private household, rename, per-person document visibility summaries, recent-sign-in protection for access changes, and redacted append-only access history. The live RLS gate passed for document rows and stored files, including removal and cross-household denial. The production deployment is live and protected routes fail closed when signed out. Ownership transfer, invitation delivery, and migration of broad household JSON are not complete.

### Data design

- Retain `households`, `household_memberships`, and `household_invites` after tightening constraints.
- Normalise roles to consumer-facing `OWNER`, `ADULT`, and `MEMBER` semantics while separating role from per-resource permission.
- Add `resource_visibility` and `resource_permissions` (or evolve `permission_grants`) using immutable resource and membership/user IDs.
- Default every new resource to `PRIVATE`; explicitly prevent Vault sharing through the generic household path.
- Add membership status/version or an equivalent revocation check so cached grants cannot outlive removal.
- Stop adding fields to `household_state.payload`; retain it only while kitchen/calendar/reminders are migrated.

### Product flows

- Create/rename household, invite, accept, cancel/renew invite, change role, remove member, leave household, and transfer/resolve ownership where safe.
- Build one People & Sharing view that distinguishes profiles from signed-in members and answers “Who can see this?”.
- Add a reusable visibility editor to the first migrated low-sensitivity resource.
- Show access history without sensitive plaintext.

### Tests

- invite email binding/expiry/replay;
- owner/adult/member role matrix;
- private, household, selected-member access;
- leave/remove/rejoin/revoke cases;
- owner transfer and last-owner protections;
- storage access for shared documents using short-lived server-authorized delivery.

### Exit criteria

No supported household member can access a resource solely because it appears in household JSON or because their display name matches a permission row.

## Milestone 3 — Intelligent Capture safety pipeline

Phases covered: 2, immediate part of 3, 16, and 20.

Status: in progress. General capture now verifies binary signatures, uses a replaceable scanner and provider boundary, creates an owner-scoped durable capture job, stores only a minimal proposed-field summary, and records user confirmation against the saved document. The review-before-save UX remains enforced and 55 automated tests pass. A production malware-scanner adapter, durable pre-validation quarantine, PDF page rendering in general capture, and final-confirmation integration for the specialist bill/policy/will/vehicle-receipt screens remain.

### Work

- Introduce durable capture jobs: received, validated, quarantined/scanning, extracting, needs review, confirmed, rejected, failed.
- Validate content signatures as well as MIME/size and add a replaceable malware/security scanning adapter. Quarantine until the configured checks pass.
- Accept images and PDFs in the reusable capture entry point; preserve camera support and multi-page order.
- Create provider-neutral OCR/classification/extraction interfaces. Keep the current OpenAI adapter as one implementation.
- Store extracted fields as proposed facts with value, confidence, source/provenance, and `userConfirmed=false`.
- Replace auto-save with a “We found these details” review screen. Saving authoritative module data and system reminders occurs only after explicit confirmation.
- Add prompt-injection-resistant document instructions, minimal extracted-text retention, redacted logs, timeouts, and cost/rate controls.
- Keep originals private; expose them only through authorization-checked short-lived access.

### Tests

- malformed/empty/oversize/disguised files;
- scanner unavailable/failure/quarantine;
- classification and confidence boundaries;
- provider failure/invalid schema/timeouts;
- low/high confidence still requires confirmation;
- rejected facts never enter authoritative records;
- document content never appears in application/analytics logs.

### Exit criteria

No AI-extracted field, module record, or system reminder becomes authoritative without a traceable user confirmation.

## Milestone 4 — Life Graph integration and automatic record proposals

Phases covered: 3, 10, 14, and prerequisites for 4/6/7/9/13/15.

Status: in progress. The existing Life Graph schema is now protected with same-owner relationship/fact/link triggers and confidence bounds. Confirmed capture fields can create idempotent, owner-only action proposals for MOT, appliance/warranty and pet-vaccination pilots. Users can keep or dismiss these suggestions, and nothing mutates an authoritative module record silently. Execution adapters, durable module repositories and relationship backfills remain.

### Work

- Build repositories/services for existing `life_entities`, `life_relationships`, `life_facts`, provenance, events, and document links.
- Add integrity constraints: same-authority relationship checks, confidence bounds, unique active relationship keys, and authorization propagation.
- Create idempotent adapters from existing documents, vehicles, policies, pets, trips, bills, warranties, and contacts.
- Implement `action_requests` as user-visible proposals, never silent mutation.
- Ship three vertical capture flows first: vehicle MOT, appliance receipt/warranty, and pet vaccination.
- Add a progressive-disclosure asset record with documents, warranty, maintenance, location, service history, and explicit visibility.

### Exit criteria

Each pilot scan can propose multiple linked actions; users can accept/reject them independently; retries cannot create duplicates; every fact and relationship has provenance.

## Milestone 5 — Central reminder engine

Phases covered: 5, part of 4 and 20.

Status: in progress. Reminders now support authoritative timestamps, user/system origin, source resource/date, rule version, bounded schedule offsets and stable dedupe keys. The authenticated synchronization function safely updates date changes, removes obsolete generated offsets and preserves manual/completed reminders. Approved capture reminder proposals execute through this engine. Remaining work includes migrating legacy manual due-date labels, module update adapters, notification delivery and Guardian-generated schedules.

### Work

- Add authoritative due timestamp/time zone, origin (`USER_CREATED`/`SYSTEM_GENERATED`), rule ID/version, source resource/date, and dedupe key.
- Configure record-type schedules (90/60/30/14/7/1 days as appropriate).
- Recalculate system reminders transactionally when source dates change; preserve unrelated user reminders.
- Prevent duplicates across capture, Guardian, and manual edits.
- Keep the existing reminders UI and adapt it to the new model.

### Exit criteria

Changing an MOT/insurance/warranty date updates only its generated reminder set; repeated evaluations remain idempotent.

## Milestone 6 — Guardian deterministic briefing

Phases covered: 4 and part of 5/20.

Status: implemented for authoritative structured dates. Guardian now persists owner-scoped, versioned and deduplicated findings; reconciles expiry, renewal, service and vaccination dates from the central reminder engine; uses source time zones; and provides a calm briefing with source, resolve, dismiss and seven-day snooze controls. Boundary, daylight-saving, dedupe and migration-policy tests cover the implemented registry. Missing-link, stale-review and travel-readiness adapters remain dependent on their future authoritative module records.

### Work

- Add `guardian_findings` with type, severity, resource, status, due dates, rule version, timestamps, and household scope.
- Build a versioned rule registry for the requested expiry, renewal, missing-link, stale-review, and travel-readiness rules.
- Evaluate on relevant record changes plus a scheduled reconciliation job.
- Present one calm briefing (“3 things need your attention”) with resolve/dismiss/snooze paths.
- Permit AI only to explain/summarise already-authorized deterministic findings.

### Exit criteria

Rules are deterministic, versioned, idempotent, non-alarmist, and covered with boundary-date/time-zone tests.

## Milestone 7 — Life Check and Organisation Score

Phases covered: 7, 8, and 20.

Status: implemented. Existing onboarding now records explicit applicability for home tenure, vehicles, pets, international travel, household collaboration, private document storage and reminders. The editable Life Check produces a deterministic 0–100 score, category breakdown and direct recommendations from a configuration-driven registry. Areas marked “No / not applicable” are excluded rather than penalised, and the static mock readiness score has been removed from the dashboard.

### Work

- Extend the current onboarding rather than replace it.
- Store explicit applicability answers: own/rent, vehicles, pets, international travel, household collaboration, document storage, reminders, and “not applicable”.
- Add a configuration-driven completeness registry with module adapters and category weights.
- Produce 0–100 overall/category scores using only applicable areas.
- Generate deterministic, actionable recommendations linked to the exact missing fact/resource.

### Exit criteria

No pet/vehicle means exclusion, not a penalty; score changes are explainable and unit-tested; onboarding personalises the current dashboard.

## Milestone 8 — Physical Links and smart assets

Phases covered: 9, completion of 10, and part of 17/20.

Status: implemented for the appliance/boiler pilot. Smart items now have progressive owner/permission-aware records and Physical Links use random public lookups plus one-time secrets whose hashes alone are stored. The authenticated resolver is non-disclosing and enforces the normal resource permission function. Owners can create, rename, reassign, disable/re-enable, revoke and atomically replace QR/Web-NFC tags, with last-used metadata and successful-open audit events.

### Work

- Add `physical_links` with a public lookup identifier, hashed secret/verifier, resource reference, owner/household, status, replacement chain, and last-used metadata.
- Generate cryptographically random, non-sequential, revocable QR/NFC payloads with no raw resource ID.
- Build an authenticated resolver that performs the normal resource authorization check before redirecting.
- Support activate, rename, reassign, revoke, replace, disable, and last-used display.
- Start with appliance/boiler assets and use standards-based deep links compatible with web and Capacitor.

### Exit criteria

Unknown, tampered, expired, revoked, replaced, and unauthorized links reveal neither resource existence nor private metadata.

## Milestone 9 — Permission-aware universal search

Phases covered: 13 and part of 14/20.

Status: implemented. Search now runs through an authenticated, rate-limited server endpoint whose Supabase session applies document, reminder, asset and owner-state RLS before deterministic ranking. Minimal results cover documents, Home, vehicles, pets, travel, insurance, contacts, assets and reminders with category and date filters. Raw OCR, private notes, phone numbers, email and addresses are deliberately excluded from retrieval and results.

### Work

- Define a server-side search projection/result schema with category, title, expiry, resource link, and authorization scope.
- Add module adapters for Home, vehicles, pets, travel, documents, warranties, insurance, contacts, assets, and reminders.
- Filter permissions in the database/repository before ranking; never fetch private candidates and discard them only in the UI.
- Keep current direct navigation and recent/common searches.
- Add expiry/date filters without indexing highly sensitive plaintext unless explicitly designed.

### Exit criteria

Private household records cannot affect result titles, counts, snippets, suggestions, or timing-visible existence checks.

## Milestone 10 — Ask DiaryDock

Phases covered: 6, part of 13/14/16/17/20.

Status: implemented. Ask DiaryDock authenticates first, reuses the RLS-backed search loader, locally selects no more than eight minimal records, and returns structured answers with verified links to the records used. The model receives no full account payload, raw OCR, notes, contact details, database IDs, routes or action tools. Provider failure falls back to a deterministic cited answer; no-match questions do not invoke AI.

### Work

- Parse question intent, resolve authenticated scope, retrieve the minimum authorized records, and generate a structured answer with citations.
- Use the same authorization service as normal pages and search.
- Never send the entire account/app state to a model.
- Add source links, uncertainty, “not found/not accessible” handling, redacted audit metadata, and strict tool schemas.
- Add model/provider abstraction, request limits, retention controls, and injection-resistant context separation.

### Exit criteria

Every factual DiaryDock answer cites an authorized record; inaccessible records never enter model input; adversarial document text cannot request tools or broaden retrieval.

## Milestone 11 — Trusted emergency access

Phases covered: 11, 16, 17, and 20.

Status: implemented. Trusted contacts are separate from household members and use expiring, email-bound, one-time invitations. Owners grant individual approved documents, instructions, contacts or home facts after recent authentication; grants are read-only, independently revocable and audited. Selected files use short-lived signed URLs with an active-grant storage policy. Vault, complete-account and automatic inactivity/legacy release are explicitly excluded.

### Work

- Model trusted contacts separately from household membership.
- Add explicit category/resource grants, consent, recent-auth confirmation, expiry/revocation, notifications, and audit history.
- Create an external identity/invitation and limited access experience that fetches only authorized resources.
- Exclude all Vault resources by default; any future Vault access requires the separate E2EE/recovery design.
- Design future delayed/inactivity release fields but do not implement automatic release.

### Exit criteria

A trusted contact sees only selected resources; removal/revocation takes immediate effect; there is no complete-account or automatic legacy release.

## Milestone 12 — Vault E2EE design gate

Phases covered: 12 and security documentation from 21.

### Required documents before implementation

- `docs/security/vault-e2ee-threat-model.md`;
- `docs/security/vault-e2ee-architecture.md`;
- `docs/security/vault-recovery-model.md`.

The documents must decide browser/mobile trust boundaries, key hierarchy, authenticated encryption, derivation, device enrolment, multi-device key wrapping, recovery, password changes, lost devices, rotation, metadata leakage, backups, deletion, logout, and offline storage. They must state exactly what the server can decrypt and what happens when recovery material is lost.

Status: design gate completed; implementation intentionally deferred. The source-backed threat model confirms current Vault/All Files content is private server-managed plaintext, not E2EE. The target architecture requires a separate versioned encrypted-object pilot, reviewed AEAD/KDF construction, native secure key storage and an independently signed client before claiming protection from the DiaryDock server. The recovery model uses enrolled devices or offline high-entropy recovery material and explicitly makes loss of both unrecoverable.

### Decision gate

Proceed only after architecture/security approval and a reviewed library/platform choice. Implement a small versioned encrypted-object pilot with known-answer and recovery tests before migrating real content. If the current hosted-web/Capacitor model cannot provide the agreed trusted-client guarantees, document the required native/platform migration and defer E2EE.

### Exit criteria

DiaryDock makes an E2EE claim only for content whose plaintext is encrypted on the trusted client and cannot be decrypted by the server with server-held material.

## Milestone 13 — Home handover foundation

Phases covered: 15 and part of 10/14/16.

Status: implemented as an owner-only selection and preview foundation. Eligible appliances, boilers, equipment and narrowly classified linked property documents can be explicitly added after recent authentication. The database derives minimal previews and provenance, records redacted audit events and structurally excludes sensitive categories, emergency data and Vault. No recipient access, publishing or export exists yet.

### Work

- Add explicit transferable classification to eligible property/assets facts and documents.
- Build a selection manifest and preview that structurally excludes personal, financial, correspondence, household-private, emergency, and Vault data.
- Record provenance and transfer audit; require recent auth and explicit confirmation.
- Optionally create a printable pack only after selection/export tests prove exclusions.

### Exit criteria

Nothing transfers by inheritance from household/home association alone; every included resource is explicitly eligible and selected.

## Milestone 14 — Privacy-conscious analytics

Phases covered: 18 and part of 17/20.

### Work

- Decide provider, consent, region, retention, deletion, and subscription identifiers.
- Create central typed event constants for the requested funnel.
- Enforce per-event payload allow-lists containing identifiers/categories only—never document titles/text, questions, contact details, policy numbers, or filenames.
- Track signup → onboarding → first useful action → return usage → subscription without joining security audit content into analytics.

### Exit criteria

Automated tests reject unknown event names and sensitive payload keys; legal/cookie text and consent behaviour match actual collection.

## Milestone 15 — Final hardening, documentation, and completion report

Phases covered: 16, 19, 20, 21.

### Work

- Run full authorization, RLS, upload, AI, token, rate-limit, audit, privacy, and account-deletion review.
- Review CSP against the installed Next.js documentation and deployed behaviour; remove unsafe directives where feasible using supported nonces/hashes.
- Perform mobile/tablet accessibility and progressive-disclosure review.
- Complete the requested architecture/product/security documents using implemented facts.
- Produce `docs/diarydock-life-os-completion-report.md` with implemented/existing work, schema/API/components/services, tests, risks, deferrals, actual E2EE status, and accurate security claims.

## Documentation map

Write each document with its owning milestone:

| Document | Milestone |
|---|---:|
| `docs/architecture/diarydock-life-os.md` | 1, maintained through 15 |
| `docs/architecture/household-sharing.md` | 2 |
| `docs/architecture/intelligent-capture.md` | 3 |
| `docs/architecture/reminder-engine.md` | 5 |
| `docs/architecture/guardian.md` | 6 |
| `docs/architecture/organisation-score.md` | 7 |
| `docs/product/diarydock-life-check.md` | 7 |
| `docs/product/diarydock-organisation-score.md` | 7 |
| `docs/architecture/physical-links.md` | 8 |
| `docs/architecture/ask-diarydock.md` | 10 |
| `docs/security/diarydock-security-model.md` | 1, maintained through 15 |
| Vault threat/architecture/recovery documents | 12 |
| `docs/diarydock-life-os-completion-report.md` | 15 |

## Recommended first implementation slice

The first code slice should be deliberately narrow:

1. correct unsupported security/emergency wording;
2. add typed resource visibility and authorization decisions;
3. add audit event constants/service boundary;
4. create real RLS negative-test infrastructure;
5. migrate document visibility from display names to stable membership IDs;
6. change general capture from automatic filing to explicit review and confirmation.

This slice removes current risk and creates the foundation required by every high-value feature that follows.
