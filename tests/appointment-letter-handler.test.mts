import assert from "node:assert/strict";
import test from "node:test";
import { handleAppointmentLetter } from "../lib/appointments/letter-handler.ts";
import { APPOINTMENT_LETTER_CONSENT } from "../lib/appointments/letter-consent.ts";
import { readAppointmentLetter, type AppointmentConnection } from "../lib/appointments/client.ts";
import { emptyAppointment } from "../lib/appointments/model.ts";

const analysis = { ...emptyAppointment, title: "Example visit", date: "2030-09-18", time: "10:30", reviewReasons: [] };
const fixture = () => new File([new Uint8Array([137, 80, 78, 71])], "fictional-letter.png", { type: "image/png" });
function request(change?: (form: FormData) => void) {
  const form = new FormData();
  form.set("file", fixture()); form.set("consent", APPOINTMENT_LETTER_CONSENT);
  change?.(form);
  return new Request("https://example.test/api/appointments/letter", { method: "POST", body: form });
}

function harness() {
  const calls: string[] = [];
  const dependencies: Parameters<typeof handleAppointmentLetter>[1] = {
    authenticate: async () => { calls.push("authenticate"); return null; },
    configured: () => true,
    secure: async (files) => { calls.push("scan"); return { ok: true,
      files: [{ bytes: new Uint8Array(await files[0]!.arrayBuffer()), mimeType: files[0]!.type }] }; },
    extract: async () => { calls.push("extract"); return analysis; },
    respond: (body, status = 200) => Response.json(body, { status }),
  };
  return { dependencies, calls };
}

test("authentication and rate-limit denial stop before reading the request", async () => {
  for (const status of [401, 429]) {
    const { dependencies, calls } = harness();
    dependencies.authenticate = async () => new Response(null, { status });
    const input = request();
    assert.equal((await handleAppointmentLetter(input, dependencies)).status, status);
    assert.equal(input.bodyUsed, false);
    assert.deepEqual(calls, []);
  }
});

test("missing configuration stops before accepting the letter", async () => {
  const { dependencies, calls } = harness();
  dependencies.configured = () => false;
  const input = request();
  assert.equal((await handleAppointmentLetter(input, dependencies)).status, 503);
  assert.equal(input.bodyUsed, false);
  assert.deepEqual(calls, ["authenticate"]);
});

test("absent, wrong or duplicated consent never reaches the scanner or AI provider", async () => {
  for (const change of [
    (form: FormData) => form.delete("consent"),
    (form: FormData) => form.set("consent", "true"),
    (form: FormData) => form.append("consent", APPOINTMENT_LETTER_CONSENT),
  ]) {
    const { dependencies, calls } = harness();
    assert.equal((await handleAppointmentLetter(request(change), dependencies)).status, 400);
    assert.deepEqual(calls, ["authenticate"]);
  }
});

test("extra files, hidden fields, empty and oversized files are rejected before scanning", async () => {
  for (const change of [
    (form: FormData) => form.append("file", fixture()),
    (form: FormData) => form.append("other", "unexpected"),
    (form: FormData) => form.set("file", new File([], "empty.pdf", { type: "application/pdf" })),
    (form: FormData) => form.set("file", new File(["text"], "letter.txt", { type: "text/plain" })),
    (form: FormData) => form.set("file", new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" })),
  ]) {
    const { dependencies, calls } = harness();
    assert.equal((await handleAppointmentLetter(request(change), dependencies)).status, 400);
    assert.deepEqual(calls, ["authenticate"]);
  }
});

test("wrong media type and dishonest oversized body never reach a provider", async () => {
  const { dependencies, calls } = harness();
  const json = new Request("https://example.test", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
  assert.equal((await handleAppointmentLetter(json, dependencies)).status, 415);
  const huge = new Request("https://example.test", { method: "POST", body: new Uint8Array(5 * 1024 * 1024),
    headers: { "Content-Type": "multipart/form-data; boundary=test", "Content-Length": "1" } });
  assert.equal((await handleAppointmentLetter(huge, dependencies)).status, 413);
  assert.deepEqual(calls, ["authenticate", "authenticate"]);
});

test("blocked or unavailable security scan prevents extraction", async () => {
  for (const status of [422, 503]) {
    const { dependencies, calls } = harness();
    dependencies.secure = async () => { calls.push("scan"); return { ok: false, error: "Security check failed.", status }; };
    assert.equal((await handleAppointmentLetter(request(), dependencies)).status, status);
    assert.deepEqual(calls, ["authenticate", "scan"]);
  }
});

test("consented, scanned letters return only the extraction response", async () => {
  const { dependencies, calls } = harness();
  const response = await handleAppointmentLetter(request(), dependencies);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { analysis });
  assert.deepEqual(calls, ["authenticate", "scan", "extract"]);
});

test("provider failures do not disclose raw errors or letter contents", async () => {
  const { dependencies } = harness();
  dependencies.extract = async () => { throw new Error("secret-provider-error PRIVATE LETTER CONTENT"); };
  const result = await handleAppointmentLetter(request(), dependencies);
  assert.equal(result.status, 422);
  assert.doesNotMatch(await result.text(), /secret-provider|PRIVATE LETTER/);
});

test("client refuses a non-consented upload and includes exact consent when approved", async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (_url, init) => {
    requests++;
    assert.ok(init?.body instanceof FormData);
    assert.equal(init.body.get("consent"), APPOINTMENT_LETTER_CONSENT);
    return Response.json({ analysis });
  };
  const connection = { apiOrigin: "https://example.test" } as AppointmentConnection;
  try {
    await assert.rejects(readAppointmentLetter(connection, fixture(), false), /consent/);
    assert.equal(requests, 0);
    const result = await readAppointmentLetter(connection, fixture(), true);
    assert.equal(result.title, analysis.title);
    assert.equal(requests, 1);
  } finally { globalThis.fetch = original; }
});
