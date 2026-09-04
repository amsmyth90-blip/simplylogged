"use client";

import { readBoundedJsonResponse } from "@/lib/http/bounded-json-response";

import {
  parseDiaryDockRecordPage,
  type DiaryDockRecordKind,
  type DiaryDockRecordPage,
} from "./diarydock-record-page.ts";

const MAX_PAGE_RESPONSE_BYTES = 3 * 1024 * 1024;
const MAX_PAGES_PER_KIND = 500;

async function loadPage(
  kind: DiaryDockRecordKind,
  cursor: string,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ kind, cursor });
  const response = await fetch(`/api/diarydock/records?${query}`, {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const value = await readBoundedJsonResponse(response, MAX_PAGE_RESPONSE_BYTES);
  if (!response.ok) throw new Error("DiaryDock could not finish loading every record.");
  const page = parseDiaryDockRecordPage(value);
  if (page.kind !== kind) throw new Error("DiaryDock received the wrong record page.");
  return page;
}

async function drainPages(
  kind: DiaryDockRecordKind,
  firstCursor: string | null,
  signal: AbortSignal | undefined,
  apply: (page: DiaryDockRecordPage) => void,
) {
  let cursor = firstCursor;
  let pages = 0;
  while (cursor) {
    if (pages >= MAX_PAGES_PER_KIND) {
      throw new Error("DiaryDock record paging exceeded its safe bound.");
    }
    const page = await loadPage(kind, cursor, signal);
    apply(page);
    cursor = page.nextCursor;
    pages += 1;
  }
}

export async function loadRemainingDiaryDockRecords(input: {
  documentCursor: string | null;
  reminderCursor: string | null;
  signal?: AbortSignal;
  apply: (page: DiaryDockRecordPage) => void;
}) {
  await Promise.all([
    drainPages("documents", input.documentCursor, input.signal, input.apply),
    drainPages("reminders", input.reminderCursor, input.signal, input.apply),
  ]);
}
