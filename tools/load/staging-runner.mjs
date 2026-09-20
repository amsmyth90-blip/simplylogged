import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

const root = resolve(import.meta.dirname, "../..");
const usersPath = resolve(root, ".env.staging.load-users.local.json");
const fixture = JSON.parse(await readFile(usersPath, "utf8"));
const origin = String(process.env.DIARYDOCK_LOAD_ORIGIN ?? process.argv[2] ?? "").replace(/\/$/, "");
const originUrl = new URL(origin);
if (!origin || originUrl.hostname === "diarydock.com" || originUrl.hostname === "www.diarydock.com") {
  throw new Error("Provide an isolated preview or local DIARYDOCK_LOAD_ORIGIN; production is refused.");
}
// The full workload issues 4,270 pulls in under five minutes. Rotating them
// across 26 users keeps every identity below the API's 180-pull/5-minute cap.
if (fixture.purpose !== "diarydock-load-test" || !Array.isArray(fixture.users) || fixture.users.length < 26) {
  throw new Error("At least 26 recognised synthetic staging users are required for the full workload.");
}

const tokens = fixture.users.map((user) => user.accessToken);

function percentile(sorted, value) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] ?? 0;
}

function summarise(name, rate, durationSeconds, samples) {
  const durations = samples.map((sample) => sample.duration).sort((a, b) => a - b);
  const failed = samples.filter((sample) => !sample.ok).length;
  const statuses = Object.fromEntries(Object.entries(samples.reduce((all, sample) => {
    const key = String(sample.status ?? "network");
    all[key] = (all[key] ?? 0) + 1;
    return all;
  }, {})).sort(([a], [b]) => a.localeCompare(b)));
  return {
    name,
    requestedRate: rate,
    durationSeconds,
    requests: samples.length,
    achievedRps: Number((samples.length / durationSeconds).toFixed(1)),
    failed,
    failureRate: Number((failed / Math.max(1, samples.length)).toFixed(4)),
    p50Ms: Number(percentile(durations, 0.5).toFixed(1)),
    p95Ms: Number(percentile(durations, 0.95).toFixed(1)),
    p99Ms: Number(percentile(durations, 0.99).toFixed(1)),
    maxMs: Number((durations.at(-1) ?? 0).toFixed(1)),
    statuses,
  };
}

async function measuredFetch(url, init, validate) {
  const started = performance.now();
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    const text = await response.text();
    let valid = response.ok;
    if (validate) valid = valid && validate(response, text);
    return { duration: performance.now() - started, ok: valid, status: response.status };
  } catch {
    return { duration: performance.now() - started, ok: false, status: null };
  }
}

function pullRequest(index) {
  return measuredFetch(`${origin}/api/sync/pull`, {
    headers: {
      Authorization: `Bearer ${tokens[index % tokens.length]}`,
      "User-Agent": "DiaryDock-staging-load-verifier/1",
    },
  }, (response, text) => text.length < 524_288 && Boolean(response.headers.get("x-request-id")));
}

function pushRequest(index) {
  const recordId = randomUUID();
  const createKey = randomUUID();
  const deleteKey = randomUUID();
  const batchId = randomUUID();
  const body = {
    apiVersion: "2026-09-01",
    deviceId: randomUUID(),
    batchId,
    mutations: [
      {
        idempotencyKey: createKey,
        recordId,
        entityType: "reminder",
        operation: "UPSERT",
        expectedRevision: null,
        schemaVersion: 1,
        payload: {
          title: "Synthetic scale verification",
          group: "today",
          timeLabel: "Today",
          priority: "normal",
          origin: "USER_CREATED",
          reminderType: "custom",
          timeZone: "Europe/London",
        },
      },
      {
        idempotencyKey: deleteKey,
        recordId,
        entityType: "reminder",
        operation: "DELETE",
        expectedRevision: "1",
        schemaVersion: 1,
        payload: {},
      },
    ],
  };
  return measuredFetch(`${origin}/api/sync/push`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${tokens[index % tokens.length]}`,
      "Content-Type": "application/json",
      "User-Agent": "DiaryDock-staging-load-verifier/1",
    },
    body: JSON.stringify(body),
  }, (response, text) => {
    if (!response.headers.get("x-request-id")) return false;
    try {
      const result = JSON.parse(text);
      return result.batchId === batchId
        && result.results?.[0]?.idempotencyKey === createKey
        && result.results?.[0]?.status === "APPLIED"
        && result.results?.[1]?.idempotencyKey === deleteKey
        && result.results?.[1]?.status === "APPLIED";
    } catch {
      return false;
    }
  });
}

async function arrivalStage(name, rate, durationSeconds, request) {
  const started = performance.now();
  const durationMs = durationSeconds * 1000;
  const pending = [];
  let scheduled = 0;
  while (performance.now() - started < durationMs) {
    const due = Math.min(Math.floor(((performance.now() - started) / 1000) * rate), rate * durationSeconds);
    while (scheduled < due) pending.push(request(scheduled++));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));
  }
  while (scheduled < rate * durationSeconds) pending.push(request(scheduled++));
  const samples = await Promise.all(pending);
  return summarise(name, rate, durationSeconds, samples);
}

async function burstStage(concurrency, total) {
  const samples = new Array(total);
  let cursor = 0;
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < total) {
      const index = cursor++;
      samples[index] = await pullRequest(index);
    }
  }));
  const elapsed = (performance.now() - started) / 1000;
  return summarise(`pull-burst-${concurrency}`, Number((total / elapsed).toFixed(1)), elapsed, samples);
}

const results = [];
await arrivalStage("warmup-pull", 2, 10, pullRequest);
results.push(await arrivalStage("pull-10rps", 10, 20, pullRequest));
results.push(await arrivalStage("pull-25rps", 25, 20, pullRequest));
results.push(await arrivalStage("pull-40rps", 40, 20, pullRequest));
results.push(await arrivalStage("push-5rps", 5, 20, pushRequest));
const [mixedPull, mixedPush] = await Promise.all([
  arrivalStage("mixed-pull-25rps", 25, 30, pullRequest),
  arrivalStage("mixed-push-5rps", 5, 30, pushRequest),
]);
results.push(mixedPull, mixedPush);
results.push(await burstStage(100, 2_000));

for (const result of results) console.log(JSON.stringify(result));
const failed = results.filter((result) => result.failureRate >= 0.01
  || (result.name.includes("pull") && (result.p95Ms >= 750 || result.p99Ms >= 1500))
  || (result.name.includes("push") && (result.p95Ms >= 1000 || result.p99Ms >= 2000)));
console.log(JSON.stringify({ passed: failed.length === 0, failedStages: failed.map((result) => result.name) }));
if (failed.length) process.exitCode = 1;
