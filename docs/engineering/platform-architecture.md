# DiaryDock platform architecture

## Purpose

DiaryDock is one product delivered through a desktop web client and packaged iOS and Android clients. Phone and tablet applications share the same product language, permissions and business rules while using layouts appropriate to their screen size.

This document defines the target boundaries. New work must follow them. Existing code moves into them through tested, behaviour-preserving slices.

## Product topology

```text
Web client                  Packaged mobile client
Next.js                     React + Capacitor
    |                              |
    +--------- Versioned API ------+
                       |
              Application services
                       |
        Domain rules and permission policy
              /        |         \
       PostgreSQL   Object store   Job queue
          |                          |
     Read models                Background workers
```

The mobile client contains its executable web assets in the signed application bundle. Production builds must not use a remote server URL to replace the installed interface.

## Repository target

```text
apps/
  web/                 Next.js desktop web application
  mobile/              packaged phone and tablet application
packages/
  domain/              pure business types, rules and invariants
  contracts/           versioned API and synchronisation schemas
  application/         use cases and orchestration interfaces
  api-client/          authenticated client transport
  sync/                local outbox, cursors and conflict policy
  design-system/       tokens and reusable product primitives
  security/            platform-neutral security policy helpers
services/
  workers/             queued extraction, scanning and notifications
supabase/
  migrations/          append-only database changes
  tests/               live database boundary verification
```

The current web application remains at the repository root until moving it would be a mechanical change. New packages are introduced first, then existing features migrate one vertical slice at a time.

## Dependency direction

Dependencies point inward:

```text
UI -> application -> domain
infrastructure -> application interfaces
```

- `domain` has no React, Next.js, Capacitor, Supabase or network imports.
- `contracts` contains serialisable schemas and version identifiers only.
- `application` coordinates domain operations through explicit interfaces.
- clients depend on contracts and use cases, never server-only implementations.
- infrastructure adapters contain Supabase, OpenAI, Resend, storage and queue code.
- service-role credentials are confined to server infrastructure modules.
- UI components do not issue database queries directly.

Cycles across package boundaries are prohibited.

## Mobile client

The mobile application is an offline-first client, not a remote website wrapper.

- The signed bundle contains the interface code and static assets.
- A local encrypted database is the source used to render signed-in screens.
- Network responses update the local database through the sync engine.
- Device wrapping keys live in Apple Keychain or Android Keystore.
- Cached files and pending uploads are chunked, integrity-checked and encrypted inside the per-account SQLCipher database.
- Local authentication unlocks device-held keys; it does not replace server identity.
- Sign-out and device revocation destroy local key access and cached private data.

Explicit sign-out records a purge-pending marker in device-only secure storage before local session removal. The account database is then deleted and the marker cleared; an interrupted deletion is retried before authentication is restored on the next launch. If a different account signs in on the device, the previous marked DiaryDock database is deleted before the new account database opens. Invalid markers or failed deletion stop initialisation rather than allowing cross-account cache retention.
- Native backups must exclude plaintext and unwrapped keys.

Offline file caching is deliberately non-authoritative. A successful remote upload is removed from the durable pending queue before the application attempts to retain its optional encrypted file copy, avoiding duplicate storage peaks and retry loops when device storage is full. An integrity-checked online file remains viewable if caching fails, and the interface states that the offline copy was not retained.

Bounded feature snapshots follow the same authority rule. An unreadable optional cache is treated as unavailable so it cannot block an authenticated online refresh, and invalid-cache cleanup is best-effort. A successful server refresh, mutation or conflict response becomes the live mobile state even if the encrypted read-model write fails because local storage is unavailable or full. The strict read-model repository continues to enforce keys, schema versions and payload limits; only feature-layer cache access is recoverable, preventing completed server work from being shown as failed or repeated by the user.

Phone and tablet use the same feature modules. Layout primitives select compact, medium or expanded presentation without duplicating business logic.

The packaged sign-in surface keeps session tokens in native device-only secure storage. Account creation, email confirmation and password recovery use the approved HTTPS DiaryDock origin and the same rate-limited first-party account flow. First-time personalisation is native: a strict owner-free projection is cached in SQLCipher, and the completed profile, household, Life Check and dashboard choices commit together through one revision-checked, service-only transaction.

Implemented vertical slices currently include the estate map, room workspaces, files and secure viewing, reminders and conflicts, multi-page intelligent capture, the Front Gate settings surface, the Family Room with online access management, a versioned encrypted offline directory and shared weekly schedules, universal Search with cited Ask DiaryDock, Guardian, Emergency including trusted-person access, the Kitchen pantry, shopping lists, recipes, meal planning and family noticeboard, the Office bills, insurance, contracts, correspondence and professional contacts areas, the Driveway travel workspace, and the Mailbox intake queue.

