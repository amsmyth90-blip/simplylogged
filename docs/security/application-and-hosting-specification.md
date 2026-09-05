# DiaryDock application and hosting specification

**Prepared for:** Independent cyber-security review
**Prepared:** 4 September 2026
**Application:** DiaryDock
**Primary production URL:** `https://diarydock.com`
**Classification:** Security-review material. This document contains architecture information but no passwords, API keys, access tokens or private keys.

## 1. Purpose and review scope

DiaryDock is a consumer household and life-administration application. It allows an authenticated user to organise private documents, reminders and household records. Depending on what a user chooses to enter, the service can contain personal and sensitive information including identity documents, health information, wills, insurance records, bills, household details, emergency information, family information and travel records.

This specification describes the application and hosting architecture visible from the source repository and the currently linked production services. It is intended to support an external application and infrastructure security review.

Suggested assessment scope:

- public web application, authentication and APIs at `https://diarydock.com`;
- authorisation boundaries between two unrelated users and between household members;
- Supabase row-level security and private Storage policies;
- document upload, quarantine, validation, storage and signed-download flows;
- household sharing, trusted emergency access and physical-link access;
- AI-assisted extraction and Ask DiaryDock data minimisation;
- inbound email webhook authentication and attachment processing;
- privileged service-role use and account-deletion administration;
- Vercel, Supabase and third-party service configuration;
- packaged iOS and Android applications, encrypted offline storage and versioned synchronisation.

Testing against production, destructive testing, denial-of-service testing, social engineering and access to real customer data should require separately agreed written rules of engagement.

## 2. System overview

```text
Desktop browser                   Packaged iOS/Android application
        |                         Signed React/Capacitor bundle
        |                                      |
        | HTTPS                               HTTPS
        +--------------------+-----------------+
                             v
                 Vercel edge/CDN and Next.js APIs
        |
        +---- Supabase Auth, PostgreSQL and private Storage
        |
        +---- OpenAI API for user-requested AI features
        |
        +---- Resend for inbound email ingestion
        |
        +---- TheMealDB for public recipe search

Resend inbound webhook
        |
        | signed webhook or shared-secret authentication
        v
Next.js inbound-email endpoint -> validation/quarantine -> Supabase
```

The browser also communicates directly with Supabase using the public/publishable client key and the authenticated user's session. Database row-level security remains the primary data boundary. A Supabase service-role key is used only by server-side modules for narrowly defined privileged operations.

There is no private network or VPC link between Vercel and Supabase in the inspected configuration. Service-to-service traffic therefore uses provider-hosted HTTPS endpoints.

## 3. Application specification

### 3.1 Technology stack

| Layer | Technology |
|---|---|
| Web application | Next.js App Router 16.3.0 |
| User interface | React 19.1.0, Tailwind CSS 3.4.17 |
| Language | TypeScript 5.8.3 |
| Production server runtime | Node.js 24.x on Vercel serverless functions |
| Authentication/database/storage client | Supabase JS and Supabase SSR |
| AI integration | OpenAI API through the OpenAI Node SDK |
| Email ingestion | Resend API and signed webhooks |
| Mobile applications | React 19, Vite 8 and Capacitor 8; packaged iOS/iPadOS and Android projects |
| Source control | Private application repository hosted on GitHub |
| Mobile build service | Codemagic Android internal-track and iOS TestFlight release workflows |

The Capacitor application identifier is `com.diarydock.app`. The iOS and Android interfaces and static assets are compiled into the signed application package; no remote server URL can replace the installed interface. The applications connect only to allowlisted HTTPS APIs and Supabase services. Cleartext and mixed-content transport, production WebView debugging and native application logging are disabled.

Android Share targets and the iOS Share Extension accept only bounded PDF/image handoffs. Temporary files stay in app-private or App Group storage, are limited to 12 items and 4 MB combined, are revalidated by byte signature in the packaged client, enter the normal encrypted review queue and are then deleted from the handoff area.

Each signed-in account receives a separate SQLCipher database. Its randomly generated secret is protected by iOS Keychain or Android Keystore-backed secure storage. Documents, reminders, pending uploads, file-cache chunks, synchronisation state and bounded read models are encrypted within that database. Versioned migrations currently advance the schema through version 8. Sign-out records durable purge intent before deleting the account database and secure session material. Interrupted deletion is retried before session startup, and a different account cannot open its store until the previously marked DiaryDock database has been removed.

