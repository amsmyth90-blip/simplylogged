import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const root = resolve(import.meta.dirname, "../..");
const stagingPath = resolve(root, ".env.staging.local");
const productionPath = resolve(root, ".env.local");
const staging = parseEnv(await readFile(stagingPath, "utf8"));
const production = parseEnv(await readFile(productionPath, "utf8"));
const stagingUrl = staging.NEXT_PUBLIC_SUPABASE_URL;

if (!stagingUrl || !new URL(stagingUrl).hostname.endsWith(".supabase.co")
  || stagingUrl === production.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Refusing to start against a non-isolated Supabase project.");
}
const redisUrlConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL);
const redisTokenConfigured = Boolean(process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN);
if (!redisUrlConfigured || !redisTokenConfigured) {
  throw new Error(`Refusing to start without the isolated Preview Redis configuration (${JSON.stringify({
    redisTokenConfigured,
    redisUrlConfigured,
  })}).`);
}

const requiredStagingKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DIARYDOCK_SYNC_CURSOR_SECRET",
];
for (const key of requiredStagingKeys) {
  if (!staging[key]) throw new Error(`Staging configuration is missing ${key}.`);
}

const port = process.argv[2] ?? "3017";
const nextBin = resolve(root, "node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
  cwd: root,
  env: {
    ...process.env,
    ...Object.fromEntries(requiredStagingKeys.map((key) => [key, staging[key]])),
    DIARYDOCK_CAPTURE_SCANNER_REQUIRED: "false",
    DIARYDOCK_DISTRIBUTED_RATE_LIMIT_REQUIRED: "true",
    DIARYDOCK_RATE_LIMIT_NAMESPACE: "staging",
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
