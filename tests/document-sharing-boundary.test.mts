import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseDocumentSharingMutation,
  parseDocumentSharingQuery,
  parseDocumentSharingResponse,
} from "../lib/document-sharing-contract.ts";

const documentId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";

test("document sharing accepts only an exact bounded access choice", () => {
  assert.deepEqual(parseDocumentSharingMutation({
    documentId,
    visibility: "SELECTED_MEMBERS",
    selectedUserIds: [memberId],
  }), {
    documentId,
    visibility: "SELECTED_MEMBERS",
    selectedUserIds: [memberId],
  });
  assert.throws(() => parseDocumentSharingMutation({
    documentId, visibility: "PRIVATE", selectedUserIds: [memberId],
  }), /selected visibility/);
  assert.throws(() => parseDocumentSharingMutation({
    documentId, visibility: "SELECTED_MEMBERS", selectedUserIds: [memberId, memberId],
  }), /Invalid selected/);
  assert.throws(() => parseDocumentSharingMutation({
    documentId, visibility: "PRIVATE", selectedUserIds: [], ownerId: memberId,
  }), /Invalid document sharing/);
});

test("document sharing response and query reject ambiguity", () => {
  assert.deepEqual(parseDocumentSharingResponse({
    visibility: "HOUSEHOLD", selectedUserIds: [],
  }), { visibility: "HOUSEHOLD", selectedUserIds: [] });
  assert.equal(parseDocumentSharingQuery([["documentId", documentId]]), documentId);
  assert.throws(() => parseDocumentSharingQuery([
    ["documentId", documentId], ["documentId", documentId],
  ]), /Invalid/);
  assert.throws(() => parseDocumentSharingResponse({
    visibility: "PUBLIC", selectedUserIds: [],
  }), /Invalid/);
});

test("document sharing authenticates before bounded parsing and hides provider errors", async () => {
  const [route, client] = await Promise.all([
    readFile(new URL("../app/api/documents/sharing/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/document-sharing.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /sameOrigin/);
  assert.match(route, /readBoundedJson\(request, 8 \* 1024\)/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /RequestObservation/);
  assert.ok(route.indexOf("await authenticate(observation)")
    < route.indexOf("readBoundedJson(request"));
  assert.doesNotMatch(route, /error\.message/);
  assert.match(client, /readBoundedJsonResponse\(response, 16 \* 1024\)/);
  assert.match(client, /selectedUserIds: input\.selectedUserIds \?\? \[\]/);
});