Successful remote document uploads are removed from the durable pending queue before the application attempts to retain an optional offline file copy. This prevents low device storage from causing repeat uploads or leaving completed work stuck. A validated online file can still be opened if local caching fails, with the lack of an offline copy shown to the user.

Synchronisation cursors are signed and bind both the account and the active household-membership generation. Joining, leaving or rejoining a household restarts the authorised projection. Each pull returns the authoritative active household identifier; before advancing its encrypted checkpoint, the installed app atomically removes inaccessible household records, queued mutations, conflict and failure state, cached document bytes and derived read models. Reminder visibility is enforced by database `USER` or `HOUSEHOLD` scope. Owners and members may change shared reminders, viewers remain read-only, and account-deletion preparation transfers a departing non-owner's shared reminders to the household owner so household work is retained.

Encrypted feature snapshots are also non-authoritative caches. An unreadable cache is treated as unavailable and invalid-entry cleanup is best-effort, allowing the authenticated server refresh to proceed. Successful server reads, writes and conflict responses remain successful and become the live application state if an optional local snapshot write fails under device-storage pressure. The underlying repository still rejects invalid keys, schema versions and oversized payloads; cache failure cannot expose invalid local data or turn completed remote work into a misleading failed action.

The mobile synchronisation protocol uses an ordered, idempotent outbox, opaque cursors, server-assigned revisions, deletion tombstones, conflict records and bounded retries. Ownership and household scope are derived by the API, not accepted from the device. Native onboarding uses the same six-stage profile, household, Life Check and dashboard-area rules as the web application; its bounded snapshot is encrypted offline and its complete save is revision checked and service-only. The Family directory can render from a versioned encrypted offline copy; invitations, membership, role, ownership-transfer and household-name changes always require a live authenticated request and recent sign-in. The installed apps accept exact `diarydock://family/invite/` handoffs from the authenticated web invitation page; tokens are validated and held only in memory. Acceptance rechecks the recipient email, expiry, recent database session and existing household membership, and requires an explicit confirmation. Ownership transfer requires the current owner to nominate an active Adult and the nominee to accept within 24 hours; the database performs the owner and role exchange atomically. Web and mobile Garage creation share one canonical complete-record factory and enforce a 50-vehicle account limit. Mobile creation is revision checked and owner scoped, with server-enforced identity validation, before a reduced snapshot is encrypted offline. Large Attic archives are delivered as bounded, revision-bound cursor pages; page cursors are owner-scoped by authentication, and pages opened on an installed device are stored as separate encrypted cache records. Specialist Attic, Garden, Health and Safe Room panels progressively reveal every locally synced record rather than silently discarding records beyond a presentation limit; this requires no additional network access and keeps their initial rendered lists bounded. Kitchen overview responses are byte bounded; complete large-recipe details are fetched only through an authenticated, owner-derived, rate-limited request and stored under a hashed key in the encrypted device database. Mobile Search uses locally synced documents and reminders when offline and a dedicated bearer-authenticated, RLS-backed API for the wider index when online. Recent searches are kept only in the encrypted database. Mobile Ask is online-only, does not persist questions on the device and uses the same minimised citation boundary as the web application. Native Bills, Insurance, Contracts, Correspondence and Kitchen Notice changes remain online-only. Their bounded, rate-limited APIs derive the account and call service-only conditional database transactions, so a normal mobile credential cannot bypass the public API limits or overwrite another account. A stale device receives a conflict rather than overwriting newer state, and linked documents or reminders remain in the same owner-scoped transaction.

The legacy desktop state repository also adopts the private and household revisions returned by its authenticated bootstrap. Its same-origin service accepts only an exact, byte-bounded state envelope, derives the account from the verified session and applies a durable per-account rate limit before parsing the body. A service-only database transaction locks both private and household records, verifies both revisions and either commits both or changes neither. The browser surfaces a reload-required conflict while retaining the pending local change. Direct authenticated inserts and updates on both legacy state tables are revoked; narrower Emergency and Safe Room mutations use their own service-only private-state compare-and-swap call.

Desktop structured records use bounded keyset pagination rather than an all-or-nothing account load. The authenticated bootstrap returns only the first document and reminder pages plus validated opaque cursors. Subsequent pages are independently rate limited, byte bounded before client parsing and merged by stable identifier. Document-sharing metadata is fetched only for the IDs in each authorised page. Invalid cursors fail closed, and an interrupted continuation is reported to the user rather than being mistaken for a complete account.

