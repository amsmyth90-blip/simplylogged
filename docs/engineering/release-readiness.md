# DiaryDock release readiness

**Evidence date:** 4 September 2026
**Source branch:** `main`
**Verified merge revision:** `d5298c2288f5ec82fc0e2d33fb884e7294076ec0`

## Current decision

The reviewed web and packaged-mobile implementation is merged into `main` and its hosted verification is green. The currently deployed production service is still the older application because the production preflight correctly rejected the merged revision while required scanner configuration was absent. A public-launch or external-assessment build must not be represented as ready until every remaining external gate below has evidence tied to one immutable commit.

## Repository controls

- `npm run check` is the mandatory source gate: source-size policy, all TypeScript projects, lint, automated tests and both production builds.
- Handwritten source is limited to 300 lines, with no exceptions accepted by the strict checker.
- `npm run build` now runs a production-environment preflight automatically when Vercel sets `VERCEL_ENV=production`.
- `npm run release:preflight` performs the same check explicitly without printing secret values.
- The preflight requires valid, separate Supabase public/server credentials, a strong mobile-sync cursor secret, mandatory malware scanning with an HTTPS endpoint and separate credential, separate account-deletion and scheduled-cleanup credentials, the OpenAI feature credential and an explicit inbound-email state.
- `/api/health/ready` checks both the production security configuration and a bounded live database query, returning only an aggregate ready/unavailable result.
- Mobile production builds independently reject missing or privileged Supabase client credentials, non-HTTPS backends and non-allowlisted production API hosts.
- Codemagic release workflows run the complete repository gate before native unit tests, lint, signing and package creation.
- GitHub pull requests run the complete repository gate, moderate-or-higher dependency review and extended CodeQL analysis for TypeScript/Java. Workflow dependencies are immutable-commit pinned and maintained by Dependabot.
- `main` requires current repository verification, dependency review and both CodeQL jobs before merge. Pull requests, current branches, resolved conversations and linear history are required; administrators are included and force-pushes and branch deletion are blocked.
- GitHub secret scanning, push protection and automatic Dependabot security updates are enabled. Enhanced non-provider and validity scanning are unavailable under the current repository settings.

## Current local verification

The complete `npm run check` gate passed again on 4 September 2026 from merged `main` at revision `d5298c2`:

- source-size policy: 1,593 files checked, zero exceptions;
- root, mobile and malware-scanner TypeScript checks: passed;
- lint: passed with zero reported warnings or errors;
- automated tests: 508 passed, zero failed;
- Next.js production build: 192 routes generated; and
- packaged mobile web bundle: 747 modules built with no preview-only bundle present.

Codex Security scan `766e4a15-266f-4350-8af9-26d431b28e56` completed against the
current source revision on 4 September 2026. Its two reportable request-resource
findings were remediated in the working tree: every API route now uses bounded
streaming request readers, and Pantry photo analysis enforces per-file, aggregate,
part-count, media-signature, provider-timeout and provider-output boundaries. The
complete gate above passed after the fixes and their bypass/regression review.

The packaged bundle has also been synchronised successfully into both committed Capacitor projects. This verifies native project generation and plugin discovery, but not Android/iOS compilation, signing or physical-device behaviour. Native Gradle/Xcode execution requires the Codemagic Java/macOS environments and is not covered by the local JavaScript gate.

## Verified hosted source state

Pull request 4 merged revision `d5298c2` into `main`. Repository verification, dependency review, JavaScript/TypeScript CodeQL and Java/Kotlin CodeQL all completed successfully against that change. The Vercel production build cloned the same revision and stopped at the production-environment preflight before compiling, so it did not replace the existing production deployment.

## Verified external state

