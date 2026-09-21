# DiaryDock private-beta runbook

**Prepared:** 21 September 2026

**Scale baseline:** `8b81d6c`

**Dependency-security baseline:** `fb10582`

This runbook is for a no-cost or low-cost private beta. It does not certify the
50,000-active-device target. That certification remains a later, paid capacity
exercise against production-sized provider plans.

## Entry gate

Use one immutable candidate commit. Do not admit testers until all of these are
recorded for that commit:

- `npm run check` passes from a clean checkout;
- `npm audit --omit=dev` reports zero production vulnerabilities;
- every intended database migration has been applied to the isolated beta
  project and the cross-account/RLS tests pass;
- `/api/health/live` returns HTTP 200 and `/api/health/ready` returns HTTP 200
  with configuration, database and distributed-rate-limit checks all true;
- the Redis namespace is `staging` or `beta`, never `production`;
- one database backup exists and an operator knows how to disable the beta
  deployment without deleting data;
- test accounts contain synthetic or tester-owned data only; and
- the release owner has a written rollback decision and a way to contact every
  tester.

Do not copy production secrets into a developer shell or evidence file. Store
only deployment IDs, commit hashes, timestamps and redacted results.

## Cohort sequence

Keep sign-up invite-only and increase one stage at a time:

| Stage | Accounts | Minimum observation | Advance when |
|---|---:|---:|---|
| Internal smoke | 2-5 | 24 hours | Core journeys pass and no data-boundary failure occurs |
| Trusted testers | 10-20 | 3 days | No blocker; readiness stays healthy; error and latency gates pass |
| Private beta | 25-50 | 7 days | No unresolved high-severity issue; sync and recovery remain healthy |
| Expanded beta | 100-250 | 14 days | Usage and cost measurements support the next provider tier |

Do not automatically advance because the observation period elapsed. Review the
evidence and make an explicit go/no-go decision at each stage.

## Smoke journeys

Test on web and at least one physical mobile device:

1. Create an account, confirm email, sign in and sign out.
2. Complete onboarding and reload the application.
3. Create, edit, synchronise and delete a non-sensitive record.
4. Upload a supported file and confirm scanning, viewing and deletion.
5. Go offline, create one change, reconnect and confirm one authoritative copy.
6. Sign into a second test account and prove the first account's records and
   files cannot be retrieved.
7. Trigger a harmless conflict and verify both resolution choices.
8. Request account deletion using a disposable test account.

## Operating gates

Review these at least daily during the beta:

- readiness success and deployment availability;
- API 5xx rate, sync pull/push failure rate and p95 latency;
- database connections, slow queries, lock waits and storage growth;
- Redis command usage and rate-limit denials;
- oldest mobile outbox item and sync conflict growth;
- scanner failures, quarantined uploads and cleanup backlog; and
- cost and quota use for Vercel, Supabase, Redis, OpenAI, Resend and storage.

For the private-beta cohort, pause new invitations when any critical journey has
more than 1% failures over 15 minutes, sync pull p95 exceeds 750 ms, sync push
p95 exceeds 1 second, or a provider reaches 70% of its monthly free allowance.

## Immediate rollback triggers

Disable new traffic or revert the deployment immediately for:

- suspected cross-account data access or ownership confusion;
- acknowledged data loss, skipped sync revisions or corrupt offline state;
- authentication bypass, leaked credential or public privileged endpoint;
- scanner bypass for an uploaded file;
- sustained readiness failure or 5xx rate above 5% for five minutes; or
- uncontrolled provider usage or cost.

Preserve logs and deployment evidence, rotate affected credentials, and do not
resume until the cause and recovery path are verified. Never delete the beta
database as the first response to an incident.

## Exit criteria

The private beta is complete when the 25-50 person cohort has run for at least
seven days with no unresolved blocker, the operating gates remain within their
targets, backup and rollback steps have been exercised, and real usage supplies
an evidence-based peak-traffic and cost forecast.

The next step is gradual expansion, not a claim of 50,000-user certification.
Before that claim, run the full acceptance profile in
`docs/engineering/scale-verification.md` on provider plans sized for the test.
