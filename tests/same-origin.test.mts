import assert from "node:assert/strict";
import test from "node:test";
import { isSameOriginRequest } from "../lib/http/same-origin.ts";

test("same-origin writes use the browser target host when Next normalizes its URL", () => {
  assert.equal(isSameOriginRequest(new Request("http://localhost:3005/api/test", { headers: { host: "127.0.0.1:3005", origin: "http://127.0.0.1:3005" } })), true);
});
test("cross-site, malformed and forwarded-host origins remain rejected", () => {
  for (const origin of ["https://evil.example", "null", "http://127.0.0.1:3005/path", "http://127.0.0.1:3006", ""]) {
    assert.equal(isSameOriginRequest(new Request("http://localhost:3005/api/test", { headers: { host: "127.0.0.1:3005", origin, "x-forwarded-host": "evil.example" } })), false);
  }
  assert.equal(isSameOriginRequest(new Request("https://diarydock.com/api/test", { headers: { host: "evil.example/path", origin: "https://evil.example" } })), false);
});
