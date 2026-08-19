# DiaryDock Current State Architecture Audit

Date: 2026-08-19

Scope: local repository inspection only. No production systems, production databases, destructive migrations, commits, pushes or deployments were used for this audit.

## Executive summary

DiaryDock is currently a mobile-first Next.js application with a strong visual room metaphor, Supabase authentication/storage, a growing set of feature workspaces, OpenAI-powered document/photo extraction, Resend inbound email import, and Capacitor Android packaging.

The strongest existing foundation is the product shell: authenticated routes, private document storage, room-based navigation, reusable bottom navigation, and feature-rich workflows for documents, vehicles, travel, office admin, wills, kitchen, garden, bedroom and attic.

The main architectural limitation is that the product has grown as room-specific screens and feature-specific records rather than around a central domain model. Data is partly structured (`documents`, `reminders`, household tables) and partly held inside a large `app_state.payload` JSON object. This is acceptable for the current app, but the proposed Life OS requires a structured Life Graph, central AI orchestration, events, permissions, actions and audit logs underneath the existing room UI.

## Current system map

```text
Frontend
  Next.js App Router pages in app/*
  React client workspaces in components/*
  Room scene components and shared bottom navigation

Application Layer
  DiaryDockDataProvider
  lib/diarydock-data.ts state repository
  feature record modules in lib/*-records.ts
  upload helpers and structured-data sync helpers

API / Server Layer
  app/api/capture/extract
  app/api/kitchen/*
  app/api/import/email
  app/api/import/email-address
  auth callback, login actions, account deletion APIs

Database
  Supabase Auth
  app_state JSONB
  documents
  reminders
  household tables
  document_permissions
  rate_limit_buckets
  account_deletion_requests

Storage
  Private Supabase bucket: diarydock-documents
  User-prefixed storage paths
  Short-lived signed URLs

AI
  OpenAI calls inside several API routes
  JSON-schema extraction for documents, wills, bills, insurance and receipts
  Kitchen recipe, noticeboard and pantry-related extraction

External Services
  Supabase
  OpenAI
  Resend inbound email
  Vercel
  Codemagic
  Capacitor Android/iOS
  TheMealDB recipe search
```

## Framework and runtime

- Next.js App Router with Next `16.3.0`.
- React `19.1.0`.
- TypeScript `5.8.3`.
- Tailwind CSS `3.4.17`.
- Supabase JS/SSR clients.
- OpenAI SDK.
- Resend SDK.
- Capacitor Android/iOS setup.
- Remotion tooling for promo video work.

Relevant files:

- `app/layout.tsx`
- `app/globals.css`
- `next.config.ts`
- `capacitor.config.ts`
- `codemagic.yaml`
- `package.json`

## Routing structure

DiaryDock uses App Router pages. Most user-facing app pages are authenticated by calling `requireUser()` server-side before rendering a client workspace.

Major route families:

- `/dashboard`
- `/room/[roomId]`
- `/files`
- `/document/[documentId]`
- `/capture`
- `/settings`
- `/reminders`
- `/search`
- `/intake`
- `/emergency`
- `/family/*`
- `/kitchen/[feature]`
- `/office/*`
- `/wills/*`
- `/garage/vehicles/[vehicleId]/*`
- `/driveway/*`
- `/garden/*`
- `/bedroom/*`
- `/attic/*`
- `/privacy`, `/terms`, `/cookies`, `/support`
- `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/onboarding`

Most feature pages are thin route wrappers around large workspace components. That is simple and productive, but the workspace components have accumulated domain logic, presentation logic and navigation logic together.

## UI architecture

Important shared components:

- `components/BottomNav.tsx`
- `components/RoomPage.tsx`
- `components/RoomSceneChrome.tsx`
- `components/PageHeader.tsx`
- `components/SectionHeader.tsx`
- `components/DocumentCard.tsx`
- `components/DocumentDetailWorkspace.tsx`
- `components/DocumentCaptureWorkspace.tsx`
- `components/UiIcon.tsx`
- `components/EmptyState.tsx`
- `components/ModalShell.tsx`
- `components/Toggle.tsx`

Room and feature workspaces:

