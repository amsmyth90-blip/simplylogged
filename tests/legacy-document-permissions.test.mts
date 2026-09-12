import assert from "node:assert/strict";
import test from "node:test";
import { legacyDocumentPermissionError } from "../lib/legacy-document-permissions.ts";
test("absent legacy labels do not disable current permission error handling", () => {
  assert.equal(legacyDocumentPermissionError({code:"PGRST205"}),null);
  assert.equal(legacyDocumentPermissionError({code:"42P01"}),null);
  for(const code of ["42501","PGRST301","08006","42703"]) {
    const error={code}; assert.equal(legacyDocumentPermissionError(error),error);
  }
});
