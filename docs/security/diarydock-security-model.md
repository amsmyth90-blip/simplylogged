# DiaryDock security model

Status: implemented and independently scanned on 1 September 2026.

## Security objectives

- A user can read another person's record or file only through an explicit, active, resource-scoped grant.
- Revocation removes future row and signed-file access; a recipient cannot manufacture a replacement authorization edge.
- High-impact access changes require a session created within the last 15 minutes at the database mutation boundary.
- Untrusted files are size-bounded, identified from bytes and sent through the configured scanner boundary before readable storage.
- AI retrieval is permission-aware and minimised; questions and record content are not analytics properties.
- Account deletion removes the person's data without silently destroying another active member's shared household.
- Audit history is append-only to ordinary clients and sensitive events are derived server-side or in constrained database functions.

## Authority boundaries

Supabase RLS is the primary row boundary. Storage reads combine the object path owner with current document/permission state. Compound access changes use security-definer functions that derive `auth.uid()` and never accept an owner identity from the browser. Service-role access is isolated to server-only modules for inspected uploads, inbound email, durable rate limiting, revision-checked legacy-state mutations and administrator-approved account deletion.

Household roles are owner, Adult/member and Member/viewer. Sharing is `PRIVATE`, `HOUSEHOLD` or `SELECTED_MEMBERS`; Vault resources are rejected by the generic sharing helper. Household invitation acceptance requires an exact email-bound token, a recent database-backed session, an unexpired invite, no conflicting active membership and an explicit web or native confirmation. Native link tokens remain in memory only. Trusted contacts are a separate model with email-bound, expiring, one-time invitations and individually revocable read-only grants.

The packaged iOS and Android clients render from signed local assets and store account data in a per-account SQLCipher database whose secret and session material use device-protected secure storage. Synchronisation is versioned, owner-free on the wire, revision checked and idempotent. Cached onboarding, household directories, Emergency snapshots, Kitchen read models, Physical Links, Life Check and the owner's Home Handover draft are display-only while offline: access changes and legacy-state edits always return to an authenticated online boundary. Onboarding sends no owner identity, uses the shared bounded catalogue and saves the complete profile/household/Life Check/dashboard selection through one service-only revision check while preserving unrelated state. Emergency responses expose only contacts, plans, home information and care contacts; approved documents come from the existing encrypted document projection. Stale native onboarding, Emergency, Kitchen, Physical Links, Life Check or Home Handover edits return the latest snapshot rather than overwriting it. Home Handover additionally requires recent authentication, limits a draft to 200 explicitly selected items and blocks sensitive categories in the database. Publishing creates an immutable minimal copy for one confirmed recipient email, expires within 30 days and is revocable; received handovers are never written to the offline cache. Life Check uses deterministic rules, tolerates malformed legacy entries at projection, and its targeted transaction cannot replace unrelated account data. Kitchen responses contain only bounded pantry, shopping and noticeboard records and preserve unrelated legacy state during mutation. A notice and its linked reminder effect commit through a service-only, owner-nominated conditional database transaction. Bills, Insurance, Contracts and Correspondence use the same protected pattern: the authenticated API derives the account, applies its small request and rate limits, builds the next compatible state, then invokes one service-only transaction that rechecks the account, revision, linked-record shape and document ownership. The former authenticated RPC entry points are explicitly revoked. Physical Link mutations use a service-only owner-derived transaction; tag secrets are returned only at creation or replacement, temporary QR files are deleted after the device share flow, and oversized descriptive data is reduced before crossing the bounded mobile response channel. Photo and voice notice capture is rate limited, bounded, media-signature checked, prompt-injection hardened and schema validated before the user can save it. Trusted-person directories, received grants, received handovers and one-time invitation secrets are not cached; a received file is authorised through the live database grant on every open, streamed through a bounded signature check, and verified by the client against a response digest. Sign-out purges the local database and session material.

## Files and capture

The private bucket permits owner downloads/deletes and permission-aware reads. Direct authenticated INSERT/UPDATE is disabled. Browser and native-share files go to `/api/documents/upload`, which authenticates before reading, enforces a 10 MiB streaming bound, verifies PDF/JPEG/PNG/WebP/HEIC signatures and invokes the scanner abstraction. Inbound email applies the same checks. Signed open links are short-lived and normal document opens are download-forced.

All API JSON and multipart bodies use shared, byte-counted readers rather than
framework materialisers. Pantry analysis accepts at most eight verified images,
limits each image to 8 MiB and the batch to 16 MiB, caps multipart overhead, times
out the model request, validates an exact bounded response and never returns
provider error detail to the client.

The repository includes signature validation, an authenticated HTTPS scanner adapter and a deployable stateless ClamAV service under `services/malware-scanner`. The service applies per-file and aggregate limits, streams bytes to ClamAV without writing them to disk, exposes daemon-backed readiness, and runs as a non-root container. Production defaults to fail closed when the scanner is absent or unavailable. A production malware-scanning claim still requires deployment evidence showing the private ingress, current signature updates, availability monitoring and matching application/service credentials.

## AI, tokens and privacy

Ask and search retrieve under the user's RLS session and omit raw OCR, private notes and contact details. Ask model calls use reduced citations, `store: false`, structured output and no action tools. Physical Link and emergency invitation secrets are random, hashed at rest, expiring/revocable where applicable and fail without both identity and current resource permission.

Product analytics is off by default, first party and schema-allowlisted. Event properties are exact enums only; content, filenames, questions, contacts, identifiers, Vault material and audit contents are rejected. Events become unreadable after their 90-day expiry and are pruned on later analytics activity; opt-out deletes them immediately.

## Verification

The canonical Codex Security scan `fa32e9f5-eaca-47a1-8f85-dbb72ff0e1df` found eight reportable issues at revision `9ea35560`. All were remediated before release. The linked empty database passed schema lint and 51 live cross-user/RLS checks, including path cloning denial, direct Storage upload denial, owner-deletion protection, service-only rate limiting and atomic action audit creation.

Current deliberate deferrals are native Vault E2EE, verified production deployment of the malware-scanner service, Home Handover email/file export and automatic emergency legacy release.

The follow-up Codex Security scan `766e4a15-266f-4350-8af9-26d431b28e56` found two
request-resource issues in the 4 September 2026 working tree. Both were remediated,
and the post-fix gate passed 507 automated tests, all TypeScript and lint checks,
the 192-route production web build and the 747-module packaged mobile build.