- House/dashboard: `DashboardHome`, `EstateDashboard`
- Rooms: `KitchenRoom`, `OfficeWorkspace`, `GarageWorkspace`, `GardenRoom`, `BedroomRoom`, `AtticRoom`, `DrivewayWorkspace`, `FamilyWorkspace`
- Office: bills, insurance, contracts, correspondence, professional contacts
- Garage: vehicle profile, MOT/tax, insurance, servicing, costs, receipts
- Driveway/travel: trips and travel checklist
- Wills: landing, my will, letters of wishes, preferences
- Bedroom/health and Garden/attic sections

The room visual metaphor is a good product decision and should stay. The concern is not the UI metaphor; it is that some data ownership is implied by room/page location rather than by durable domain relationships.

## Component size and maintainability

Several components are now large enough to slow safe iteration:

- `components/driveway/TripDetailWorkspace.tsx` ~1992 lines
- `components/contracts/ContractsWorkspace.tsx` ~1576 lines
- `components/insurance/InsuranceWorkspace.tsx` ~1407 lines
- `components/contacts/ProfessionalContactsWorkspace.tsx` ~1360 lines
- `components/correspondence/CorrespondenceWorkspace.tsx` ~1309 lines
- `components/OfficeWorkspace.tsx` ~1258 lines
- `components/driveway/TripsWorkspace.tsx` ~1256 lines
- `components/insurance/LifeInsuranceWorkspace.tsx` ~1048 lines
- `components/insurance/HomeInsuranceWorkspace.tsx` ~1036 lines

This does not require a rewrite, but future work should extract:

- domain selectors
- mutations
- upload flows
- analysis flows
- shared list/card shells
- feature tabs
- action menus

## Current data architecture

### Main state repository

`lib/diarydock-data.ts` defines `DiaryDockAppState`, which contains most current product data:

- reminders
- vault documents
- household members/invites
- emergency contacts/plans
- settings profile/groups
- room tasks/documents/activity
- mailbox items
- onboarding
- kitchen items/recipes/noticeboard/calendar
- wills and letters
- bills
- insurance
- contracts
- correspondence
- professional contacts
- vehicles
- trips
- travel checklist
- health
- family stories

The repository has two modes:

- `session`: stores state in `window.sessionStorage`.
- `supabase`: stores private state in `app_state.payload`, merges household state, then merges structured documents/reminders.

This is pragmatic for product building but is not enough for a Life OS because relationships between objects are not first-class.

### Structured tables

The repository already has structured Supabase tables for:

- `documents`
- `reminders`
- `household_members`
- `family_invites`
- `document_permissions`
- `households`
- `household_memberships`
- `household_state`
- `household_invites`
- `rate_limit_buckets`
- `account_deletion_requests`

`lib/structured-data.ts` maps between the front-end `VaultDocument`/`Reminder` style and these tables.

This is the best current seed of the Life Graph. It should be expanded rather than replaced.

### Feature record modules

Current feature models live in:

- `lib/bill-records.ts`
- `lib/contract-records.ts`
- `lib/correspondence-records.ts`
- `lib/insurance-records.ts`
- `lib/professional-contact-records.ts`
- `lib/vehicle-records.ts`
- `lib/trip-records.ts`
- `lib/travel-checklist-records.ts`
- `lib/health-records.ts`
- `lib/will-records.ts`
- `lib/letter-records.ts`
- `lib/family-story-records.ts`
- `lib/attic-sections.ts`
- `lib/garden-sections.ts`

These are valuable and should become adapters into the Life Graph rather than being thrown away.

## Current feature location map

