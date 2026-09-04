import assert from "node:assert/strict";
import test from "node:test";

import { HttpCaptureSecurityScanner } from "../lib/capture/http-security-scanner.ts";
import { captureScannerIsRequired } from "../lib/capture/file-security.ts";

const token = "scanner-secret-that-is-at-least-thirty-two-characters";
const file = { bytes: Uint8Array.of(1, 2, 3), mimeType: "application/pdf" };

test("the configured scanner sends only bounded files over an authenticated private contract", async () => {
  let request: RequestInit | undefined;
  const scanner = new HttpCaptureSecurityScanner(
    { endpoint: "https://scanner.internal.example/v1/scan", token },
    async (_input, init) => {
      request = init;
      return Response.json({ status: "PASSED", engine: "clamav-1.4" });
    },
  );
  assert.deepEqual(await scanner.scan([file]), { status: "PASSED", scanner: "clamav-1.4" });
  assert.equal((request?.headers as Record<string, string>).Authorization, `Bearer ${token}`);
  assert.equal((request?.headers as Record<string, string>)["X-DiaryDock-Scanner-Contract"], "2026-09-01");
  assert.ok(request?.body instanceof FormData);
  assert.equal((request?.body as FormData).getAll("files").length, 1);
});

test("the configured scanner reports blocked files without weakening the result", async () => {
  const scanner = new HttpCaptureSecurityScanner(
    { endpoint: "https://scanner.internal.example/v1/scan", token },
    async () => Response.json({ status: "BLOCKED", engine: "clamav-1.4" }),
  );
  assert.deepEqual(await scanner.scan([file]), { status: "BLOCKED", scanner: "clamav-1.4" });
});

test("scanner failures, redirects and malformed responses fail closed as unavailable", async () => {
  const failing = new HttpCaptureSecurityScanner(
    { endpoint: "https://scanner.internal.example/v1/scan", token },
    async () => new Response("upstream failure", { status: 503 }),
  );
  assert.equal((await failing.scan([file])).status, "UNAVAILABLE");
  const malformed = new HttpCaptureSecurityScanner(
    { endpoint: "https://scanner.internal.example/v1/scan", token },
    async () => Response.json({ status: "PASSED", engine: "x".repeat(81) }),
  );
  assert.equal((await malformed.scan([file])).status, "UNAVAILABLE");
});

test("production scanner configuration requires HTTPS and a strong credential", () => {
  assert.throws(() => new HttpCaptureSecurityScanner({ endpoint: "http://scanner.example/scan", token }), /HTTPS/);
  assert.throws(() => new HttpCaptureSecurityScanner({ endpoint: "https://scanner.example/scan", token: "short" }), /credential/);
});

test("production requires an authoritative scanner unless an explicit temporary override is set", () => {
  const previousNodeEnvironment = process.env.NODE_ENV;
  const previousRequirement = process.env.DIARYDOCK_CAPTURE_SCANNER_REQUIRED;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.DIARYDOCK_CAPTURE_SCANNER_REQUIRED;
    assert.equal(captureScannerIsRequired(), true);
    process.env.DIARYDOCK_CAPTURE_SCANNER_REQUIRED = "false";
    assert.equal(captureScannerIsRequired(), false);
  } finally {
    if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnvironment;
    if (previousRequirement === undefined) delete process.env.DIARYDOCK_CAPTURE_SCANNER_REQUIRED;
    else process.env.DIARYDOCK_CAPTURE_SCANNER_REQUIRED = previousRequirement;
  }
});
