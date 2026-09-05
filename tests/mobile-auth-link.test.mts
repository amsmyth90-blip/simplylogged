import assert from "node:assert/strict";
import test from "node:test";

import { parseMobileAuthLink } from "../apps/mobile/src/auth/mobile-auth-link.ts";

const code = "abcdefghijklmnopqrstuvwxyz0123456789_-";

test("mobile auth confirmation accepts only the exact native callback", () => {
  assert.deepEqual(parseMobileAuthLink(`diarydock://auth/confirm?code=${code}`),
    { code, purpose: "CONFIRM_EMAIL" });
  assert.deepEqual(parseMobileAuthLink(`diarydock://auth/reset?code=${code}`),
    { code, purpose: "RESET_PASSWORD" });
  assert.equal(parseMobileAuthLink(`diarydock://auth/confirm?code=${code}&next=evil`), null);
  assert.equal(parseMobileAuthLink(`diarydock://auth/reset/extra?code=${code}`), null);
  assert.equal(parseMobileAuthLink(`https://diarydock.com/auth/confirm?code=${code}`), null);
  assert.equal(parseMobileAuthLink(`diarydock://family/confirm?code=${code}`), null);
  assert.equal(parseMobileAuthLink("diarydock://auth/confirm?code=short"), null);
});
