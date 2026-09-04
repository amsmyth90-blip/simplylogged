import type { Reminder, VaultDocument } from "@/lib/mock-data";

export type DiaryDockRecordKind = "documents" | "reminders";

export type DiaryDockRecordPage = {
  kind: DiaryDockRecordKind;
  documents: VaultDocument[];
  reminders: Reminder[];
  nextCursor: string | null;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

function recordList(value: unknown) {
  if (!Array.isArray(value) || value.length > 250) {
    throw new Error("Invalid record page.");
  }
  value.forEach((item) => {
    if (!record(item) || typeof item.id !== "string" || !item.id
      || item.id.length > 160 || typeof item.title !== "string") {
      throw new Error("Invalid record page item.");
    }
  });
  return value;
}

export function parseDiaryDockRecordPage(value: unknown): DiaryDockRecordPage {
  if (!record(value) || !exactKeys(value, [
    "kind", "documents", "reminders", "nextCursor",
  ]) || (value.kind !== "documents" && value.kind !== "reminders")) {
    throw new Error("Invalid record page response.");
  }
  if (value.nextCursor !== null
    && (typeof value.nextCursor !== "string" || value.nextCursor.length > 1024)) {
    throw new Error("Invalid record page cursor.");
  }
  const documents = recordList(value.documents);
  const reminders = recordList(value.reminders);
  if ((value.kind === "documents" && reminders.length)
    || (value.kind === "reminders" && documents.length)) {
    throw new Error("Invalid mixed record page.");
  }
  return {
    kind: value.kind,
    documents: documents as VaultDocument[],
    reminders: reminders as Reminder[],
    nextCursor: value.nextCursor,
  };
}
