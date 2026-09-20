import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const root = resolve(import.meta.dirname, "../..");
const staging = parseEnv(await readFile(resolve(root, ".env.staging.local"), "utf8"));
const production = parseEnv(await readFile(resolve(root, ".env.local"), "utf8"));
const stagingUrl = staging.NEXT_PUBLIC_SUPABASE_URL;

if (!stagingUrl || !new URL(stagingUrl).hostname.endsWith(".supabase.co")
  || stagingUrl === production.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Refusing to build against a non-isolated Supabase project.");
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

const nextBin = resolve(root, "node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "build"], {
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

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
