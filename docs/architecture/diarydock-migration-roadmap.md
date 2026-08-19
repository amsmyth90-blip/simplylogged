# DiaryDock Life OS Migration Roadmap

## Strategy

Move from feature-first app to Life OS gradually.

Do not rewrite the product. Add shared foundations under the current UI, then route new intelligent features through those foundations.

## Stage A — Before launch

Only work needed to avoid architectural debt.

### A1. Life Graph foundation

Create additive migrations for:

- `life_entities`
- `life_relationships`
- `life_documents` or links from existing `documents`
- `life_document_links`
- `life_events`
- `life_tasks` or bridge from existing `reminders`
- `life_facts`
- `provenance_records`

Do not remove `app_state`.

### A2. Repository adapters

Create:

- `lib/life-graph/repositories.ts`
- `lib/life-graph/projections.ts`
- adapters from current documents/reminders
- first adapters for vehicles, trips, policies and pets

Keep existing workspaces working.

### A3. DiaryDock Brain wrapper

Create:

- `lib/brain/provider-adapters/openai.ts`
- `lib/brain/extraction/*`
- `lib/brain/policies/*`
- `lib/brain/audit.ts`

Move shared AI concerns out of route handlers, but do not rebuild every prompt at once.

### A4. Life Inbox foundation

Create a common ingestion record and pipeline state:

- upload source
- stored file reference
- classification result
- extraction result
- suggested destination
- user review status

Connect current sources:

- scan/upload
- Android share sheet
- Resend email import

### A5. Event and Watch basics

Add deterministic event rules for:

- document review needed
- MOT/tax/insurance renewal
- bill due date
- contract renewal/cancellation window
- passport/identity document expiry
- pet vaccination due when pet records exist

Today should read from these events rather than custom room summaries.

### A6. Permission/action/audit foundations

Add:

- `permission_grants`
- `action_requests`
- `action_steps`
- `audit_events`

No autonomous provider contact or money movement before launch.

### A7. Tests

Minimum tests:

- RLS/policy assumptions for new tables
- Life Graph repository insert/read/update
- event rule generation
- AI extraction wrapper with mocked provider
- email/share dedupe logic
- permission denial tests

## Stage B — Shortly after launch

Add:

- Ask DiaryDock MVP
- Life Brief
- improved Life Inbox review queue
- missing-information detection
- richer Watch insights
- more entity adapters for home, bills, contracts, health and wills
- user-facing source/evidence display

## Stage C — Agentic DiaryDock

Add:

- tool-based AI actions
- Deal With It style workflows
- provider contact drafts
- booking preparation
- cancellation guides
- advanced action permissions
- stronger audit UI
- user-configurable autopilot

Still require explicit confirmation for high and very-high risk actions.

## Stage D — External ecosystem

Add only after internal permission/action model is mature:

- Agent Gateway
- MCP-compatible or equivalent external tool boundary
- third-party integrations
- external AI assistant scopes
- integration marketplace-style controls

## Phase AI-Foundation 1.0

Recommended first implementation phase.

### Goal

Add the minimum architecture needed for DiaryDock's AI future without attempting to build the whole Life OS.

### Likely new files/modules

```text
lib/life-graph/entities.ts
lib/life-graph/relationships.ts
lib/life-graph/events.ts
lib/life-graph/facts.ts
lib/life-graph/provenance.ts
lib/life-graph/repositories.ts
lib/life-graph/projections.ts

lib/brain/provider-adapters/openai.ts
lib/brain/extraction/document-classifier.ts
lib/brain/extraction/confidence.ts
lib/brain/policies/document-safety.ts
lib/brain/audit.ts

lib/life-inbox/ingest.ts
lib/life-inbox/dedupe.ts
lib/life-inbox/review.ts

lib/watch/rules.ts
lib/watch/insights.ts

lib/actions/action-types.ts
lib/actions/permissions.ts
lib/actions/audit.ts
```

### Existing files likely to change

- `app/api/capture/extract/route.ts`
- `app/api/import/email/route.ts`
- `components/DocumentCaptureWorkspace.tsx`
- `components/ShareImportWorkspace.tsx`
- `components/DocumentDetailWorkspace.tsx`
- `components/RemindersWorkspace.tsx`
- `components/DashboardHome.tsx`
- `lib/diarydock-data.ts`
- `lib/structured-data.ts`
- feature record modules where adapters are added

### Database migrations

Additive migrations only:

- life graph entity tables
- relationship table
- provenance/fact tables
- event table
- action/permission/audit tables
- indexes by `user_id`, `entity_type`, `relationship_type`, `starts_at`, `source_document_id`
- RLS policies for user-owned and household-scoped records

### Expected risks

- dual-write complexity while old and new data coexist
- RLS mistakes on new graph tables
- accidental over-modeling
- UI confusion if Life Inbox review states are not simple
- AI outputs being mistaken for confirmed facts

### Success criteria

- existing rooms still work
- new documents can create Life Inbox records
- documents can link to Life Graph entities
- Watch can generate deterministic events
- AI extraction writes suggested facts with provenance
- action requests can be created and audited
- no autonomous high-risk actions exist

## Migration principles

- additive first
- keep current UI stable
- no destructive data movement until backfilled and verified
- use feature adapters
- prove with one or two domains before expanding
- prefer boring Postgres and RLS over exotic infrastructure
- keep AI optional for deterministic tasks

