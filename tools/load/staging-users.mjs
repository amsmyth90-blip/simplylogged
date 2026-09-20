import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const root = resolve(import.meta.dirname, "../..");
const stagingEnvPath = resolve(root, ".env.staging.local");
const productionEnvPath = resolve(root, ".env.local");
const usersPath = resolve(root, ".env.staging.load-users.local.json");
const purpose = "diarydock-load-test";

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match) return [];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[match[1], value]];
  }));
}

async function loadConfig() {
  const staging = parseEnv(await readFile(stagingEnvPath, "utf8"));
  const production = parseEnv(await readFile(productionEnvPath, "utf8"));
  const url = staging.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = staging.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? staging.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = staging.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey || !serviceKey) throw new Error("Staging Supabase credentials are incomplete.");
  const host = new URL(url).hostname;
  if (!host.endsWith(".supabase.co") || url === production.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Refusing to provision users outside the isolated staging project.");
  }
  return { publicKey, serviceKey, url };
}

function clients(config) {
  const auth = { autoRefreshToken: false, persistSession: false };
  return {
    admin: createClient(config.url, config.serviceKey, { auth }),
    publicClient: createClient(config.url, config.publicKey, { auth }),
  };
}

async function mapLimited(items, concurrency, task) {
  const results = new Array(items.length);
  const errors = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await task(items[index], index);
      } catch (error) {
        errors.push(error);
      }
    }
  }));
  if (errors.length) throw errors[0];
  return results;
}

async function signInWithRetry(publicClient, email, password) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const result = await publicClient.auth.signInWithPassword({ email, password });
    if (!result.error && result.data.session?.access_token) return result.data.session.access_token;
    if (result.error?.status !== 429 || attempt === 9) {
      throw result.error ?? new Error("Synthetic user session was not created.");
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000 * (attempt + 1)));
  }
  throw new Error("Synthetic user session was not created.");
}

async function provision(count) {
  if (!Number.isInteger(count) || count < 4 || count > 200) {
    throw new Error("Synthetic user count must be between 4 and 200.");
  }
  const config = await loadConfig();
  const { admin, publicClient } = clients(config);
  const runId = `${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const password = `Dd1!${randomUUID()}`;
  const created = [];
  try {
    const users = await mapLimited(Array.from({ length: count }), 4, async (_, index) => {
      const email = `load-${runId}-${String(index).padStart(3, "0")}@example.test`;
      const result = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { purpose, run_id: runId, ordinal: index },
      });
      if (result.error || !result.data.user) throw result.error ?? new Error("Synthetic user was not created.");
      created.push(result.data.user.id);
      const accessToken = await signInWithRetry(publicClient, email, password);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
      return { accessToken, userId: result.data.user.id };
    });
    await writeFile(usersPath, `${JSON.stringify({ projectUrl: config.url, purpose, runId, users }, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    console.log(JSON.stringify({ count: users.length, runId, usersPath }));
  } catch (error) {
    await Promise.allSettled(created.map((id) => admin.auth.admin.deleteUser(id)));
    throw error;
  }
}

async function cleanup() {
  const config = await loadConfig();
  const { admin } = clients(config);
  const fixture = JSON.parse(await readFile(usersPath, "utf8"));
  if (fixture.projectUrl !== config.url || fixture.purpose !== purpose || !Array.isArray(fixture.users)) {
    throw new Error("Refusing to clean up an unrecognised load-test fixture.");
  }
  const settled = await Promise.allSettled(fixture.users.map(({ userId }) => admin.auth.admin.deleteUser(userId)));
  const failures = settled.filter((result) => result.status === "rejected").length;
  if (failures) throw new Error(`Failed to remove ${failures} synthetic users.`);
  await rm(usersPath, { force: true });
  console.log(JSON.stringify({ removed: fixture.users.length, runId: fixture.runId }));
}

const [command = "", countValue = "80"] = process.argv.slice(2);
if (command === "provision") await provision(Number(countValue));
else if (command === "cleanup") await cleanup();
else throw new Error("Use: node tools/load/staging-users.mjs provision [count] | cleanup");
