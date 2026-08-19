# DiaryDock Action and Permission Model

## Why this matters

DiaryDock may eventually help users act on their life admin. That is powerful and risky. The app must distinguish between:

- organising information
- suggesting actions
- changing records
- sharing data
- contacting third parties
- spending money or signing/cancelling agreements

AI must never be the authority for access control. Enforcement must happen in trusted server-side code and database policies.

## Action lifecycle

Every meaningful AI-assisted action should follow:

```text
OBSERVE
↓
UNDERSTAND
↓
RECOMMEND
↓
REQUEST PERMISSION
↓
ACT
↓
VERIFY
↓
RECORD
```

## Action risk levels

| Risk | Examples | Permission behaviour |
|---|---|---|
| Low | create reminder, classify document, suggest folder | may be allowed by autopilot setting, still reversible |
| Medium | update structured record, link document to entity, mark bill paid | explicit confirmation by default |
| High | contact provider, share document, send email, book appointment | explicit confirmation every time until mature policy exists |
| Very high | spend money, cancel contract, sign agreement, change legal/financial access | always explicit confirmation; likely no autonomy at launch |

## Suggested tables

### action_requests

```text
id
user_id
household_id nullable
action_type
risk_level
status
title
summary
reason
source_entity_id nullable
target_entity_id nullable
source_document_id nullable
proposed_payload jsonb
requires_confirmation boolean
requested_by user|ai|system
created_at
expires_at nullable
confirmed_at nullable
completed_at nullable
cancelled_at nullable
```

Statuses:

- `proposed`
- `awaiting_permission`
- `approved`
- `running`
- `completed`
- `failed`
- `cancelled`
- `dismissed`

### action_steps

```text
id
action_request_id
step_name
status
input_summary
output_summary
error_message nullable
created_at
completed_at nullable
```

### audit_events

```text
id
user_id
household_id nullable
actor_type
actor_id nullable
event_type
entity_id nullable
document_id nullable
action_request_id nullable
metadata jsonb
created_at
ip_hash nullable
user_agent_hash nullable
```

### permission_grants

```text
id
user_id
household_id nullable
subject_type
subject_id
scope
entity_type nullable
entity_id nullable
category nullable
sensitivity_max nullable
allowed_actions text[]
denied_actions text[]
starts_at
expires_at nullable
revoked_at nullable
created_at
```

Subjects can be:

- household member
- trusted person
- AI agent/session
- external integration
- future external agent

Scopes:

- `READ`
- `WRITE`
- `ACT`
- `SHARE`

## Permission examples

### Travel helper

```text
READ:
  trip dates
  passport expiry
  travel preferences

WRITE:
  trip checklist items
  trip documents after confirmation

DENIED:
  health records
  banking
  wills
  private household documents
```

### Trusted person emergency access

```text
READ:
  emergency contacts
  selected emergency documents

WRITE:
  none

ACT:
  none

SHARE:
  none
```

## Autopilot settings

Future Life Autopilot should be policy-backed, not just UI toggles.

Allowed by default only after user choice:

- organise documents
- classify receipts
- create draft reminders
- identify renewals

Ask first:

- update important records
- share with trusted people
- contact providers
- create bookings
- send emails

Never automatic:

- spend money
- cancel subscriptions/contracts
- sign or submit legal documents
- grant access to sensitive records
- expose identity, health, legal or financial documents externally

## Server-side enforcement

All write/action/share operations should pass through:

```text
authenticated user
↓
permission resolver
↓
policy check
↓
risk classifier
↓
action engine
↓
audit log
```

The UI can hide disallowed actions, but the server must enforce them.

## Agent Gateway boundary

Future external agents should call a narrow tool gateway:

```text
get_upcoming_events
get_vehicle_status
get_document_metadata
request_document_access
create_task
create_reminder
propose_document_link
```

No external agent should receive a broad database token or unrestricted API access.

Every call should be:

- authenticated
- authorised
- scoped
- logged
- revocable
- rate limited
- bound to consent

## Launch recommendation

Before public launch, implement only the foundations:

- action request table
- audit event table
- permission grant table
- basic server-side policy helper
- no autonomous third-party actions

This creates the safety boundary without overbuilding agentic features too early.