| Product area | Main routes/components | Current data pattern |
|---|---|---|
| House dashboard | `/dashboard`, `DashboardHome`, `EstateDashboard` | room metadata from `mock-data`, app state summaries |
| Room scenes | `/room/[roomId]`, `RoomPage`, room-specific components | visual hotspots and routes, not a durable domain model |
| Documents / all files | `/files`, `/document/[documentId]`, `DocumentDetailWorkspace` | structured `documents` table plus `vaultDocuments` state |
| Capture / scan | `/capture`, `DocumentCaptureWorkspace`, `/api/capture/extract` | private storage, OpenAI extraction, document review state |
| Email import | `/api/import/email`, `/api/import/email-address` | Resend webhook into `documents`, needs-review review state |
| Office bills | `/office/bills/*`, `BillsWorkspace` | `bills` inside app state; linked document records for uploads |
| Office insurance | `/office/insurance/*`, `InsuranceWorkspace`, home/life insurance workspaces | `insurance` inside app state; linked documents |
| Contracts | `/office/contracts/*`, `ContractsWorkspace` | `contracts` inside app state; linked documents and cancellation data |
| Correspondence | `/office/correspondence/*`, `CorrespondenceWorkspace` | `correspondence` inside app state; linked documents/actions |
| Professional contacts | `/office/contacts/*`, `ProfessionalContactsWorkspace` | `professionalContacts` inside app state |
| Wills and wishes | `/wills/*`, wills components | `willsWishes` inside app state; legal-safe AI extraction for will docs |
| Garage / vehicles | `/garage/vehicles/[vehicleId]/*`, vehicle workspaces | `vehicles` inside app state; receipts/documents use private storage |
| Travel / driveway | `/driveway/*`, trips/checklist workspaces | `trips` and `travelChecklist` inside app state |
| Bedroom / health | `/bedroom/*`, bedroom workspaces | `health` inside app state |
| Garden / pets | `/garden/*`, garden workspaces | section metadata plus shared document patterns; currently being simplified locally |
| Attic / memories | `/attic/*`, attic/family story workspaces | `familyStories` inside app state; document image uploads |
| Family | `/family/*`, family workspaces | app state plus household sharing tables/RPCs |
| Reminders | `/reminders`, `RemindersWorkspace` | structured `reminders` table plus app state |
| Settings/support/legal | `/settings`, `/privacy`, `/terms`, `/cookies`, `/support` | mostly UI/static legal content; some settings state |

Most specialised domain records are currently JSON/state-backed rather than independently queryable relational entities. Documents and reminders are the main structured cross-room records.

## Current database and storage

### Supabase schema

Current schema highlights:

- `app_state`: user-scoped JSONB state.
- `documents`: user-scoped structured document records with OCR/extraction metadata, storage path, review status and sharing flags.
- `reminders`: user-scoped reminders with room/document links.
- household sharing tables and RPCs.
- `document_permissions`: owner-controlled document permissions.
- rate limiting function and bucket table.
- account deletion request table and RPC.

### RLS

RLS is enabled for the existing structured user tables. Common policies use `auth.uid()` to restrict rows to the current user. Storage policies restrict objects to a user ID folder prefix.

### Storage

`diarydock-documents` is configured as a private Supabase bucket. Current helper code uploads under a path shaped like:

```text
{userId}/{documentId}/{safeFileName}
```

Signed URLs are short-lived:

- 60 seconds for opening/downloading in some flows.
- 300 seconds for previews.

This is a good current security pattern.

## AI integrations

OpenAI is currently called directly inside route handlers:

- `app/api/capture/extract/route.ts`
- `app/api/kitchen/analyse/route.ts`
- `app/api/kitchen/noticeboard/extract/route.ts`
- `app/api/kitchen/recipes/scan/route.ts`

The document extraction route supports multiple analysis modes:

- general document
- will
- bill
- insurance
- receipt

It uses JSON schema output, server-side authentication and rate limiting. This is a good pattern, but the AI orchestration is fragmented by page/feature.

Future risk: if every room continues adding its own AI endpoint and prompt, DiaryDock will struggle to support Ask DiaryDock, Life Brief, permission-aware tool calls and cost controls.

## Document upload and ingestion

Current ingestion paths:

- main scan/capture flow
- feature-specific uploads inside bills, insurance, contracts, correspondence, wills, garage, travel, attic and garden
- Android share sheet import
- Resend inbound email import

Current process usually looks like:

```text
Upload file
↓
Store private document
↓
Optionally call AI extraction
↓
Create/update feature record
↓
Add/review document
```

There is no single Universal Life Inbox domain yet, but the pieces are already present.

## Email import

`app/api/import/email/route.ts` supports:

- Resend webhook signature verification.
- fallback secret header flow.
- inbound address verification using a user-specific token.
- attachment validation.
- private storage upload.
- dedupe by deterministic ID and matching document fields.
- document insertion with `needs-review`.

