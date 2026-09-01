# DiaryDock Life OS architecture

Status: implemented foundation and reviewed production system, 1 September 2026.

DiaryDock is a private household organisation application built as a Next.js 16 App Router web application, backed by Supabase Auth, PostgreSQL, Row Level Security and private Storage. The Android application is a Capacitor shell that loads the production web application and adds an explicit native share-import bridge.

## System shape

- The browser and server use the signed-in person's Supabase session. Product records are owner-scoped by `auth.uid()` and shared reads are granted only through typed, active permissions.
- Supabase security-definer functions are the authority for compound mutations such as sharing, reminders, trusted access, Physical Links, Home Handover and analytics consent.
- Private files live in `diarydock-documents`. A document row can bind only to `<owner user id>/<document id>/<safe filename>`. Browser clients cannot upload or replace readable objects directly; the authenticated server verifies byte signatures and invokes the scanner boundary first.
- The Life Graph stores entities, relationships, provenance, facts, events, document links, inbox items, action requests/steps and append-only audit events. Cross-owner graph edges are rejected.
- The reminder engine turns authoritative dates into versioned, idempotent schedules. Guardian derives calm, dismissible findings from those schedules. It does not silently mutate source records.
- Search loads minimal candidates under the caller's RLS session. Ask DiaryDock selects no more than eight citations from that authorised set, sends only reduced records to the model, disables provider storage and has no action tools.

## Product layers

1. Private records: app state, documents, reminders, assets and specialist household modules.
2. Organisation intelligence: Life Check, Organisation Score, Life Graph proposals, reminder rules and Guardian.
3. Deliberate access: household sharing, selected-member permissions, Physical Links and Trusted Emergency Access.
4. Guided workflows: intelligent capture, review inbox, Ask DiaryDock and private Home Handover drafts.
5. Governance: recent authentication, audit events, product-analytics consent, account deletion and truthful Vault boundaries.

## Deliberate limits

The current Vault is ordinary private server-managed storage, not end-to-end encrypted. Home Handover is a private selection/preview foundation and does not publish or export a pack. Trusted Emergency Access has no automatic inactivity or legacy release. These limits are product and security gates, not implied capabilities.

Feature-specific decisions live in the companion documents in this folder and in `docs/security`.
