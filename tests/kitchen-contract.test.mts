import assert from "node:assert/strict";
import test from "node:test";

import {
  KITCHEN_SCHEMA_VERSION,
  KITCHEN_NOTICEBOARD_SCHEMA_VERSION,
  parseNoticeCaptureResponse,
  parseKitchenNoticeMutation,
  parseKitchenNoticeboardSnapshot,
  parseKitchenMutation,
  parseKitchenSnapshot,
} from "../packages/kitchen/src/index.ts";

const revision = "2026-09-02T09:00:00.000Z";

test("Kitchen contract accepts only strict bounded snapshots", () => {
  const snapshot = parseKitchenSnapshot({
    schemaVersion: KITCHEN_SCHEMA_VERSION,
    revision,
    items: [{ id: "kitchen-1", name: "Milk", checked: false, section: "Shopping" }],
  });
  assert.equal(snapshot.items[0]?.name, "Milk");
  assert.throws(() => parseKitchenSnapshot({
    schemaVersion: KITCHEN_SCHEMA_VERSION,
    revision,
    items: Array.from({ length: 301 }, (_, index) => ({
      id: `kitchen-${index}`,
      name: "Milk",
      checked: false,
      section: "Shopping",
    })),
  }), /Kitchen items is invalid/);
});

test("Kitchen noticeboard accepts only strict bounded owner-free records", () => {
  const snapshot = parseKitchenNoticeboardSnapshot({
    schemaVersion: KITCHEN_NOTICEBOARD_SCHEMA_VERSION,
    revision,
    notices: [{
      id: "notice-1",
      title: "School forms",
      detail: "Bring tomorrow",
      category: "School",
      assignedTo: "Family",
      due: "Tomorrow",
      colour: "sage",
      pinned: true,
      completed: false,
      archived: false,
      createdAt: revision,
      source: "manual",
    }],
    assignees: ["Family"],
  });
  assert.equal(snapshot.notices[0]?.title, "School forms");
  assert.throws(() => parseKitchenNoticeboardSnapshot({
    ...snapshot,
    notices: [{ ...snapshot.notices[0], ownerId: "another-user" }],
  }), /unsupported information/);
  assert.throws(() => parseKitchenNoticeboardSnapshot({
    ...snapshot,
    notices: [{ ...snapshot.notices[0], detail: 42 }],
  }), /detail is invalid/);
});

test("Kitchen notice mutations are exact and never accept ownership", () => {
  const input = {
    operation: "SAVE_NOTICE",
    revision,
    noticeId: null,
    title: "School forms",
    detail: "Bring tomorrow",
    category: "School",
    assignedTo: "Family",
    due: "Tomorrow",
    colour: "sage",
    pinned: true,
    completed: false,
    source: "manual",
    linkReminder: true,
    linkCalendar: true,
  } as const;
  assert.equal(parseKitchenNoticeMutation(input).operation, "SAVE_NOTICE");
  assert.throws(() => parseKitchenNoticeMutation({ ...input, userId: "another-user" }),
    /unsupported information/);
  assert.throws(() => parseKitchenNoticeMutation({
    operation: "SET_NOTICE_STATE",
    revision,
    noticeId: "notice-1",
    state: "DELETED",
  }), /state is invalid/);
});

test("Kitchen notice capture responses are exact, bounded and owner-free", () => {
  const response = parseNoticeCaptureResponse({
    notice: {
      title: "School forms", detail: "Bring tomorrow", category: "School",
      assignedTo: "Family", due: "Tomorrow", colour: "blue",
    },
    transcript: "Please remember the school forms tomorrow",
  });
  assert.equal(response.notice.title, "School forms");
  assert.throws(() => parseNoticeCaptureResponse({
    ...response,
    notice: { ...response.notice, ownerId: "another-user" },
  }), /unsupported information/);
  assert.throws(() => parseNoticeCaptureResponse({
    notice: { ...response.notice, detail: "x".repeat(121) },
  }), /detail is invalid/);
});

test("Kitchen mutations reject scope injection and unknown operations", () => {
  assert.throws(() => parseKitchenMutation({
    operation: "ADD_ITEM",
    revision,
    name: "Milk",
    section: "Shopping",
    ownerId: "another-user",
  }), /unsupported information/);
  assert.throws(() => parseKitchenMutation({
    operation: "REPLACE_ALL",
    revision,
    items: [],
  }), /operation is invalid/);
});