| Item | Evidence | Status |
|---|---|---|
| Vercel project | `diarydock` | Identified |
| Current production deployment | `dpl_CwjbTQ1AMVX2ogsmt72ufSSwvKBQ`, created 1 September 2026 | Older than the current working implementation |
| Production readiness route | `https://diarydock.com/api/health/ready` returned HTTP 404 on 4 September 2026 | Not deployed |
| Production variable names | Supabase, OpenAI, Resend/inbound email and account-deletion names are present | Hidden values not inspected |
| No-cost production credentials | Unique hidden `DIARYDOCK_SYNC_CURSOR_SECRET` and `CRON_SECRET` values are configured | Complete |
| Scanner production variables | Scanner-required flag, scanner URL and scanner token are absent | Deferred; blocking production deployment |
| Production aliases | Four retired LifeDock domains remain attached | Must be intentionally removed before launch |
| Supabase migration history | Linked project identified, but the current CLI identity received HTTP 403 | Unverified |
| Malware scanner | Service and adapter exist in source | Production deployment, signatures, private ingress and alerting unverified |
| Telemetry | OpenTelemetry instrumentation exists in source | Exporter, dashboards, retention and paging unverified |
| Mobile release | Android and iOS workflows exist | Signing groups and successful physical-device/store builds unverified |
| GitHub verification | Repository gate, dependency review and both CodeQL jobs passed on pull request 4 | Complete for revision `d5298c2` |
| GitHub repository controls | Required checks, protected pull-request flow, secret scanning, push protection and automatic dependency security updates are enabled | Complete |

The production environment also has no visible OTLP exporter variables. A provider integration may supply telemetry without those names, so dashboard and trace evidence—not an environment-name check—is required.

## Launch blockers

1. Configure `DIARYDOCK_CAPTURE_SCANNER_REQUIRED=true`, `DIARYDOCK_MALWARE_SCANNER_URL` and `DIARYDOCK_MALWARE_SCANNER_TOKEN`. Deploy the scanner fleet with current ClamAV signatures, private authenticated ingress, two or more instances, readiness checks and alerts; prove a clean, infected and unavailable scan through the production application boundary.
2. Deploy the configured daily document-cleanup schedule with the next production candidate and retain successful and retry evidence.
3. Obtain privileged migration evidence, apply the reviewed append-only migration set in order, then run schema lint and cross-account/RLS verification against an isolated staging project before production.
4. Deploy the exact candidate commit through the production preflight and record its Vercel deployment ID and commit SHA. Confirm `/api/health/live` and `/api/health/ready` without exposing dependency details.
5. Remove the retired `thelifedock.com`, `www.thelifedock.com`, `thelifedock.co.uk` and `www.thelifedock.co.uk` aliases after confirming their intended redirect or retirement plan.
6. Prove database backups/PITR with a timed isolated restore, and record achieved RPO/RTO against the five-minute/60-minute targets.
7. Prove telemetry export, dashboards, alert delivery, on-call ownership, log retention and incident-response escalation.
8. Run the documented baseline, spike, degradation and soak workloads using synthetic accounts on an isolated production-like environment. Record latency, errors, pool saturation, query plans and cost.
9. Provision the iOS application and Share Extension with the same private App Group, then produce signed Android and iOS builds from the exact commit, retain provenance artifacts and pass share-import, offline, synchronisation and recovery smoke tests on a physical phone and tablet for each platform.
10. Complete Vercel, Supabase, GitHub, Codemagic, DNS, OpenAI, Resend, Apple and Google access/MFA reviews and retain screenshots or exports with secrets redacted.

## Release evidence record

For each candidate, retain:

- Git commit, signed tag, dependency lockfile and clean-checkout gate output;
- database migration list and schema/RLS verification result;
- Vercel deployment ID, production domains and environment-preflight result;
- scanner image digest, signature timestamp and availability test;
- load-test report, database/provider capacity settings and cost forecast;
- backup restore timestamps and measured RPO/RTO;
- trace/dashboard/alert screenshots and incident contact;
- Android AAB/APK and mapping file, iOS IPA and dSYM, store build numbers and CI URLs; and
- physical-device test record covering sign-in, encrypted offline access, queued changes, conflict handling, reconnection, file integrity and sign-out purge.

Secrets, real customer content and live access tokens must never be included in this evidence pack.

The explicit preflight reads variables already injected into its process. It must be run by the deployment system or CI secret store; do not export production secrets into a developer shell merely to run it locally.
