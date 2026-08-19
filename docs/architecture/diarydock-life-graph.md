# DiaryDock Life Graph

## Goal

The Life Graph is the structured representation of the practical parts of a user's life. It should let DiaryDock understand relationships between people, homes, vehicles, pets, documents, providers, tasks, trips, policies, receipts and events.

It should initially use Supabase/Postgres relational tables, not a separate graph database. A relational implementation with generic entity and relationship tables is flexible enough for launch and keeps RLS, backups, migrations and reporting simpler.

## Core design

```text
life_entities
  one row per meaningful thing

life_relationships
  typed edges between entities

life_documents
  document metadata and storage reference

life_document_links
  links documents to entities

life_events
  dated events used by Watch and Today

life_tasks
  user/actionable tasks and reminders

life_facts
  extracted or confirmed facts with provenance
```

This can coexist with the current `documents`, `reminders` and `app_state` tables during migration.

## Entity model

### User

- Purpose: owner of private Life Graph.
- Existing source: Supabase Auth.
- Relationships: owns entities, documents, permissions, actions, audit events.
- Deletion: account deletion should cascade or anonymise user-owned graph data according to policy.
- Audit: account lifecycle, exports, deletion requests, security-sensitive changes.

### Household

- Purpose: group context for shared family data.
- Existing source: `households`, `household_memberships`, `household_state`.
- Relationships: has people, homes, shared documents, access grants.
- Deletion: owner transfer or delete after member removal.
- Audit: membership changes, role changes, shared access changes.

### Person

- Purpose: household members, trusted people, professionals, beneficiaries, emergency contacts.
- Likely table/model: `life_entities` type `person`, optional specialised `people` table.
- Parent: user/household.
- Children: contacts, permissions, tasks, appointments, documents.
- Important fields: display name, relationship, role, contact details, sensitivity, trusted access role.
- Deletion: soft delete if referenced by audit/actions; hard delete if never linked.
- Audit: permission changes, trusted access changes.

### Home / Property

- Purpose: home or property record.
- Children: rooms, appliances, utility accounts, insurance, maintenance, documents, inventory.
- Important fields: address, ownership/tenancy status, move dates, policy links.
- Deletion: soft delete if linked to policies/documents.
- Audit: high-value property changes and sharing.

### Room / Presentation Area

- Purpose: UI projection, not data owner.
- Existing source: `lib/mock-data.ts`, room scene components.
- Important fields: room ID, display label, visual hotspot, preferred entity filters.
- Deletion: safe UI config only; should not delete underlying records.

### Document

- Purpose: stored file, OCR text, extracted metadata and review state.
- Existing source: `documents` table and private storage bucket.
- Relationships: may link to many entities.
- Important fields: title, type, storage path, original filename, mime type, source, review status, sensitivity, retention, hash/fingerprint.
- Deletion: remove metadata and storage object; preserve audit tombstone where required.
- Audit: upload, view, download, share, AI processing, deletion.

### Provider / Organisation

- Purpose: insurers, utilities, vets, garages, schools, solicitors, travel providers.
- Relationships: provides policies/contracts/services; linked to contacts and documents.
- Important fields: name, category, phone, email, website, account references.
- Deletion: soft delete if referenced by bills/policies/events.
- Audit: contact changes if used in future actions.

### Vehicle

- Purpose: owned/used vehicle.
- Existing source: `lib/vehicle-records.ts`.
- Children: MOT, tax, insurance, servicing, repairs, costs, receipts, documents, reminders.
- Important fields: make/model, registration, VIN, mileage, dates, ownership status.
- Deletion: archive rather than delete if past records exist.
- Audit: ownership, registration, insurance and MOT changes.

### Pet

- Purpose: pet care and health records.
- Children: vaccinations, vet appointments, medication, insurance, grooming, documents.
- Important fields: name, species, breed, microchip, vet, insurance status.
- Deletion: archive with sensitivity to emotional/memorial records.
- Audit: medical and trusted access changes.

### Policy

- Purpose: insurance and protection policies.
- Existing source: `lib/insurance-records.ts` and vehicle insurance records.
- Parent relationships: person, home, vehicle, pet or trip.
- Children: documents, renewals, claims, payments, provider.
- Important fields: policy type, provider, policy number, premium, renewal, excess, cover summary.
- Deletion: archive after expiry/cancellation.
- Audit: cover changes, renewal dates, claims.

