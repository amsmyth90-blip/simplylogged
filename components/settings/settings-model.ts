import type { SettingGroup } from "@/lib/diarydock-data";

export type ProfileDraft = { name: string; email: string };
export type StorageSummary = { tier: string; usedBytes: number; reservedBytes: number; limitBytes: number };
export type DataModalMode = "profile" | "export" | "delete" | null;
export type ForwardingAddressState =
  | { status: "loading" }
  | { status: "ready"; address: string; copied: boolean }
  | { status: "not-configured"; message: string }
  | { status: "error"; message: string };

export function toggleSettingRows(rows: SettingGroup["rows"], label: string) {
  return rows.map((row) => row.kind === "toggle" && row.label === label ? { ...row, value: !row.value } : row);
}
