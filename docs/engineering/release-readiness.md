# DiaryDock release readiness

**Evidence date:** 4 September 2026
**Source branch:** `codex/diarydock-launch-readiness`
**Committed source revision:** the immutable Git commit containing this document;
record its full SHA with every deployment and evidence bundle.

## Current decision

The repository contains the production architecture and automated controls, but the current working tree is not yet a release candidate and the currently deployed service is not the completed application. A public-launch or external-assessment build must not be represented as ready until every external gate below has evidence tied to one immutable commit.

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

## Current local verification

The complete `npm run check` gate passed on 4 September 2026 for the current working tree:

- source-size policy: 1,593 files checked, zero exceptions;
- root, mobile and malware-scanner TypeScript checks: passed;
- lint: passed with zero reported warnings or errors;
- automated tests: 507 passed, zero failed;
- Next.js production build: 192 routes generated; and
- packaged mobile web bundle: 747 modules built with no preview-only bundle present.

Codex Security scan `766e4a15-266f-4350-8af9-26d431b28e56` completed against the
current source revision on 4 September 2026. Its two reportable request-resource
findings were remediated in the working tree: every API route now uses bounded
streaming request readers, and Pantry photo analysis enforces per-file, aggregate,
part-count, media-signature, provider-timeout and provider-output boundaries. The
complete gate above passed after the fixes and their bypass/regression review.

The current packaged bundle has also been synchronised successfully into both committed Capacitor projects. This verifies native project generation and plugin discovery, but not Android/iOS compilation, signing or physical-device behaviour.

This proves the checked working tree, not a deployable revision: it remains uncommitted. Native Gradle/Xcode execution also requires the Codemagic Java/macOS environments and is not covered by the local JavaScript gate.

## Verified external state

| Item | Evidence | Status |
|---|---|---|
| Vercel project | `diarydock` | Identified |
| Current production deployment | `dpl_CwjbTQ1AMVX2ogsmt72ufSSwvKBQ`, created 1 September 2026 | Older than the current working implementation |
| Production readiness route | `https://diarydock.com/api/health/ready` returned HTTP 404 on 4 September 2026 | Not deployed |
| Production variable names | Supabase, OpenAI, Resend/inbound email and account-deletion names are present | Hidden values not inspected |
| Critical production variable names | Sync cursor secret, scanner-required flag, scanner URL and scanner token are absent | Blocking |
| Production aliases | Four retired LifeDock domains remain attached | Must be intentionally removed before launch |
| Supabase migration history | Linked project identified, but the current CLI identity received HTTP 403 | Unverified |
| Malware scanner | Service and adapter exist in source | Production deployment, signatures, private ingress and alerting unverified |
| Telemetry | OpenTelemetry instrumentation exists in source | Exporter, dashboards, retention and paging unverified |
| Mobile release | Android and iOS workflows exist | Signing groups and successful physical-device/store builds unverified |
| GitHub verification | PR gate, dependency review, CodeQL and Dependabot are defined in source | First hosted runs and required branch-protection checks unverified |

The production environment also has no visible OTLP exporter variables. A provider integration may supply telemetry without those names, so dashboard and trace evidence—not an environment-name check—is required.

## Launch blockers

1. Convert the finished working tree into a reviewed, immutable commit, run `npm ci` plus `npm run check` from a clean checkout, and require the repository-verification, dependency-review and CodeQL checks in `main` branch protection.
2. Configure unique production values for `DIARYDOCK_SYNC_CURSOR_SECRET`, `DIARYDOCK_CAPTURE_SCANNER_REQUIRED=true`, `DIARYDOCK_MALWARE_SCANNER_URL`, `DIARYDOCK_MALWARE_SCANNER_TOKEN` and `CRON_SECRET`; configure a managed scheduler to call the bounded document-cleanup endpoint and retain successful retry evidence.
3. Deploy the scanner fleet with current ClamAV signatures, private authenticated ingress, two or more instances, readiness checks and alerts; prove a clean, infected and unavailable scan through the production application boundary.
4. Obtain privileged migration evidence, apply the reviewed append-only migration set in order, then run schema lint and cross-account/RLS verification against an isolated staging project before production.
5. Deploy the exact candidate commit through the production preflight and record its Vercel deployment ID and commit SHA. Confirm `/api/health/live` and `/api/health/ready` without exposing dependency details.
6. Remove the retired `thelifedock.com`, `www.thelifedock.com`, `thelifedock.co.uk` and `www.thelifedock.co.uk` aliases after confirming their intended redirect or retirement plan.
7. Prove database backups/PITR with a timed isolated restore, and record achieved RPO/RTO against the five-minute/60-minute targets.
8. Prove telemetry export, dashboards, alert delivery, on-call ownership, log retention and incident-response escalation.
9. Run the documented baseline, spike, degradation and soak workloads using synthetic accounts on an isolated production-like environment. Record latency, errors, pool saturation, query plans and cost.
10. Provision the iOS application and Share Extension with the same private App Group, then produce signed Android and iOS builds from the exact commit, retain provenance artifacts and pass share-import, offline, synchronisation and recovery smoke tests on a physical phone and tablet for each platform.
11. Enable GitHub secret scanning and push protection, then complete Vercel, Supabase, GitHub, Codemagic, DNS, OpenAI, Resend, Apple and Google access/MFA reviews and retain screenshots or exports with secrets redacted.

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
