# Guardian deterministic briefing

Guardian is a private, deterministic briefing over dates that a signed-in user has already confirmed in DiaryDock. It does not use AI to decide whether something needs attention and does not silently change source records.

## Data flow

The central reminder engine is the authoritative source adapter. Each generated reminder retains a resource type and ID, source date key, exact source due timestamp and IANA time zone. Guardian groups reminder offsets back into one source date, evaluates the source once, and stores one `guardian_findings` row using the stable key `resourceType:resourceId:dateKey`.

The authenticated `GET /api/guardian` route performs an idempotent reconciliation before returning the active briefing. It updates active findings when a source date changes, resolves active findings that have left the 90-day window, preserves dismissed and resolved choices, and wakes seven-day snoozes only after their saved time has passed. Row-level security independently restricts every finding to its owner.

## Rules and language

Rule version 1 has four deterministic date bands:

- more than 30 days overdue: `URGENT`;
- overdue through seven days ahead: `IMPORTANT`;
- eight through 30 days ahead: `ATTENTION`;
- 31 through 90 days ahead: `INFO`.

The database severity is useful for sorting and future notification policy. The interface deliberately translates it into calm phrases such as “Worth checking” and “Recorded date passed.” Day boundaries are calculated in the source time zone, including daylight-saving transitions.

## User control and limitations

Users can open the source, mark an item sorted, dismiss it, or remove it from the briefing for seven days. Guardian never writes to documents, assets, vehicles, pets, policies or their dates. The current registry covers structured expiry, renewal, service and vaccination dates supplied by the central reminder engine. Missing-link, stale-review and travel-readiness adapters will be added when their authoritative module records are available; they must use the same deterministic, owner-scoped contract.
