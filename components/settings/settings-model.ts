import type { SettingGroup, SettingsProfile } from "@/lib/diarydock-data";

export type ProfileDraft = { name: string; email: string };
export type StorageSummary = { tier: string; usedBytes: number; reservedBytes: number; limitBytes: number };
export type DataModalMode = "profile" | "export" | "delete" | null;
export type ForwardingAddressState =
  | { status: "loading" }
  | { status: "ready"; address: string; copied: boolean }
  | { status: "not-configured"; message: string }
  | { status: "error"; message: string };

export function settingsProfileForDisplay(
  profile: SettingsProfile,
  account: { email?: string | null; createdAt?: string | null },
): SettingsProfile {
  const name = profile.name.trim() || "Your DiaryDock";
  const email = profile.email.trim() || account.email?.trim() || "Email unavailable";
  const createdAt = account.createdAt ? new Date(account.createdAt) : null;
  const memberSince = profile.memberSince.trim() || (createdAt && !Number.isNaN(createdAt.valueOf())
    ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(createdAt)
    : "not available");
  const initials = profile.initials.trim() || name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "DD";
  return { ...profile, name, email, memberSince, initials };
}

export function toggleSettingRows(rows: SettingGroup["rows"], label: string) {
  return rows.map((row) => row.kind === "toggle" && row.label === label ? { ...row, value: !row.value } : row);
}
