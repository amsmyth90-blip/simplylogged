# Central reminder engine

Date: 1 September 2026

## Contract

DiaryDock has one reminder table and one database-owned synchronization function. Existing manual reminders remain `USER_CREATED`; generated expiry, renewal, service, vaccination and Guardian reminders are `SYSTEM_GENERATED` and retain their source resource, source date key, rule/version, exact timestamps, schedule offset and dedupe key.

## Deterministic schedules

The default schedule is 90, 60, 30, 14, 7 and 1 day before a source date. Vaccinations use 30, 14, 7 and 1 day. Warranties use 60, 30, 14, 7 and 1 day. Configuration lives in `lib/reminder-engine.ts` and is passed to the database function explicitly.

`sync_system_reminders` derives the owner from `auth.uid()`. Its stable key is resource type + resource ID + date key + offset. Changing the source date updates the existing generated rows rather than creating duplicates. Removing an offset deletes only active system-generated rows for that exact source date; manual and completed reminders are preserved.

## Capture integration

A capture-derived reminder is created only after the user approves its proposal. The action endpoint validates the confirmed date/source, calls the central engine, marks the action completed and writes a content-free audit event. Record-creation proposals remain approved-but-unexecuted until their module adapters are implemented.

## Time and compatibility

Authoritative `due_at` and `source_due_at` values are timestamps. `time_zone` currently defaults to `Europe/London`, matching the deployed product; future profile time zones can override it without replacing the engine. Existing display groups and labels are retained for UI compatibility.

## Security

- Reminder RLS remains owner-only.
- The frontend cannot select another owner for generated rows.
- System schedules are bounded to 0–365 days and at most 12 offsets per call.
- The engine never deletes manual or completed reminders.
- Generated reminders are traceable to a rule and source without storing document contents.
