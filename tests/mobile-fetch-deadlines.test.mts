import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import ts from "typescript";

import {
  boundedSupabaseFetch,
  SUPABASE_REQUEST_TIMEOUT_MS,
} from "../apps/mobile/src/platform/bounded-supabase-fetch.ts";
import {
  requestDeadline,
  requestSignal,
} from "../apps/mobile/src/platform/request-deadline.ts";

const mobileSource = fileURLToPath(new URL("../apps/mobile/src", import.meta.url));

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  }));
  return nested.flat();
}

function fetchesWithoutSignal(path: string, source: string) {
  const scriptKind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind);
  const missed: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && node.expression.text === "fetch") {
      const options = node.arguments[1];
      const hasSignal = options && ts.isObjectLiteralExpression(options)
        && options.properties.some((property) => property.name?.getText(file) === "signal");
      if (!hasSignal) {
        const location = file.getLineAndCharacterOfPosition(node.getStart(file));
        missed.push(`${path}:${location.line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return missed;
}

test("every packaged mobile fetch has an explicit bounded signal", async () => {
  const files = await sourceFiles(mobileSource);
  const sources = await Promise.all(files.map(async (path) => ({
    path,
    source: await readFile(path, "utf8"),
  })));
  const missed = sources.flatMap(({ path, source }) => fetchesWithoutSignal(path, source));
  assert.deepEqual(missed, []);
  assert.deepEqual(sources.filter(({ path, source }) => (
    !path.endsWith("request-deadline.ts") && source.includes("AbortSignal.timeout")
  )).map(({ path }) => path), []);
});

test("request deadlines preserve caller cancellation and enforce a timeout", async () => {
  const caller = new AbortController();
  const combined = requestSignal(caller.signal, 10_000);
  caller.abort();
  assert.equal(combined.aborted, true);

  const deadline = requestSignal(undefined, 1);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(deadline.aborted, true);
  assert.throws(() => requestDeadline(0), /invalid/i);
  assert.throws(() => requestDeadline(300_001), /invalid/i);
});

test("the Supabase transport has a finite deadline and preserves cancellation", async () => {
  assert.equal(SUPABASE_REQUEST_TIMEOUT_MS, 60_000);
  const caller = new AbortController();
  caller.abort(new Error("cancelled"));
  await assert.rejects(
    boundedSupabaseFetch("https://example.invalid", { signal: caller.signal }),
    /cancelled|abort/i,
  );

  const clientSource = await readFile(
    join(mobileSource, "auth", "supabase-client.ts"),
    "utf8",
  );
  assert.match(clientSource, /fetch:\s*boundedSupabaseFetch/);
});