Desktop document and reminder writes no longer mutate their owner tables directly from browser credentials. Reminder changes use the same versioned, revision-aware service boundary as installed devices; document metadata uses an exact byte-bounded same-origin API and cannot change server-controlled file identity. Authenticated insert, update and delete grants are revoked. A document deletion atomically records private object-cleanup work before removing the database record; storage failures are retained for a secret-authenticated bounded retry worker rather than being silently abandoned.

Capture suggestions are read through an owner-scoped bounded list and decided through a same-origin, authenticated and durably rate-limited endpoint. Approval is not trusted as evidence of execution: the service-only database transaction locks the proposal, verifies the referenced document still belongs to the account, validates the exact generated-reminder inputs, applies its idempotent schedule, finalises the proposal and appends the audit event atomically. Direct client execution of the former schedule and finalisation functions is revoked.

Legacy document-state reduction is deliberately fail-safe. The migration copies only structurally complete, size-bounded entries with valid owner/storage relationships and skips global identifier collisions. Later state writes remove only entries for which the same owner's normalised document row is proven to exist. Any entry that cannot be proven remains in the legacy state, so compaction cannot silently discard old user work.

### 3.2 Main functions

The application includes:

- account creation, email confirmation, sign-in, password reset and sign-out;
- document/photo upload, storage, review, categorisation, search and reminders;
- household membership and explicit resource sharing;
- two-person, expiring household ownership transfer;
- trusted, individually revocable, read-only emergency access;
- household assets and secret-bearing physical links/QR or NFC references;
- bills, insurance, contracts, correspondence, vehicles, travel, health, family, wills and household administration records;
- AI-assisted extraction from user-submitted documents, images and text;
- permission-aware search and Ask DiaryDock;
- Guardian briefings derived from saved dates, with owner-scoped decisions;
- inbound email attachment import;
- optional, first-party product analytics;
- user-requested account deletion with a protected administrative completion step.
- packaged phone/tablet capture, encrypted offline access, conflict-aware synchronisation, native invitation sharing and authenticated in-app invitation acceptance.
- native phone/tablet onboarding and later dashboard personalisation using the same bounded catalogue as the web application;
- native Emergency and trusted-person access, with encrypted offline owner information, online-only sharing controls and live grant checks for received files.
- native Kitchen pantry, shopping lists and family noticeboard, with bounded owner-only projections, encrypted offline reads, revision-checked updates, reminder/calendar linking and user-triggered photo or voice capture.
- Office Bills, Insurance, Contracts, Correspondence and Contacts overviews remain byte bounded and label every reduced record. Before editing, the client obtains complete owner-derived detail through an authenticated, rate-limited route, verifies its resource type, identifier and update timestamp, and stores it under a separate hashed key in the encrypted account database. Save contracts reject transport completeness markers, so reduced records cannot be submitted back over complete notes, histories, actions or linked records. Large Insurance indexes retain every bounded policy and claim summary rather than silently omitting later records.
- Home Handover preparation and explicit read-only recipient access, using an immutable minimal snapshot bound to one confirmed email, a 30-day expiry and immediate owner revocation; received copies are never cached offline.
- Large Home Handover overviews remain byte bounded without making descriptions unreachable: complete owner-item details are loaded through an authenticated, rate-limited, owner-derived lookup and may be stored only in the encrypted per-account database. Received-item details remain online-only and are rechecked against recipient identity, revocation and expiry every time.
- Large Physical Links overviews keep all items and controls while moving complete equipment fields into an authenticated, RLS-enforced owner lookup. A detail is cached separately only after its asset identifier and update timestamp match the current overview; obsolete cache records are removed.

### 3.3 Authentication and sessions

- Identity provider: Supabase Auth.
- Implemented sign-in method: email and password.
- Web email confirmation and password-reset links return through the server-side `/auth/callback` route. Installed-app links use exact `diarydock://auth/confirm` and `diarydock://auth/reset` callbacks, exchange single-use PKCE codes in the app, and retain the recovery state only in device-protected secure storage.
- Passwords must contain at least eight characters at the application layer. Any additional Supabase password-strength settings must be confirmed in the Supabase dashboard.
- Supabase SSR session cookies are refreshed by the Next.js proxy layer.
- Protected server pages call Supabase to validate the current user before rendering.
- Login is rate limited to eight attempts per email/IP-derived key in ten minutes.
- Sign-up is rate limited to five attempts in thirty minutes.
- Password-reset requests are rate limited to five attempts in thirty minutes and return a non-enumerating success message.
- High-impact access changes use a recent-authentication requirement of approximately 15 minutes, including document sharing, household access and ownership transfer, trusted emergency access and Home Handover mutations.

