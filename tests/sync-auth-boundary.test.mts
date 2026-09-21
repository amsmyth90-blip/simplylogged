import assert from "node:assert/strict";
import test from "node:test";

import { authenticatedSubject } from "../lib/supabase/claims.ts";

test("sync claims accept only a verified authenticated UUID subject", () => {
  const userId = "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51";
  assert.equal(authenticatedSubject({ role: "authenticated", sub: userId }), userId);
  assert.equal(authenticatedSubject({ role: "service_role", sub: userId }), null);
  assert.equal(authenticatedSubject({ role: "authenticated", sub: "not-a-user-id" }), null);
  assert.equal(authenticatedSubject(null), null);
});
