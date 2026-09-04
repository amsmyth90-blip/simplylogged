import type {
  MobileWillRecord,
  WillDetails,
  WillExecutor,
} from "@diarydock/wills";

export type WillsView = "overview" | "will" | "wishes" | "letters" | "planning";

export function detailsFromWill(will: MobileWillRecord): WillDetails {
  return {
    solicitorName: will.solicitorName,
    solicitorFirm: will.solicitorFirm,
    solicitorPhone: will.solicitorPhone,
    solicitorEmail: will.solicitorEmail,
    referenceNumber: will.referenceNumber,
    originalLocationType: will.originalLocationType,
    originalLocationDetails: will.originalLocationDetails,
    originalOrganisation: will.originalOrganisation,
    originalContactName: will.originalContactName,
    originalPhone: will.originalPhone,
    originalEmail: will.originalEmail,
    originalReferenceNumber: will.originalReferenceNumber,
    originalAccessNotes: will.originalAccessNotes,
    originalTrustedPeople: will.originalTrustedPeople,
    primaryExecutor: will.primaryExecutor,
    backupExecutor: will.backupExecutor,
    trustedPersonInformed: will.trustedPersonInformed,
    notes: will.notes,
  };
}

export function executorComplete(executor: WillExecutor) {
  return Boolean(executor.name && (executor.email || executor.phone));
}

export function formatLegalDate(value: string) {
  if (!value) return "Not recorded";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  }).format(parsed);
}

export function safeRoomItem(item: { roomId?: string; roomName?: string; category?: string }) {
  return item.roomId === "safe-room" || item.roomName?.toLowerCase() === "safe room" ||
    item.category === "Legal & Estate";
}
