import assert from "node:assert/strict";
import test from "node:test";

import { ExternalResponseError, readBoundedJsonResponse } from "../lib/http/bounded-json-response.ts";
import { readBoundedSingleFile } from "../lib/http/bounded-single-file.ts";

test("bounded provider JSON counts streamed UTF-8 bytes and checks media type", async () => {
  const accepted = await readBoundedJsonResponse(new Response('{"ok":"✓"}', {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  }), 12);
  assert.deepEqual(accepted, { ok: "✓" });
  await assert.rejects(readBoundedJsonResponse(new Response('{"ok":true}', {
    headers: { "Content-Type": "text/plain" },
  }), 100), ExternalResponseError);
  await assert.rejects(readBoundedJsonResponse(new Response('{"value":"🔥"}', {
    headers: { "Content-Type": "application/json" },
  }), 12), /too large/);
});

test("single-file multipart accepts one bounded file and rejects extra parts", async () => {
  const form = new FormData();
  form.append("file", new File(["image"], "recipe.jpg", { type: "image/jpeg" }));
  const request = new Request("https://diarydock.test/scan", { method: "POST", body: form });
  const file = await readBoundedSingleFile(request, {
    fieldName: "file", maximumBytes: 10, maximumTransportBytes: 1_024,
  });
  assert.equal(new TextDecoder().decode(file.bytes), "image");
  assert.equal(file.mimeType, "image/jpeg");

  const extra = new FormData();
  extra.append("file", new File(["one"], "one.jpg", { type: "image/jpeg" }));
  extra.append("file", new File(["two"], "two.jpg", { type: "image/jpeg" }));
  await assert.rejects(readBoundedSingleFile(new Request("https://diarydock.test/scan", {
    method: "POST", body: extra,
  }), { fieldName: "file", maximumBytes: 10, maximumTransportBytes: 2_048 }), /too many parts/);
});
