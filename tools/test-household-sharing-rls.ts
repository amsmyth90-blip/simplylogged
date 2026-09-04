// @ts-nocheck
import { randomUUID } from "node:crypto";

import { assertDisposableRlsTarget } from "./household-sharing-rls-safety.ts";
import { runRlsAccessChecks } from "./household-sharing-rls-access.ts";
import {
  cleanupRlsRun,
  must,
  parseEnv,
  readLinkedProjectRef,
  rlsClient
} from "./household-sharing-rls-fixtures.ts";
import { runRlsMutationChecks } from "./household-sharing-rls-mutations.ts";
import { runRlsRemovalChecks } from "./household-sharing-rls-removal.ts";
import { setupRlsScenario } from "./household-sharing-rls-setup.ts";

async function main() {
  const url = must(
    process.env.DIARYDOCK_RLS_SUPABASE_URL,
    "DIARYDOCK_RLS_SUPABASE_URL"
  );
  const anonKey = must(
    process.env.DIARYDOCK_RLS_SUPABASE_ANON_KEY,
    "DIARYDOCK_RLS_SUPABASE_ANON_KEY"
  );
  const serviceKey = must(
    process.env.DIARYDOCK_RLS_SUPABASE_SERVICE_ROLE_KEY,
    "DIARYDOCK_RLS_SUPABASE_SERVICE_ROLE_KEY"
  );
  const localEnv = parseEnv(".env.local");
  const target = assertDisposableRlsTarget({
    testUrl: url,
    confirmation: process.env.DIARYDOCK_RLS_TEST_CONFIRM,
    linkedUrl: localEnv.NEXT_PUBLIC_SUPABASE_URL,
    linkedProjectRef: readLinkedProjectRef(),
    allowLinkedProject: process.env.DIARYDOCK_RLS_ALLOW_LINKED_PROJECT === "true"
  });
  const admin = rlsClient(url, serviceKey);
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const checks = [];
  const actors = [];
  const documents = [];
  const storagePaths: string[] = [];
  let setupError: string | null = null;

  try {
    const scenario = await setupRlsScenario({
      admin,
      anonKey,
      url,
      runId,
      checks,
      actors,
      documents,
      storagePaths
    });
    await runRlsAccessChecks(scenario);
    await runRlsMutationChecks(scenario);
    await runRlsRemovalChecks(scenario);
  } catch (error) {
    setupError = error instanceof Error ? error.message : String(error);
  }

  const cleanupWarnings = await cleanupRlsRun(
    admin,
    actors.map((actor) => actor.userId),
    documents.map((document) => document.id),
    storagePaths
  );
  const failedChecks = checks.filter((check) => !check.passed);
  const ok = !setupError && failedChecks.length === 0 && cleanupWarnings.length === 0;
  console.log(
    JSON.stringify(
      {
        ok,
        target: target.isLocal ? "local disposable Supabase" : "disposable Supabase project",
        runId,
        checksPassed: checks.length - failedChecks.length,
        checksRun: checks.length,
        failedChecks,
        setupError,
        cleanupWarnings
      },
      null,
      2
    )
  );
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2)
  );
  process.exitCode = 1;
});
