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

Supabase RLS is the primary row boundary. Storage reads combine the object path owner with current document/permission state. Compound access changes use security-definer functions that derive `auth.uid()` and never accept an owner identity from the browser. Service-role access is isolated to server-only modules for inspected uploads, inbound email, durable rate limiting and administrator-approved account deletion.

Household roles are owner, Adult/member and Member/viewer. Sharing is `PRIVATE`, `HOUSEHOLD` or `SELECTED_MEMBERS`; Vault resources are rejected by the generic sharing helper. Trusted contacts are a separate model with email-bound, expiring, one-time invitations and individually revocable read-only grants.

## Files and capture

The private bucket permits owner downloads/deletes and permission-aware reads. Direct authenticated INSERT/UPDATE is disabled. Browser and native-share files go to `/api/documents/upload`, which authenticates before reading, enforces a 10 MiB streaming bound, verifies PDF/JPEG/PNG/WebP/HEIC signatures and invokes the scanner abstraction. Inbound email applies the same checks. Signed open links are short-lived and normal document opens are download-forced.

The repository currently includes signature validation and a replaceable scanner interface. The default scanner reports `UNAVAILABLE`; deployments that set `DIARYDOCK_CAPTURE_SCANNER_REQUIRED=true` fail closed until an approved malware-scanner adapter is installed. DiaryDock therefore does not claim production malware scanning when that adapter is absent.

## AI, tokens and privacy

Ask and search retrieve under the user's RLS session and omit raw OCR, private notes and contact details. Ask model calls use reduced citations, `store: false`, structured output and no action tools. Physical Link and emergency invitation secrets are random, hashed at rest, expiring/revocable where applicable and fail without both identity and current resource permission.

Product analytics is off by default, first party and schema-allowlisted. Event properties are exact enums only; content, filenames, questions, contacts, identifiers, Vault material and audit contents are rejected. Events become unreadable after their 90-day expiry and are pruned on later analytics activity; opt-out deletes them immediately.

## Verification

The canonical Codex Security scan `fa32e9f5-eaca-47a1-8f85-dbb72ff0e1df` found eight reportable issues at revision `9ea35560`. All were remediated before release. The linked empty database passed schema lint and 51 live cross-user/RLS checks, including path cloning denial, direct Storage upload denial, owner-deletion protection, service-only rate limiting and atomic action audit creation.

Current deliberate deferrals are native Vault E2EE, an approved production malware-scanner adapter, ownership transfer UX, Home Handover publishing/export and automatic emergency legacy release.