MFA, passkeys, SSO, trusted-device enrolment and biometric authentication are **not implemented in the inspected application** and must not be represented as current controls.

### 3.4 Data model and authorisation

Supabase PostgreSQL is the system of record. The repository contains 41 application tables covering documents, reminders, household access and ownership transfer, sharing permissions, emergency access, assets, Home Handover publications, the Life Graph, capture jobs, recoverable storage cleanup, action/audit records, account deletion, rate limiting and optional product analytics.

The supplied schema and migrations enable row-level security on all created application tables. Approximately 60 RLS policies and constrained database functions implement owner, household-member and explicitly granted access. Important compound changes use `SECURITY DEFINER` functions with a fixed search path; privileged functions have explicit `REVOKE`/`GRANT` rules.

Key principles are:

- a user reads their own record unless an active, explicit sharing relationship allows access;
- the browser cannot choose or forge an owner identity for privileged mutations;
- document-sharing changes authenticate and require recent sign-in before an exact byte-bounded body is parsed, reject cross-origin requests, apply durable per-account limits and return only generic public errors;
- generic sharing rejects Vault-class resources;
- revocation removes future database and signed-file access;
- trusted emergency access is separately modelled, read-only, resource-specific and revocable;
- service-role database functions are not executable by anonymous or normal authenticated roles, including desktop, Emergency, Safe Room, Office and Kitchen Notice legacy-state transactions;
- audit history is intended to be append-only to normal clients.

Some older feature data remains inside a per-user `app_state` JSONB record, while newer data is stored in normalised tables. Normal clients can read their RLS-authorised legacy records but cannot write those tables directly; validated service transactions derive the account and enforce size and revision boundaries.

### 3.5 Document and file handling

Current accepted document types are PDF, JPEG, PNG, WebP and HEIC. The normal document limit is 4 MiB per file.

The packaged camera/gallery boundary applies that limit during acquisition rather than after unrestricted buffering. Native reads are capped at 4 MiB plus one overflow-detection byte, and web selections, normal downloads and trusted-access downloads share a streamed byte counter that cancels on overflow even when `Content-Length` is missing or dishonest.

The current repository implements this flow:

1. The authenticated client asks the server to reserve an upload.
2. The server validates the declared name, type, size, user storage allowance and rate limit.
3. The server returns a short-lived, single-path signed upload token for a private quarantine bucket.
4. The client uploads directly to the quarantine path.
5. The server downloads the quarantined object and verifies the exact byte length and file signature against the declared MIME type.
6. The configured security-scanner boundary is invoked.
7. An accepted file is promoted to the private document bucket under an owner/document-prefixed path; the quarantined copy is removed.
8. Future access is controlled by Storage policies and short-lived signed URLs.

Normal document downloads use signed URLs lasting 60 seconds; preview URLs can last up to 300 seconds. Signed document downloads use sanitised filenames. Private/search/Ask/emergency responses use `private, no-store` caching where explicitly implemented.

The repository includes an authenticated HTTPS adapter and a separately scalable, non-root ClamAV scanning service. Production code fails closed when a required scan is unavailable, leaving the object in quarantine. Deployment of that service, its private ingress, signature-update health and matching credentials must still be evidenced in the production environment before the control is treated as operational.

### 3.6 AI processing

OpenAI is used only for user-triggered features such as document/photo extraction, recipes/kitchen analysis and Ask DiaryDock.

- The OpenAI API key is server-only.
- Ask DiaryDock retrieves records using the user's Supabase session and permission boundary.
- Ask sends the question plus no more than eight reduced record summaries rather than the user's whole account.
- Raw OCR, private notes and contact details are excluded from Ask retrieval records.
- Ask requests explicitly set `store: false`, constrain structured output and do not provide action tools.
- Model-provided citation references are checked against the authorised records before being returned.
- Deterministic fallback responses are used if the AI provider is unavailable.
- Separate image/document extraction routes submit the content the user chose to analyse. Those call sites do not all explicitly set `store: false`; contractual retention, regional processing and any approved zero-data-retention configuration should be confirmed with the service owner and provider.
- Family-notice photo and voice extraction accepts only bounded, signature-checked media, treats media text as untrusted content, validates the structured response against the shared strict contract and requires the user to confirm before saving it.

