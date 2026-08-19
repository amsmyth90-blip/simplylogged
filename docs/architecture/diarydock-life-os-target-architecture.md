# DiaryDock Life OS Target Architecture

## Design principle

Keep the DiaryDock house as the user experience. Build the Life OS underneath it.

```text
Rooms = presentation layer
Life Graph = domain/data layer
DiaryDock Brain = reasoning and orchestration layer
Action Engine = controlled execution layer
DiaryDock Watch = deterministic monitoring layer
```

The app should feel like a private digital home, not a database, legal portal or AI dashboard.

## Target architecture map

```text
UI
│
├── Dashboard / House
├── Today
├── Ask DiaryDock
├── Add / Life Inbox
└── Rooms
    ├── Home
    ├── Documents
    ├── Health
    ├── Family
    ├── Vehicles
    ├── Travel
    ├── Pets & Garden
    ├── Memories
    └── Settings
        ↓
Application Services
│
├── room projection service
├── document service
├── reminder/task service
├── life inbox service
├── household/access service
├── notification service
└── audit service
        ↓
Life Graph Domain
│
├── entities
├── relationships
├── documents
├── events
├── tasks/reminders
├── people/households
├── providers
├── policies/contracts/bills
├── vehicles/pets/homes/trips
└── provenance
        ↓
DiaryDock Brain
│
├── orchestrator
├── context resolver
├── retrieval
├── extraction/classification
├── summarisation
├── missing-information reasoning
├── AI provider adapters
├── safety policies
└── audit hooks
        ↓
Action Engine
│
├── action requests
├── permission checks
├── user confirmation
├── execution adapters
├── verification
└── immutable action log
        ↓
DiaryDock Watch
│
├── event rules
├── due-date thresholds
├── completeness rules
├── insights
└── Today / Life Brief feed
        ↓
External Services
│
├── Supabase
├── OpenAI or other AI providers
├── Resend
├── mobile share sheet
├── future notification provider
└── future agent gateway / MCP-compatible boundary
```

## What changes conceptually

Today, many pages own their own data. In the target architecture, pages display projections of Life Graph data.

Example:

```text
One passport record
├── visible in Travel → Documents
├── visible in Documents → Personal ID
├── can trigger Watch expiry rules
├── can be referenced by Ask DiaryDock
└── can be shared under explicit permission
```

The passport is not duplicated per room.

## Core target modules

Suggested future folders:

```text
lib/life-graph/
  entities.ts
  relationships.ts
  documents.ts
  events.ts
  tasks.ts
  provenance.ts
  projections.ts
  repositories.ts

lib/brain/
  orchestrator.ts
  context.ts
  retrieval.ts
  providers/
  prompts/
  policies/
  extraction/
  audit.ts

lib/life-inbox/
  ingest.ts
  classify.ts
  extract.ts
  propose-destination.ts
  confirm.ts

lib/actions/
  action-types.ts
  action-engine.ts
  permissions.ts
  execution.ts
  audit.ts

lib/watch/
  event-rules.ts
  completeness-rules.ts
  thresholds.ts
  insights.ts
  brief.ts
```

These modules should initially wrap existing feature code. Do not move every screen at once.

## Room projection model

Rooms should become views over graph entities:

| Room label | Underlying entity focus |
|---|---|
| Home | household/home life, kitchen/home admin, noticeboard-style actions |
| Documents | official/admin documents, bills, contracts, wills, personal records |
| Health | health profile, medication, appointments, personal care records |
| Family | household people, schedules, shared routines |
| Vehicles | vehicles, MOT/tax, servicing, insurance, costs, receipts |
| Travel | trips, checklists, bookings, travel documents |
| Pets & Garden | pets, vet records, outdoor jobs, bins, tools, garden spaces |
| Memories | family stories, keepsakes, heirlooms, provenance |
| Settings | account, permissions, integrations, support |

## Universal Life Inbox

The existing scan, share sheet and email import should converge into:

```text
Ingestion source
↓
Secure storage
↓
Document fingerprint/deduplication
↓
Classification
↓
Extraction
↓
Entity and relationship suggestions
↓
User review
↓
Confirmed Life Graph updates
```

Critical details should not be silently written as confirmed facts. The user should approve uncertain or high-impact fields.

## Today / Life Brief

Today should not be manually assembled by each room. It should come from:

- life events
- tasks
- reminders
- Watch insights
- recent imports awaiting review
- action requests awaiting permission

AI may summarise Today, but deterministic rules should calculate due dates and urgency.

## DiaryDock Watch

DiaryDock Watch should be a lightweight monitoring layer over Life Graph events and facts.

Initial rules should be deterministic:

- due within 7, 14, 30, 60 or 90 days
- expired/overdue
- missing related record
- imported document waiting for review
- high-value record without supporting document

```text
Life Graph fact/event
↓
Watch rule
↓
Insight
↓
Today feed / reminder / suggested action
```

Generative AI can later explain or prioritise insights, but it should not be needed to calculate basic expiry or renewal dates.

## What am I forgetting?

This should combine completeness rules with optional AI reasoning.

Examples:

```text
Vehicle exists
→ expected relationships: insurance, MOT, tax, servicing
→ missing insurance
→ suggest adding policy or uploading certificate
```

```text
Trip exists
→ expected relationships: travel documents, checklist, emergency contact, optional insurance
→ travel insurance missing
→ suggest reviewing whether it is needed
```

The rule output should be a suggestion, not a judgment.

## Ask DiaryDock

Ask DiaryDock should query the Life Graph before calling AI. It should return:

- answer
- confidence
- source records/documents
- whether the answer is known, inferred or unavailable
- next action if information is missing

It must avoid hallucinating personal records.

## Future Agent Gateway

Do not build this yet. The architecture should leave a clean boundary:

```text
External agent
↓
Gateway authentication
↓
Consent and policy check
↓
Approved tool
↓
Life Graph / Action Engine
↓
Audit log
```

The core app should not depend on any one external agent protocol today.

## Life Twin capability

The future DiaryDock Life Twin should be a structured representation of practical life admin, not an avatar.

It should combine:

- explicit user-confirmed records
- imported documents
- derived events
- user preferences
- AI summaries
- inferred relationships

Every item must retain provenance. Confirmed facts, extracted facts and AI inferences must stay visually and technically distinguishable.

Life Twin domains:

- people
- household/home
- vehicles
- pets
- possessions
- documents
- providers
- bills/contracts/subscriptions
- travel
- tasks/events
- preferences
- emergency/legacy records

The Life Twin should be queryable by Ask DiaryDock and monitored by Watch, but it should not independently grant access or perform actions.

## Implementation posture

The target architecture should be introduced as a set of thin foundations:

1. create Life Graph tables and repositories
2. add adapters from existing app state records
3. create Brain abstraction around current AI endpoints
4. add event/action/permission tables
5. route new capabilities through these layers
6. gradually migrate existing features where there is a real product benefit

Avoid a big-bang rewrite.