The mobile parity surface also includes specialist Attic, Health, Garden, Garage and Safe Room workspaces, plus Life Check, Physical Links and Home Handover. Web, phone and tablet Garage flows create first or additional vehicles through one canonical complete-record factory; the web landing resolves the account's real primary vehicle rather than a placeholder, while installed apps retain a bounded snapshot in the encrypted read-model store. The desktop My Wishes & Preferences route uses the same exact bounded domain contract as the installed Safe Room, preserves nested will and letter records, and no longer presents a placeholder. Large Attic archives use revision-bound cursor pages: each response and cache record remains bounded, older pages load without a desktop handoff, and any page opened on the device is available from encrypted storage when offline. Attic, Garden, Health and Safe Room record panels progressively reveal their complete locally synced result sets, preserving responsive initial renders without silently hiding records or requiring connectivity. Safe Room is reached through the Office on both platforms rather than appearing as a duplicate estate hotspot. Automated parity checks require every estate area, specialist room and declared packaged destination to retain a concrete rendering path and prevent Garage from reintroducing a desktop-only creation handoff.

Search ranks locally synced documents and reminders directly from SQLCipher when offline, merges the wider RLS-authorised household index when online, and stores recent searches only in the encrypted read-model store. Ask is online-only, receives no more than eight reduced authorised citations and never persists the question on the device. Guardian uses one deterministic rule package on web, server and mobile; it derives an offline briefing from encrypted system-reminder projections while keeping dismiss, snooze and resolve actions online and owner-scoped. Emergency exposes a strict projection of the owner's legacy state, caches it only in SQLCipher, combines it with approved synced documents, and uses revision-checked online mutations so stale native clients cannot overwrite a newer snapshot. Trusted access is deliberately online-only, uses the same bounded service on web and mobile, requires recent authentication for mutations, keeps invitation secrets in volatile UI state, and revalidates a received document grant before every integrity-checked download.

Home Handover keeps its overview below the mobile response ceiling. If a large account requires reduced overview descriptions, any owner item can retrieve its complete owner-scoped detail through the same authenticated, rate-limited service; opened owner details use separate hashed encrypted cache records for offline access. Received handover details are never cached and are re-authorised live against the confirmed email, revocation state and expiry on every request.

Physical Links applies the same bounded-overview pattern to large equipment registers. Complete equipment notes and fields load through an owner-scoped, rate-limited lookup and are cached separately under a hashed encrypted key only when the detail timestamp matches the overview, preventing an older offline record from replacing newer equipment state.

The web and packaged clients import the same dashboard catalogue, four always-visible essential areas, optional-area questions and household choices. Completed setup controls the visible estate hotspots on phone and tablet. Users can review the same six-stage flow from Settings; offline copies remain readable, while saving waits for an authenticated connection and rejects stale revisions rather than overwriting another device.

Kitchen, Office and Family Schedule data use strict bounded projections, encrypted offline reads and revision-checked online mutations while preserving unrelated legacy web state. Their writes pass through service-only database transactions; direct authenticated database execution is denied. Kitchen supports bounded pantry and shopping items, complete recipes, meal planning and guided cooking. Online recipe discovery validates capped provider responses, while photo scanning accepts one size- and signature-checked image into a strict AI output contract. The overview remains byte bounded; any recipe reduced there can load its complete owner-scoped detail on demand into a separate encrypted cache record, restoring edit, cook, shop and meal-planning controls without a web handoff. Large Office Bills, Insurance, Contracts, Correspondence and Contacts overviews mark every reduced record explicitly. Edit waits for a complete owner-derived record whose identifier and update timestamp match the overview, then separately caches that detail under a hashed encrypted key. This preserves every policy and claim in a large-account index and prevents shortened notes, histories, actions, linked records or correspondence from overwriting complete data. Shared schedules accept only active household owners and members, and migration logic preserves eligible schedule/profile data from older private records. Notice and linked-reminder effects commit together through an owner-derived database transaction; media-assisted notice capture is authenticated, bounded, signature checked and schema validated. Feature screens are lazy-loaded from the signed bundle; production builds exclude preview modules.

Driveway provides bounded trip, traveller, booking, itinerary, checklist, expense, emergency, document-link and insurance projections from the existing web state. Its phone and tablet screens render from an encrypted account-specific read model when offline; all writes are authenticated, revision checked, rate limited and committed through a service-only transaction. File links are re-authorised against the signed-in owner before storage references are changed. Offline trip packs contain only a deliberately reduced travel summary and exclude document identifiers, insurance identifiers, medication notes and identity records.

Mailbox normalises incoming email attachments, captured documents and eligible legacy queue items into an owner-scoped review table. The mobile queue renders a bounded projection from encrypted account-specific storage when offline. Filing, reminder, room-routing and ignore actions require connectivity and an exact item revision; they commit through a service-only transaction that locks the item and revalidates any linked document against the owner. Direct authenticated inserts, updates and action execution are denied, while the document trigger has no public execution grant. Legacy items without a verified document remain reviewable but cannot claim that a file action succeeded.