AI output is advisory and can require user review before becoming confirmed structured information. AI does not make database access-control decisions.

### 3.7 Inbound email

The application contains an inbound-email integration using Resend.

- Webhook requests can be verified using Resend/Svix signature headers and the configured webhook secret.
- A fallback integration path accepts a server-held bearer/shared secret.
- Each user's forwarding address contains a server-generated, verifiable token rather than a raw, trusted user identifier alone.
- Webhook bodies and attachments are size bounded.
- Attachments pass through the document MIME/signature checks and configured scanner boundary before private storage.
- Imported files are associated with the resolved user, deduplicated and marked for review.

The production environment contains the required Resend/inbound-email variable names, but their hidden values and the feature-enabled flag were not read. Operational enablement should be confirmed.

### 3.8 API protection

Most private API endpoints independently validate the Supabase user. Durable rate limits are stored as hashed keys in Supabase and are callable only with the service role. In production, the application fails closed if the durable rate-limit service is unavailable.

Every direct network request in the packaged mobile source has an explicit abort signal supplied by one compatibility-safe deadline boundary. Search cancellation is combined with the deadline. Supabase authentication, session refresh, REST/RPC and Storage calls use the same custom bounded transport with a 60-second ceiling and retain caller cancellation. Automated source and client-wiring tests enforce both paths and reject feature-level timeout variants, preventing half-open mobile connections from holding synchronisation, settings or specialist feature state indefinitely.

Rate limits are implemented for authentication, upload preparation, AI extraction, Ask, search, product analytics, recipe functions, physical links and deletion requests. Request size/type checks are applied to relevant endpoints.

The inbound-email endpoint is intentionally public and relies on webhook authentication. The account-deletion processor is intentionally privileged and requires a server-held bearer token compared using a timing-safe operation. A separate browser admin page requires an authenticated email included in a server-side allowlist and a typed destructive-action confirmation.

## 4. Hosting infrastructure

### 4.1 Public application hosting: Vercel

| Item | Verified configuration |
|---|---|
| Vercel project | `diarydock` |
| Production state checked | Ready on 1 September 2026 |
| Primary domain | `diarydock.com` |
| Additional aliases | `www.diarydock.com`, `diarydock.co.uk`, `www.diarydock.co.uk`, `simplylogged.vercel.app`, four retired LifeDock hostnames and Vercel project hostnames |
| Application functions | Vercel serverless functions using Node.js 24.x |
| Function region observed | `iad1` (US East) |
| Function allocation observed | 2,048 MiB memory and 300-second platform timeout |
| Build location observed | `sfo1` |
| Static delivery | Vercel-managed edge/CDN |
| TLS | Vercel-managed HTTPS; live site redirects/serves over HTTPS |
| Secrets | Stored as hidden Vercel environment variables; values were not inspected |

The retired `thelifedock.com` and `thelifedock.co.uk` domains, including their `www` hostnames, were still attached to the inspected production deployment on 4 September 2026. They should be removed before launch after the owner confirms whether a controlled redirect or complete retirement is required.

The runtime/function region means application requests can be processed in the United States before the application calls Supabase in Europe. This cross-border path should be considered in the data-protection review.

The live site was verified to return:

- HTTP Strict Transport Security with a two-year maximum age;
- Content Security Policy;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY` and `frame-ancestors 'none'`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Cross-Origin-Opener-Policy: same-origin`;
- private/no-store caching on the checked response.

The CSP currently permits inline script and style execution. It blocks objects and framing and restricts connections principally to the application, Supabase and TheMealDB. The reviewer should assess whether nonces/hashes can replace the inline allowances.

Production Vercel contains hidden variables for Supabase, OpenAI, Resend/inbound email and account-deletion administration. The public Supabase URL and public/anonymous client key are expected to be browser-visible; the service-role key and other privileged secrets are server-only. The inspected environment did not contain variable names for the sync cursor secret or required malware-scanner configuration. The new source build fails its production preflight until those controls are configured, but that gate is not present in the currently deployed build.

### 4.2 Data platform: Supabase

