import type { DiaryDockRecordKind } from "./diarydock-record-page.ts";

export type DiaryDockRecordCursor = { createdAt: string; id: string };

const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40
    && timestampPattern.test(value) && Number.isFinite(Date.parse(value));
}

export function encodeDiaryDockRecordCursor(
  kind: DiaryDockRecordKind,
  cursor: DiaryDockRecordCursor,
) {
  if (!validTimestamp(cursor.createdAt) || !cursor.id || cursor.id.length > 160) {
    throw new Error("Invalid record cursor source.");
  }
  return Buffer.from(JSON.stringify({
    v: 1, k: kind, c: cursor.createdAt, i: cursor.id,
  })).toString("base64url");
}

export function decodeDiaryDockRecordCursor(
  kind: DiaryDockRecordKind,
  cursor: string | null,
): DiaryDockRecordCursor | null {
  if (!cursor) return null;
  if (cursor.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
    throw new Error("Invalid record cursor.");
  }
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    const item = value as Record<string, unknown>;
    if (Object.keys(item).sort().join(",") !== "c,i,k,v"
      || item.v !== 1 || item.k !== kind || !validTimestamp(item.c)
      || typeof item.i !== "string" || !item.i || item.i.length > 160) {
      throw new Error();
    }
    return { createdAt: item.c, id: item.i };
  } catch {
    throw new Error("Invalid record cursor.");
  }
}
