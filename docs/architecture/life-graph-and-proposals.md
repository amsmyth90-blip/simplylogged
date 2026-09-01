# Life Graph and record proposals

Date: 1 September 2026

## Purpose

The Life Graph is DiaryDock's owner-scoped connection layer beneath the existing consumer rooms. It is not a second navigation system and does not replace working vehicle, home, pet, document or reminder screens. It provides durable entities, facts, relationships, provenance and document links that later services can retrieve consistently.

## Trust boundary

- `life_entities`, `life_facts`, `life_relationships` and document links remain protected by authenticated owner RLS.
- Database triggers require both ends of a relationship, every fact entity, every document-link entity and action source/target entities to belong to the row owner.
- Confidence values are constrained to 0–1.
- A document extraction is never a confirmed fact merely because confidence is high.
- Cross-household sharing continues through the explicit resource-visibility system; the Life Graph does not grant access by association.

## Capture proposals

After a user confirms extracted fields, DiaryDock can prepare `action_requests` for three pilots:

- MOT certificate → update vehicle MOT details and optionally create an expiry reminder;
- appliance receipt/warranty → create an asset record and optionally create a warranty reminder;
- pet vaccination record → create a vaccination record and optionally create a next-due reminder.

Only fields visibly confirmed by the user enter proposal payloads. Each proposal has a stable per-capture dedupe key and `requires_confirmation=true`. Repeated confirmation cannot create duplicates. The proposal review screen lets the user keep or dismiss suggestions; keeping one still does not silently mutate an authoritative module record. Execution adapters are the next sub-milestone.

## Privacy

Proposal titles and reasons are generic. The structured payload is owner-only and may contain the small set of confirmed values needed for the proposed action. Original bytes and OCR text remain outside `action_requests`.

## Compatibility

Deployed DiaryDock projects include both UUID and text generations of document identifiers. Proposal APIs accept canonical UUID capture/document IDs used by the current app and avoid rewriting applied historical migrations.