| Item | Verified configuration |
|---|---|
| Supabase project name in linked metadata | `LifeDock` |
| Region inferred from linked pooler | `eu-west-1` (Ireland) |
| PostgreSQL version in linked metadata | 17.6.1 |
| Services used | Supabase Auth, PostgreSQL, REST/RPC, private Storage and signed URLs |
| Primary access control | PostgreSQL row-level security plus Storage policies |
| Storage buckets | Private document bucket and private quarantine bucket in the current migrations |

The public Supabase project URL is restricted by authentication, RLS and Storage policies, not by secrecy of the public client key. The service-role key bypasses RLS and is therefore confined to server-only code and Vercel secrets.

The current CLI identity did not have sufficient privilege to read the remote migration history. Consequently, the exact production database migration level, backup configuration, point-in-time recovery, log retention and provider security settings were not verified during preparation of this document.

### 4.3 Source and deployment

- Source is held in GitHub.
- Pull requests run the complete repository gate, moderate-or-higher dependency review and extended CodeQL analysis for TypeScript and Java. Workflow actions are pinned to immutable commits and Dependabot maintains both application and workflow dependencies.
- Vercel manages the production Next.js build and deployment.
- The identified production deployment was created on 1 September 2026. On 4 September 2026 its `/api/health/ready` route returned HTTP 404, confirming that it does not contain the current readiness implementation.
- The current implementation remains in an uncommitted working tree, so it is not yet an immutable assessment or release candidate.
- The exact Git commit SHA included in production and the exact Supabase migration set should be recorded before testing begins.
- Codemagic contains Android internal-track and iOS TestFlight workflows. Android release builds use the configured signing alias, run unit/lint/release bundle checks and target the Google Play internal track. The iOS workflow produces an App Store-distribution build for TestFlight. Store credentials, signing assets and successful external submissions remain release-environment evidence rather than repository evidence.

## 5. Data flows and classifications

| Flow | Data | Destination | Protection/control |
|---|---|---|---|
| Sign-up/sign-in | Email, password/auth exchange | Supabase Auth | HTTPS, Supabase session, rate limiting |
| Application records | Household/life-admin structured data | Supabase PostgreSQL | HTTPS, authenticated session, RLS |
| Document upload | User-selected private file | Supabase quarantine then private Storage | Signed single-path upload, 4 MiB limit, signature validation, private buckets |
| Document access | Private file | User browser/app | RLS/Storage policy and short-lived signed URL |
| Ask DiaryDock | Question and reduced authorised summaries | OpenAI API | Server API key, permission-aware retrieval, minimisation, `store: false` |
| AI extraction | User-selected text/image/document | OpenAI API | Server API key, request limits and schema-constrained output |
| Email import | Email metadata and attachments | Resend, Vercel, Supabase | Signed webhook/shared secret, per-user address token, validation and private storage |
| Recipe search | Search terms | TheMealDB | HTTPS; no private document access intended |
| Product analytics | Fixed allowlisted event and enum properties | Supabase PostgreSQL | Off by default, opt-in, no content fields, RLS, 90-day expiry |
| Account deletion | User ID and deletion request | Vercel/Supabase | Recent auth, rate limit, admin approval/token, storage/row/Auth deletion |
| Mobile offline use | Documents, reminders, files, pending uploads, Emergency information and bounded read models | Device SQLCipher database | Per-account encryption, Keychain/Keystore-held secret, schema migrations, integrity checks and sign-out purge |
| Mobile synchronisation | Versioned records and mutations | DiaryDock API/Supabase | Bearer authentication, server-derived ownership, revisions, idempotency, cursors, tombstones and conflict handling |

High-impact data classes that a user may choose to store include identity, health, legal, financial/insurance, household security and emergency information. The application is intended for adults and is not directed at children under 13.

## 6. Current security controls

- HTTPS-only production access and no cleartext mobile transport.
- Signed local mobile interface, encrypted per-account offline database and device-protected session/key storage.
- Versioned, idempotent mobile synchronisation with explicit conflict handling and sign-out purging.
- HSTS and security headers on the live application.
- Supabase Auth with server-side user validation.
- Database RLS and private Storage policies.
- Short-lived signed file access.
- Server-only privileged keys and explicit service-role function permissions.
- Recent-authentication gates for high-impact access changes.
- Durable hashed-key rate limiting with fail-closed production behaviour.
- Upload quarantine, strict size limits, allowlisted types and byte-signature verification.
- Explicit, revocable sharing and separately scoped emergency access.
- Random invitation/link secrets hashed at rest where implemented.
- Webhook signature/secret verification for inbound email.
- Permission-aware and minimised AI retrieval.
- First-party analytics off by default with strict property allowlists and 90-day expiry.
- Account deletion workflow covering Auth, database records and private stored objects.
- Security-focused automated tests for cross-user boundaries, sharing, emergency access, uploads, rate limiting, analytics and account deletion.
- Least-privilege GitHub verification workflows with immutable action pinning, dependency-change review and scheduled CodeQL analysis.
- OpenTelemetry server traces, privacy-safe structured request events, correlation IDs, health endpoints and repeatable load-test workloads.

