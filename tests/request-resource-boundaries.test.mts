import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { RequestBodyError } from "../lib/http/bounded-body.ts";
import { readBoundedMultiFile } from "../lib/http/bounded-multi-file.ts";
import { parsePantryAnalysis } from "../lib/pantry-analysis.ts";

const routeRoot = new URL("../app/api/", import.meta.url);

function formRequest(files: Array<{ bytes: Uint8Array; field?: string; name: string }>) {
  const form = new FormData();
  for (const file of files) {
    form.append(file.field ?? "files", new File([file.bytes], file.name, { type: "image/png" }));
  }
  return new Request("https://diarydock.test/upload", { method: "POST", body: form });
}

const options = {
  fieldName: "files",
  maximumFileBytes: 4,
  maximumFiles: 2,
  maximumTotalBytes: 6,
  maximumTransportBytes: 1_024,
};

test("bounded multipart accepts an ordinary multi-photo request", async () => {
  const files = await readBoundedMultiFile(formRequest([
    { bytes: new Uint8Array([1, 2, 3]), name: "one.png" },
    { bytes: new Uint8Array([4, 5, 6]), name: "two.png" },
  ]), options);
  assert.deepEqual(files.map((file) => [file.name, file.bytes.byteLength]), [
    ["one.png", 3],
    ["two.png", 3],
  ]);
});

test("bounded multipart rejects aggregate, count and field-name bypasses", async () => {
  await assert.rejects(readBoundedMultiFile(formRequest([
    { bytes: new Uint8Array(4), name: "one.png" },
    { bytes: new Uint8Array(3), name: "two.png" },
  ]), options), (error: unknown) => error instanceof RequestBodyError && error.status === 413);
  await assert.rejects(readBoundedMultiFile(formRequest([
    { bytes: new Uint8Array(1), name: "one.png" },
    { bytes: new Uint8Array(1), name: "two.png" },
  ]), { ...options, maximumFiles: 1 }),
  (error: unknown) => error instanceof RequestBodyError && error.status === 413);
  await assert.rejects(readBoundedMultiFile(formRequest([
    { bytes: new Uint8Array(1), field: "other", name: "one.png" },
  ]), options), (error: unknown) => error instanceof RequestBodyError && error.status === 400);
});

test("bounded multipart counts chunked transport bytes without trusting length", async () => {
  const original = formRequest([{ bytes: new Uint8Array([1]), name: "one.png" }]);
  const mediaType = original.headers.get("content-type") ?? "";
  const encoded = new Uint8Array(await original.arrayBuffer());
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoded.slice(0, 8));
      controller.enqueue(encoded.slice(8));
      controller.close();
    },
  });
  const request = new Request("https://diarydock.test/upload", {
    method: "POST",
    headers: { "Content-Type": mediaType },
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  await assert.rejects(readBoundedMultiFile(request, {
    ...options,
    maximumTransportBytes: encoded.byteLength - 1,
  }), (error: unknown) => error instanceof RequestBodyError && error.status === 413);
});

const validAnalysis = {
  ingredients: [{ name: "Carrot", category: "Vegetables", confidence: 0.9 }],
  mealSuggestions: Array.from({ length: 4 }, (_, index) => ({
    name: `Meal ${index + 1}`,
    summary: "A practical meal",
    cookTime: "30 minutes",
    availableIngredients: ["Carrot"],
    missingIngredients: ["Onion"],
  })),
  summary: "Four meals found",
};

test("pantry provider output is exact and bounded at runtime", () => {
  assert.equal(parsePantryAnalysis(validAnalysis).mealSuggestions.length, 4);
  assert.throws(() => parsePantryAnalysis({ ...validAnalysis, privateData: "unexpected" }));
  assert.throws(() => parsePantryAnalysis({ ...validAnalysis, summary: "x".repeat(1_001) }));
  assert.throws(() => parsePantryAnalysis({ ...validAnalysis, mealSuggestions: [] }));
});

async function routeFiles(url: URL): Promise<URL[]> {
  const entries = await readdir(url, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, url);
    if (entry.isDirectory()) return routeFiles(target);
    return entry.name === "route.ts" ? [target] : [];
  }));
  return nested.flat();
}

test("API routes never use unbounded framework body materializers", async () => {
  const routes = await routeFiles(routeRoot);
  const sources = await Promise.all(routes.map((route) => readFile(route, "utf8")));
  assert.equal(sources.some((source) => /request\.(?:json|formData)\s*\(/.test(source)), false);
  const pantry = await readFile(new URL("../app/api/kitchen/analyse/route.ts", import.meta.url), "utf8");
  const pantryRequest = await readFile(
    new URL("../lib/kitchen/pantry-analysis-request.ts", import.meta.url), "utf8",
  );
  assert.match(pantry, /analysePantryRequest/);
  assert.match(pantryRequest, /readBoundedMultiFile/);
  assert.match(pantryRequest, /inspectCaptureFile/);
  assert.match(pantryRequest, /AbortSignal\.timeout\(45_000\)/);
  assert.doesNotMatch(`${pantry}\n${pantryRequest}`, /error\.message/);
});
