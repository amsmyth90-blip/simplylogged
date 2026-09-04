import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  decodeDiaryDockRecordCursor,
  encodeDiaryDockRecordCursor,
} from "../lib/diarydock-record-cursor-codec.ts";
import { parseDiaryDockRecordPage } from "../lib/diarydock-record-page.ts";

const cursorSource = { createdAt: "2026-09-04T20:50:00.000Z", id: "doc-100" };

test("desktop record cursors round-trip one immutable page position", () => {
  const cursor = encodeDiaryDockRecordCursor("documents", cursorSource);
  assert.deepEqual(decodeDiaryDockRecordCursor("documents", cursor), cursorSource);
  assert.throws(() => decodeDiaryDockRecordCursor("reminders", cursor), /Invalid/);
  assert.throws(() => decodeDiaryDockRecordCursor("documents", `${cursor}!`), /Invalid/);
  assert.equal(decodeDiaryDockRecordCursor("documents", null), null);
});

test("desktop record pages reject mixed and oversized collections", () => {
  assert.deepEqual(parseDiaryDockRecordPage({
    kind: "documents",
    documents: [{ id: "doc-1", title: "Policy" }],
    reminders: [],
    nextCursor: null,
  }).documents[0]?.id, "doc-1");
  assert.throws(() => parseDiaryDockRecordPage({
    kind: "documents",
    documents: [{ id: "doc-1", title: "Policy" }],
    reminders: [{ id: "reminder-1", title: "Renew" }],
    nextCursor: null,
  }), /mixed/);
  assert.throws(() => parseDiaryDockRecordPage({
    kind: "reminders", documents: [],
    reminders: Array.from({ length: 251 }, (_, index) => ({
      id: `reminder-${index}`, title: "Reminder",
    })),
    nextCursor: null,
  }), /Invalid record page/);
});

test("desktop record paging is authenticated, bounded and progressively merged", async () => {
  const [route, server, client, provider, bootstrap, bootstrapClient] = await Promise.all([
    readFile(new URL("../app/api/diarydock/records/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/diarydock-record-page-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/diarydock-record-page-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/DiaryDockDataProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/diarydock/bootstrap/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/diarydock-bootstrap-client.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /getSupabaseServerClient/);
  assert.match(route, /checkServerRateLimit/);
  assert.match(route, /INVALID_CURSOR/);
  assert.match(server, /\.limit\(limit\)/);
  assert.doesNotMatch(server, /base\.eq\("user_id"/);
  assert.match(server, /\.in\("document_id", ids\)/);
  assert.match(server, /\.in\("resource_id", ids\)/);
  assert.match(client, /MAX_PAGE_RESPONSE_BYTES = 3 \* 1024 \* 1024/);
  assert.match(client, /Promise\.all/);
  assert.match(provider, /mergeDiaryDockRecordPage/);
  assert.match(provider, /AbortController/);
  assert.match(bootstrapClient, /readBoundedJsonResponse\(response, 8 \* 1024 \* 1024\)/);
  assert.match(bootstrap, /loadDiaryDockRecordPage/);
  assert.doesNotMatch(bootstrap, /\.select\("\*"\)/);
  const merge = await readFile(new URL("../lib/diarydock-state-merge.ts", import.meta.url), "utf8");
  assert.match(merge, /mergeById\(state\.vaultDocuments, page\.documents\)/);
  assert.match(merge, /placement === "front"/);
});