## 7. Explicit limitations and non-claims

The following should be disclosed to the reviewer rather than treated as implemented controls:

- The current Vault/Files feature is private server-managed storage, **not end-to-end encrypted**. DiaryDock, Supabase and authorised processing paths can access plaintext.
- MFA, passkeys, SSO, trusted-device controls and biometric unlock are not implemented.
- Native iOS/Android compilation and store submission require the configured macOS/Android CI release environments; local source checks and Capacitor synchronisation do not prove successful store publication.
- The currently deployed web application predates the current source and does not expose the new readiness route. It must not be used as evidence that the current implementation is operational.
- Production is missing the named sync-cursor and malware-scanner settings required by the new deployment preflight. Hidden values for existing settings were not inspected.
- Four retired LifeDock domain aliases remain attached to the production deployment.
- A production malware-scanning deployment has not been verified. The repository includes the adapter and ClamAV service, but private ingress, current signatures, credentials, availability and alerting remain deployment evidence.
- OpenTelemetry instrumentation and alert requirements are implemented in the repository, but the production exporter/integration, dashboard ownership, paging route and retention have not been verified.
- Backup frequency, retention, restoration testing and point-in-time recovery were not verified.
- Vercel Firewall/WAF rules, bot protection, account/team MFA and access-review settings were not verified.
- GitHub branch protection, hosted workflow results, secret scanning and push protection are not yet verified external controls; their repository workflows alone do not prove enforcement.
- Supabase dashboard security settings, Auth rate limits, password policy beyond the application minimum and team MFA were not verified.
- OpenAI and Resend contractual retention/data-residency settings were not verified.
- DNS registrar/provider access controls and domain-account MFA were not verified.
- There is no verified private network boundary between the serverless application and Supabase.

## 8. Retention and deletion

- Account records and uploaded documents are retained while the account is active unless a legal/operational exception applies.
- Product analytics is opt-in and designed to expire after 90 days; opting out deletes the stored product events.
- Users can request account deletion from the application or public deletion page.
- The processor removes the user's private Storage prefix, structured records, legacy app state and Supabase Auth user while protecting households that still have another active member.
- The public policy states deletion is processed within 30 days and that data may remain temporarily in encrypted backup rotation. The actual provider backup/rotation period has not yet been verified and should be documented before the review is finalised.

## 9. Items to confirm before sending the final pack

The service owner should obtain screenshots or exported settings, without exposing secret values, for:

1. A clean, immutable Git commit SHA and its exact Vercel deployment ID intended for assessment.
2. The list of Supabase migrations applied to production.
3. Vercel plan, function region policy, Firewall/WAF/bot controls, logs, retention, team members and MFA.
4. Supabase plan, project region, backups/PITR, log retention, Auth settings, team members and MFA.
5. DNS registrar/provider, nameservers, account access and MFA.
6. OpenAI organisation/project retention and regional-processing settings.
7. Resend inbound-email enablement, data region and message/attachment retention.
8. Secret ownership, last-rotation dates and emergency rotation procedure for all privileged keys.
9. Operational monitoring, incident contacts, breach-response process and recovery objectives.
10. Whether the reviewer will receive two standard test accounts, a household-sharing test account and a non-production test environment.

## 10. Proposed reviewer access and evidence pack

Provide the security company with:

- this specification;
- agreed target URLs and written rules of engagement;
- two unrelated standard-user test accounts and, if needed, separate household owner/member accounts;
- a clean Supabase schema/migration export with secrets removed;
- source-code access at the exact assessment commit, if a white-box review is agreed;
- dependency lockfile and build instructions;
- evidence for Vercel/Supabase/DNS team access, MFA, backups and logging;
- a contact who can authorise testing, respond to lockouts and receive urgent findings.

Do not send `.env.local`, service-role keys, Vercel tokens, OpenAI keys, Resend secrets, database passwords or account-deletion administrator tokens by ordinary email.