This is a solid start for Universal Life Inbox. It should become one ingestion source within a generic pipeline.

## Mobile-specific functionality

- Capacitor configured with app ID `com.diarydock.app`.
- Android project exists.
- Android share import plugin exists: `android/app/src/main/java/com/diarydock/app/DiaryDockShareImportPlugin.java`.
- Codemagic workflow builds a developer APK.
- The app uses hosted web content via `server.url: https://diarydock.com`.

This means many web production changes can appear in the installed APK without rebuilding, but native plugin or manifest changes require a new APK.

## Current security controls

Strengths:

- Supabase server/client separation.
- `SUPABASE_SERVICE_ROLE_KEY` only used in server-side admin client.
- Most authenticated pages call `requireUser`.
- API routes with sensitive AI/document functionality verify current user.
- Private storage bucket and RLS policies.
- Short-lived signed URLs.
- Rate limiting on auth and AI-heavy endpoints.
- Resend webhook signature verification.
- Security headers in `next.config.ts`.
- Public privacy/terms/cookies/support pages.
- Account deletion request flow.

Concerns:

- No central permission policy engine yet.
- `document_permissions` is present but not yet a granular entity/action/scope model.
- AI prompts are distributed and not centrally governed.
- Uploaded documents can influence downstream AI extraction; prompt-injection handling is not yet explicit.
- No general audit log for viewed/exported/shared/AI-processed records.
- `app_state.payload` makes database-level permissioning and selective export/deletion difficult for many feature objects.
- CSP currently allows `unsafe-inline` and `unsafe-eval`, likely for Next compatibility, but should be revisited before high-risk agentic functionality.

## Current privacy posture

Positive:

- The app already warns in the privacy page that AI outputs can be incomplete and should be reviewed.
- Document review status exists.
- Private storage is used.
- Email import adds `needs-review` rather than silently confirming facts.

Needs strengthening for Life OS:

- sensitivity classification per entity/document
- provenance for facts and AI-generated summaries
- export and deletion at entity level
- retention policies for raw OCR/extracted text
- user-visible AI processing history
- revocation/audit for trusted access

## Bottlenecks for Life OS evolution

1. `DiaryDockAppState` is too broad and JSON-heavy for future relationship, permission and audit requirements.
2. Room pages are currently closer to feature/data ownership than a pure presentation layer.
3. AI logic is useful but fragmented across route handlers.
4. There is no central event/task/action model.
5. There is no Life Graph relationship table or entity registry.
6. Permissions are document/household-oriented, not entity/action/scope-oriented.
7. Feature workspaces are large and combine UI, domain decisions, mutations and side effects.
8. There is no durable provenance model distinguishing confirmed facts, extracted facts and inferred facts.
9. DiaryDock Watch/Today-style logic is not yet backed by generic life events.
10. Future external-agent access would currently have no safe gateway boundary.

## Code that should remain largely untouched

- The room visual metaphor and room scene components.
- Bottom navigation shell.
- Current Supabase Auth integration.
- Private document storage helper pattern.
- Existing structured `documents` and `reminders` tables.
- Resend inbound email import as an ingestion source.
- Existing feature record modules as transitional domain adapters.
- Existing mobile/Capacitor setup.
- Legal/support/settings pages.
- Polished feature workspaces that users already understand.

## Current architecture scores

| Area | Score | Reason |
|---|---:|---|
| Maintainability | 68/100 | Clear route/component conventions and TypeScript types, but large workspace components and broad app state increase change risk. |
| Scalability | 56/100 | Product can grow short-term, but JSON-heavy state and isolated feature models limit queryability and cross-domain relationships. |
| Security | 74/100 | Strong auth/RLS/storage/webhook foundations; missing granular permission/action/audit layer for future AI agents. |
| AI readiness | 54/100 | Good extraction endpoints and schemas; no central Brain, provider adapter, retrieval or policy layer yet. |
| Life Graph readiness | 38/100 | Domain records exist but relationships are implicit. A first-class entity/relationship/event model is needed. |
| Agentic AI readiness | 24/100 | Safe agentic behaviour needs permission, action, audit and tool boundaries that do not exist yet. |
