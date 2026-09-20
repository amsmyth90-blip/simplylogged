# Scale and reliability verification

## Status

The repository now supplies measurable boundaries, OpenTelemetry traces, privacy-safe structured events, readiness/liveness endpoints and repeatable k6 workloads. These make scale testable; they do not by themselves prove one-million-user capacity. Production capacity is accepted only after the deployment candidate passes the gates below with the real provider plans, regions, pooler and telemetry export enabled.

## 50,000 active-device gate

The mobile client now performs one idle pull every four to six minutes, so 50,000 simultaneously active devices produce approximately 139-208 background pulls per second before foreground actions, retries and safety margin. The production acceptance profile is therefore:

- 750 authenticated sync pulls per second for at least 15 minutes;
- 50 authenticated sync pushes per second for at least 15 minutes;
- a 2,000-request pull burst with at least 100 distinct identities and no identity carrying concurrent requests;
- less than 1% failures, pull p95 below 750 ms/p99 below 1.5 s, and push p95 below 1 s/p99 below 2 s; and
- no database connection saturation, sustained lock queue, missing revision, cross-account row or unbounded cost growth.

The gate requires `DIARYDOCK_DISTRIBUTED_RATE_LIMIT_REQUIRED=true` with a colocated Upstash Redis REST endpoint. Set `DIARYDOCK_RATE_LIMIT_NAMESPACE=staging` for the isolated load target and `production` for the live deployment, even when both environments reuse one Redis database. PostgreSQL rate-limit buckets remain a local/baseline fallback and are not accepted for the 50,000-device profile.

Two isolated-staging runs on 19 September 2026 established the current baseline:

- With the PostgreSQL fallback limiter, steady 40 pull/s and mixed 25 pull/s + 5 push/s had zero failures, but the 100-worker burst failed with 27 timeouts out of 2,000 requests.
- After enabling the Redis limiter in its isolated `staging` namespace, all 4,500 measured requests succeeded. Pull p95 was 96.1 ms at 40/s, mixed pull/push p95 was 107.7/163.9 ms, and the 100-worker burst completed 2,000 pulls at 291.1 requests/s with p95 564.8 ms and p99 1,279.1 ms.

The passing bounded run used 26 identities and a local application process connected to the isolated staging Supabase and Redis services. The corresponding protected Vercel Preview, deployment `dpl_69J6xqHTLVsJ3FYZDRZuyqD4a7wB`, passed configuration, database and distributed-limiter readiness. This is evidence that the limiter change removes the observed burst failure; it is not the 50,000-device acceptance result because it did not sustain 750 pulls/s plus 50 pushes/s for 15 minutes, use 100 identities, exercise Vercel's function fleet, or include the soak, degradation and restoration gates.

The current staging Redis free tier allows 500,000 commands per month. It is suitable for bounded verification, not sustained production traffic or the full acceptance run: even one limiter command per request would consume that allowance during the 765,000-request 15-minute acceptance profile. Upgrade and capacity-test the production Redis plan before enabling this architecture for 50,000 active devices.

## Capacity model

Maintain these inputs for every release forecast:

- registered accounts and active devices;
- daily and monthly active accounts;
- peak concurrent sessions and synchronising devices;
- average and p95 documents, reminders and bytes per account;
- captures, uploads, AI jobs and inbound messages per second;
- expected read/write amplification, retention and regional distribution; and
- dependency quotas for Vercel, Supabase, OpenAI, Resend and the scanner fleet.

The 100,000-user gate must model at least 10,000 daily-active accounts and the one-million-user gate at least 100,000 daily-active accounts, then replace those planning assumptions with observed product data. Test arrival rates come from measured peak journey frequency, multiplied by a 2× burst margin. A registered-user count is never converted directly into requests per second without an activity model.

## Initial service objectives

| Journey | Availability | Latency target | Correctness/durability |
|---|---:|---:|---|
| Web/API liveness | 99.95% monthly | p95 250 ms | correct deployment answers |
| Mobile sync pull | 99.9% monthly | p95 750 ms, p99 1.5 s | no skipped revision or invalid cursor |
| Mobile sync push | 99.9% monthly | p95 1 s, p99 2 s | no acknowledged mutation loss; idempotent replay |
| Upload reservation/commit | 99.9% monthly | p95 1.5 s excluding bytes | no quota bypass or unscanned promotion |
| Household access changes | 99.9% monthly | p95 1 s | immediate server-side revocation |

Backup objectives are a maximum five-minute database RPO and a 60-minute service RTO. They are targets until provider configuration, restore timings and an isolated restoration exercise prove them.

## Telemetry contract

Next.js registers `@vercel/otel` as `diarydock-web`. Vercel's tracing integration or standard OTLP environment variables select the exporter. Production uses parent-based 5% trace sampling; error events are always emitted. Critical request observations add bounded route, operation, outcome, status-class, duration and record-count attributes. They intentionally exclude URLs, query strings, user IDs, emails, tokens, filenames, questions, bodies and payloads.

Every observed response returns an `X-Request-Id` and `Server-Timing`. A valid caller correlation ID is preserved; otherwise the server creates one. Structured events are single-line JSON and carry the active OpenTelemetry trace/span identifiers when available.

Required alerts:

- fast and slow error-budget burn for each critical journey;
- five-minute 5xx rate above 2% or p95 latency above its objective;
- readiness failure or missing telemetry from an active region;
- synchronisation conflict/failure growth and oldest outbox age;
- upload quarantine age, scanner unavailability and queue backlog;
- database connection saturation, lock time and replica lag; and
- backup failure or missed scheduled cleanup.

## Test gates

Run only against an isolated environment containing generated accounts and synthetic files.

1. Functional and cross-account/RLS suites pass at the exact candidate revision.
2. `tools/load/health.js` runs for two minutes, then 30 minutes, without breaching its thresholds.
3. `tools/load/sync-pull.js` uses a token pool of dedicated test accounts. Its guard prevents defeating the real per-account rate limit with a single identity.
4. `tools/load/sync-push.js` creates and removes synthetic reminders in one versioned batch. It verifies authoritative results and correlation while keeping each identity below the real sync-write limit.
5. Run baseline, 2× spike and two-hour soak profiles at forecast peak arrival rates.
6. Repeat while the scanner, AI provider and one database connection path are degraded.
7. Verify idempotent replay, queue recovery, no missing revisions and no cross-account records.
8. Restore a fresh database and object-store environment from backup; record measured RPO/RTO.
9. Review traces, query plans, pool saturation and cost per 1,000 journeys before accepting capacity.
10. For the 50,000-device profile, prove that the distributed limiter is active and repeat the dedicated gate above with at least 100 non-concurrent identities.

`k6 run tools/load/health.js` needs `DIARYDOCK_LOAD_ORIGIN`. Both sync workloads additionally need comma-separated short-lived `DIARYDOCK_LOAD_ACCESS_TOKENS`. Tokens must be supplied by the CI secret store, never committed or printed. Sync-push testing must use disposable accounts in an isolated environment because it intentionally exercises database writes and leaves bounded idempotency records for retention cleanup.
