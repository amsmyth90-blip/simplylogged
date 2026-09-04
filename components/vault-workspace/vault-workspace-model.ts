import type { RoomDocument, VaultDocument } from "@/lib/mock-data";
import type { ResourceVisibility } from "@/lib/resource-access";

export type VaultFilter = "all" | "needs-review" | "shared" | "emergency" | "starred";
export type VaultSort = "newest" | "category" | "due-date" | "title";

export type VaultDraft = {
  title: string;
  category: string;
  kind: VaultDocument["kind"];
  size: string;
  visibility: ResourceVisibility;
  sharedWithUserIds: string[];
  emergencyVisible: boolean;
  starred: boolean;
};

export type FilingDestination = {
  roomId: string;
  roomName: string;
  category: string;
};

export const filingDestinationOptions: FilingDestination[] = [
  { roomId: "office", roomName: "Documents", category: "Important Correspondence" },
  { roomId: "office", roomName: "Documents", category: "Identity" },
  { roomId: "office", roomName: "Documents", category: "Legal & Estate" },
  { roomId: "office", roomName: "Documents", category: "Finance" },
  { roomId: "garage", roomName: "Vehicles", category: "Vehicle" },
  { roomId: "bedroom", roomName: "Health", category: "Health & Medical" },
  { roomId: "kitchen", roomName: "Home", category: "Recipes" },
  { roomId: "garden", roomName: "Pets", category: "Pets" },
  { roomId: "driveway", roomName: "Travel", category: "Travel" },
  { roomId: "attic", roomName: "Memories", category: "Memories" },
];

export const defaultDraft: VaultDraft = {
  title: "",
  category: "Identity",
  kind: "PDF",
  size: "",
  visibility: "PRIVATE",
  sharedWithUserIds: [],
  emergencyVisible: false,
  starred: false,
};

export function filingDestinationValue(destination: FilingDestination) {
  return `${destination.roomId}::${destination.roomName}::${destination.category}`;
}

export function parseFilingDestination(value: string): FilingDestination | null {
  const [roomId, roomName, category] = value.split("::");
  return roomId && roomName && category ? { roomId, roomName, category } : null;
}

export function buildRoomDocument(document: VaultDocument, destination: FilingDestination): RoomDocument {
  return {
    id: `${destination.roomId}-${document.id}`,
    title: document.title,
    kind: document.kind,
    size: document.size,
    updated: "Just now",
  };
}

export function buildDraft(document?: VaultDocument): VaultDraft {
  if (!document) return defaultDraft;
  return {
    title: document.title,
    category: document.category,
    kind: document.kind,
    size: document.size,
    visibility: document.visibility ?? (document.sharedWith?.length ? "SELECTED_MEMBERS" : "PRIVATE"),
    sharedWithUserIds: document.sharedWithUserIds ?? [],
    emergencyVisible: Boolean(document.emergencyVisible),
    starred: Boolean(document.starred),
  };
}

export function recencyRank(document: VaultDocument) {
  const value = document.updated.toLowerCase();
  if (value.includes("just now")) return 0;
  if (value.includes("today")) return 1;
  if (value.includes("yesterday")) return 2;
  if (value.includes("week")) return 3;
  if (value.includes("month")) return 4;
  return 5;
}

export function isEmailImport(document: VaultDocument) {
  return document.roomId === "mailbox" ||
    document.roomName === "Mailbox" ||
    Boolean(document.reviewReasons?.some((reason) => reason.toLowerCase().includes("email"))) ||
    Boolean(document.extractionSummary?.toLowerCase().includes("forwarded into diarydock by email"));
}