### Bill / Financial Commitment

- Purpose: household bills and payments.
- Existing source: `lib/bill-records.ts`.
- Relationships: provider, home, service, document, payment events.
- Important fields: amount, frequency, due date, account masked, category, payment method.
- Deletion: archive if payment history exists.
- Audit: direct debit/payment method changes.

### Contract / Subscription

- Purpose: contracts, subscriptions and renewal/cancellation dates.
- Existing source: `lib/contract-records.ts`.
- Relationships: provider, home/person, documents, reminders.
- Important fields: start/end dates, notice period, auto-renewal, payment amount.
- Deletion: archive after cancellation.
- Audit: cancellation and provider contact actions.

### Trip

- Purpose: travel plans.
- Existing source: `lib/trip-records.ts`.
- Children: bookings, documents, checklists, travellers, emergency info, expenses.
- Relationships: people, passports, travel insurance, providers.
- Deletion: archive past trips; delete drafts.
- Audit: sharing and sensitive travel documents.

### Task / Reminder

- Purpose: user-facing actions and due dates.
- Existing source: `reminders`.
- Relationships: linked entity, document, event, action request.
- Important fields: title, due date, status, priority, source, generated_by.
- Deletion: soft-delete completed/AI-generated tasks when needed for audit.
- Audit: generated/accepted/dismissed/completed.

### Event

- Purpose: dated occurrence used by Watch, Today and Life Brief.
- Examples: policy renewal, MOT due, passport expiry, pet vaccination due, appointment, bin collection.
- Relationships: source entity, task/reminder, document, rule that created it.
- Important fields: event type, starts_at, ends_at, status, severity, source fact.
- Deletion: regenerate from source facts when deterministic.
- Audit: if user edited or dismissed.

### Fact

- Purpose: atomic piece of information with provenance.
- Examples: MOT expiry date, policy number, passport expiry, receipt amount.
- Important fields: key, value, data type, confidence, source, confirmation status.
- Lifecycle: extracted → suggested → confirmed/rejected.
- Audit: confirmation and changes.

### Preference

- Purpose: user choices that help DiaryDock personalise advice without guessing.
- Examples: communication preferences, travel preferences, reminder lead times, pet care preferences, privacy preferences.
- Relationships: user, household, trip, pet, vehicle, provider or action policy.
- Important fields: preference key, value, scope, source, confidence, confirmed_at.
- Deletion: user-controlled hard delete unless needed for audit of an action.
- Audit: changes that affect automation or sharing.

### Life Twin Profile

- Purpose: derived, queryable summary of the user's practical life.
- Implementation: not a separate source of truth; generated from entities, facts, preferences and relationships.
- Fields: cached summaries, completeness scores, stale markers, last_generated_at.
- Deletion: regenerate or delete with source data.
- Audit: summaries shown to AI/external agents should be logged.

## Relationship table

Suggested `life_relationships` shape:

```text
id
user_id
household_id nullable
source_entity_id
target_entity_id
relationship_type
confidence
provenance_id nullable
created_by
created_at
ended_at nullable
metadata jsonb
```

Examples:

```text
vehicle owns document
vehicle has insurance_policy
insurance_policy provided_by organisation
pet has vaccination_event
trip requires passport
document evidences fact
person has trusted_access_to document
```

## Provenance

Every important value should know where it came from:

- manual user entry
- imported email
- Android share sheet
- uploaded document
- OCR extraction
- AI inference
- migrated legacy app state

Suggested statuses:

- `confirmed`
- `suggested`
- `needs_review`
- `rejected`
- `stale`

AI-generated facts must never be indistinguishable from user-confirmed facts.

## Deletion behaviour

Use a mixed strategy:

- hard delete: unlinked drafts, temporary uploads, failed imports
- soft delete/archive: entities with audit history, documents, permissions or action logs
- cascade: derived events/facts that can be regenerated
- tombstone: sensitive security/audit events without preserving personal content

## Migration from current state

1. Keep current `app_state`, `documents` and `reminders`.
2. Add Life Graph tables.
3. Backfill graph entities from structured documents/reminders first.
4. Add projection adapters for vehicles, trips, policies, bills and pets.
5. Write new records to both old and new structures during transition.
6. Read from graph for new AI/Watch/Today features first.
7. Gradually reduce dependence on `app_state.payload`.