## Synchronisation protocol

Synchronisation is a versioned product API, not an implementation detail.

The remaining legacy desktop state repository adopts the private and household revisions returned by the bounded bootstrap API. A same-origin, authenticated and rate-limited service validates the complete bounded request before a service-only database function locks both records, compares both revisions and commits private and shared state in one transaction. A concurrent change therefore changes neither record, produces a visible reload-required conflict and retains the pending local state instead of silently overwriting the newer server copy. Normal authenticated clients have read-only access to both legacy state tables; Emergency and Safe Room domain updates use a narrower service-only private-state compare-and-swap function.

The desktop bootstrap no longer attempts to materialise an account's entire structured document and reminder catalogue in one response or reject an account at a fixed count. It returns small created-time keyset pages and opaque validated continuation cursors. The client drains document and reminder pages independently through an authenticated, rate-limited endpoint, bounds every response before parsing, and progressively merges records by stable identifier. Sharing and permission lookups are restricted to the document IDs in the current page. A continuation failure is shown as a reload-required error instead of presenting a silently incomplete catalogue.

Document normalisation is lossless and progressive. A bounded migration copies only complete legacy document entries that do not collide with another account. On every subsequent private-state write, a database trigger removes only entries whose owner-scoped normalised row is already present; malformed, colliding or otherwise unproven legacy entries remain in the original state. This reduces the legacy JSON row as records are proven without making successful deployment depend on an all-or-nothing data rewrite.

Reviewed capture actions cross one exact, same-origin and durably rate-limited endpoint. Generated reminder scheduling and proposal finalisation run in one service-only database transaction: the transaction locks the owner-scoped proposal, revalidates its stored source document and bounded reminder fields, creates an idempotent schedule, changes the proposal state and records the audit event together. Legacy client-callable scheduling and finalisation functions are revoked, so a distributed browser or installed-app credential cannot fabricate protected system reminders or claim that an action completed without executing it.

Every synchronised record has:

- a stable client-safe identifier;
- owner or household scope derived by the server;
- a monotonically comparable revision;
- created and updated timestamps assigned by the server;
- a deletion tombstone where deletion must propagate;
- a schema version; and
- an idempotency key for client-originated mutations.

Clients send an ordered outbox and request changes after their last cursor. The server applies permission checks, validates the expected revision and returns an authoritative result. Signed opaque cursors bind both the account and its active household-membership generation, so joining, leaving or rejoining resets the authorised projection instead of continuing an incompatible page history. Every pull returns the authoritative active household identifier. The encrypted store atomically removes records, pending mutations, conflicts, failures, cached document bytes and derived caches that no longer belong to that household before advancing its checkpoint. Lists are bounded and paginated.

Conflicts must never silently discard sensitive information. Domain-specific merge rules handle independent fields; otherwise the user receives a clear conflict resolution choice.

Initial synchronisation is resumable. A failed page cannot require downloading the entire account again.

## Server application

The server begins as a modular monolith. This keeps transactions and permission checks understandable while allowing measured bottlenecks to move into separate services later.

API rules:

- all production endpoints are versioned;
- authentication and authorisation occur before resource lookup disclosure;
- request and response bodies have explicit schemas and size limits;
- mutations are idempotent where clients may retry;
- collection endpoints use cursor pagination;
- private responses are non-cacheable unless an explicit safe cache policy exists;
- errors use stable public codes and do not expose provider messages;
- long-running work returns a job identifier instead of holding a request open;
- logs contain correlation identifiers, not private record contents.

Document-sharing reads and changes follow this boundary directly: same-origin mutations authenticate and require a recent sign-in before parsing an exact 8 KiB contract, reads and writes have separate durable account limits, responses are non-cacheable and bounded by the browser, and database/provider messages never cross the public API.

Desktop document and reminder changes use controlled services rather than direct browser table writes. Reminders share the packaged client's versioned mutation contract, owner-derived service RPC, conflict handling and system-reminder completion rules. Document metadata passes an exact 96 KiB contract; existing file kind and size are immutable, account identity comes from the authenticated session, and authenticated table mutation grants are revoked. Document deletion commits the database removal and a private storage-cleanup job together. Immediate cleanup removes the job, while failures remain bounded durable work for a separately authenticated retry worker with backoff.

