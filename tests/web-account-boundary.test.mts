import assert from "node:assert/strict";
import test from "node:test";
import { matchesSignedInAccount } from "../lib/account-boundary.ts";

test("a delayed write cannot follow a browser into a different account", () => {
  const originalAccount = "11111111-1111-4111-8111-111111111111";
  const nextAccount = "22222222-2222-4222-8222-222222222222";
  assert.equal(matchesSignedInAccount(originalAccount, originalAccount), true);
  assert.equal(matchesSignedInAccount(originalAccount, nextAccount), false);
  assert.equal(matchesSignedInAccount(originalAccount, null), false);
  assert.equal(matchesSignedInAccount(null, nextAccount), false);
  assert.equal(matchesSignedInAccount(undefined, nextAccount), false);
  assert.equal(matchesSignedInAccount("", ""), false);
});