Reminder visibility is an explicit `USER` or `HOUSEHOLD` database scope enforced by RLS for desktop paging, search, Guardian and mobile sync. Active owners and members can edit shared reminders; viewers are read-only in both the database mutation service and the desktop interface. A membership generation refresh prevents rejoin cursors from inheriting an earlier access session. Eligible private reminders are promoted when their owner becomes a collaborating household member. Shared reminders created by a departing non-owner are transferred to the household owner during account-deletion preparation, including their sync identity, so household work is not silently erased. Legacy JSON reminders are copied only when their complete bounded shape is valid; collisions and invalid entries remain in legacy state. State triggers retain unresolved entries while compacting only a marked or field-equivalent normalised record, and new desktop saves omit the redundant normalised collection.

## Data platform

PostgreSQL is the system of record. Row-level security remains a defence-in-depth boundary even when the API has already authorised a request.

- Normalised tables replace the large `app_state` document as authoritative storage.
- Every tenant query starts from an indexed owner or household scope.
- Foreign keys encode ownership and deletion behaviour.
- High-volume audit, event and analytics data has a partition/retention plan.
- Schema changes are backwards compatible with supported mobile versions.
- Destructive migrations use expand, migrate, verify and contract phases.
- Serverless database traffic uses a transaction pooler.
- Read replicas serve eligible read-only workloads only after measurement.

No query is approved for a high-volume path without a representative query plan and index review.

## Files and background work

Clients upload directly to a private quarantine location through a narrow signed capability. Promotion requires byte inspection, an approved malware scanner and an authoritative database reservation.

Packaged camera and gallery acquisition is bounded before full materialisation: native reads request at most the document limit plus one overflow-detection byte, while web responses and subsequent document downloads are counted chunk-by-chunk through one shared bounded reader. Declared lengths are only a preflight; streamed bytes remain authoritative.

The queue handles:

- malware scanning and file promotion;
- document extraction and classification;
- thumbnails and derived files;
- inbound email processing;
- notifications;
- lifecycle cleanup; and
- account export/deletion work that exceeds request limits.

Jobs are idempotent, bounded, retried with backoff and moved to a dead-letter queue after their retry policy. Operators can inspect and safely replay a failed job without accessing document contents unnecessarily.

## Vault boundary

The end-to-end encrypted Vault is a separate resource class and storage protocol.

- encryption and decryption occur on an enrolled trusted client;
- metadata that can identify content is encrypted;
- the server stores ciphertext and versioned key envelopes;
- per-object keys limit rotation and sharing impact;
- recovery does not rely on the account password alone;
- normal sharing, search, analytics and AI paths cannot read Vault plaintext;
- failure to decrypt never falls back to plaintext storage.

The current private Files experience must not be renamed as this Vault until the cryptographic implementation and recovery process pass independent review.

## Security operations

Production requires:

- MFA for users where offered and mandatory MFA for administrators;
- individual provider accounts with least privilege;
- managed secrets with ownership and rotation records;
- WAF, abuse controls and layered rate limits;
- dependency, secret and static security scanning in CI;
- immutable security-relevant audit events;
- central metrics, traces and structured logs;
- alerting tied to an incident response rota;
- database point-in-time recovery and separate object backup/replication;
- restoration and regional recovery exercises; and
- independent mobile, API and cloud security assessment.

## Reliability and scale

Capacity decisions come from an explicit model covering active users, concurrency, request rates, storage, uploads, AI jobs, sync volume, regions and retention.

Each critical journey receives service-level indicators for availability, latency, correctness and durability. Alert thresholds consume an agreed error budget rather than relying on anecdotal reports.

Required tests include:

- representative load, spike and soak tests;
- queue backlog and dependency outage tests;
- database failover and restore exercises;
- offline conflict, interrupted sync and upgrade tests;
- cross-user and cross-household access tests;
- large-account pagination tests; and
- mobile cold-start and storage-pressure tests.

Every packaged-client network acquisition has an explicit abort signal and a shared, compatibility-safe bounded deadline. User-driven cancellation is composed with that deadline for search, while longer AI requests receive a separately bounded allowance. Supabase authentication, token refresh, REST/RPC and Storage traffic share a 60-second transport ceiling that preserves SDK or caller cancellation. A source-level regression test inspects every mobile `fetch` call, rejects direct feature-level timeout implementations, and verifies the SDK transport wiring so a new indefinite or inconsistent request cannot enter the production bundle unnoticed.

Scale is increased through measured compute, pooling, indexes, caching, asynchronous work and read capacity. New distributed services require evidence that a simpler boundary cannot meet the target.

## Delivery sequence

1. Establish standards, baselines and architectural tests.
2. Introduce domain, contract and design-system packages.
3. Replace `app_state` feature slices with normalised repositories.
4. Implement versioned sync and an encrypted local mobile database.
5. Create the bundled mobile shell and migrate features vertically.
6. Add queue-backed file, AI, email and notification processing.
7. Implement the reviewed Vault protocol.
8. Complete scale, recovery, security and release verification.

Every slice must leave the web application usable and the full verification suite green.
