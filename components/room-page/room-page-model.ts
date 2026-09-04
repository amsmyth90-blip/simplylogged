import type { IconName } from "@/components/UiIcon";
import type { AreaStatus, RoomDetail, RoomDocument, VaultDocument } from "@/lib/mock-data";

export type RoomModal = "task" | "document" | "activity" | null;
export type TaskDraft = { label: string; due: string };
export type DocumentDraft = { title: string; kind: RoomDocument["kind"]; size: string };
export type ActivityDraft = { text: string; by: string };
export type RoomDocumentEntry = RoomDocument & {
  href: string;
  reviewStatus?: VaultDocument["reviewStatus"];
};

export const emptyTaskDraft: TaskDraft = { label: "", due: "" };
export const emptyDocumentDraft: DocumentDraft = { title: "", kind: "PDF", size: "" };
export const emptyActivityDraft: ActivityDraft = { text: "", by: "You" };

export const roomHeroAccent: Record<AreaStatus, string> = {
  ready: "linear-gradient(180deg, rgba(94,124,103,0.12) 0%, rgba(56,48,35,0.18) 45%, rgba(39,32,24,0.48) 100%)",
  attention: "linear-gradient(180deg, rgba(214,141,90,0.12) 0%, rgba(56,48,35,0.2) 45%, rgba(39,32,24,0.5) 100%)",
  secure: "linear-gradient(180deg, rgba(99,136,150,0.12) 0%, rgba(56,48,35,0.18) 45%, rgba(39,32,24,0.48) 100%)"
};

export const roomHeroImages: Record<string, string> = {
  attic: "/images/pages/attic-hero.webp", bedroom: "/images/pages/bedroom-hero.webp",
  office: "/images/pages/office-hero.webp", "family-room": "/images/pages/family-room-hero.webp",
  "safe-room": "/images/pages/safe-room-hero.webp", garage: "/images/pages/garage-hero.webp",
  mailbox: "/images/pages/mailbox-hero.webp", garden: "/images/pages/garden-hero.webp",
  driveway: "/images/pages/driveway-hero.webp"
};

export const roomHeroPositions: Record<string, string> = {
  attic: "center 45%", bedroom: "center 50%", office: "center 48%",
  "family-room": "center 48%", "safe-room": "center 48%", garage: "center 48%",
  mailbox: "center 46%", garden: "center 43%", driveway: "center 46%"
};

export const roomDocumentCategories: Record<string, string> = {
  office: "Legal & Estate", bedroom: "Health & Medical", attic: "Memories",
  garage: "Vehicles & Transport", garden: "Pets & Outdoor", driveway: "Travel & Access",
  "safe-room": "Legal & Estate", "family-room": "Memories"
};

export const swipeRoomOrder = ["attic", "bedroom", "office", "family-room", "safe-room", "garage", "garden", "driveway"] as const;
export const mailboxRouteTone = {
  new: "bg-white/80 text-ink/55", vault: "bg-mist text-sky-700",
  reminder: "bg-blush text-orange-700", room: "bg-sage/70 text-moss",
  ignored: "bg-stone-100 text-stone-500"
} as const;
export const mailboxRouteLabel = {
  new: "Needs routing", vault: "Filed to Vault", reminder: "Reminder created",
  room: "Sent to room", ignored: "Ignored"
} as const;

export const roomStarterSuggestions: Record<string, string[]> = {
  attic: ["Scan old family letters", "Add photo album notes", "Store keepsake details"],
  bedroom: ["Add GP details", "Scan prescription list", "Store health insurance"],
  office: ["Scan passport or ID", "Add house deeds", "Store will or POA"],
  "family-room": ["Invite a household member", "Review shared access", "Check the Family Inbox"],
  "safe-room": ["Add emergency instructions", "Mark insurance claim pack", "Store key holder notes"],
  garage: ["Scan MOT certificate", "Add car insurance", "Store service history"],
  mailbox: ["Scan new post", "Route incoming bill", "Create follow-up reminder"],
  garden: ["Scan pet vaccination card", "Add gardener details", "Store outdoor plan"],
  driveway: ["Add travel checklist", "Store parking notes", "Scan passport renewal notice"]
};

export type RoomObject = { label: string; detail: string; href: string; icon: IconName; left: string; top: string };
export const interactiveRoomObjects: Record<string, RoomObject[]> = {
  attic: [{ label: "Photo albums", detail: "Open family memories", href: "/files", icon: "archive", left: "30%", top: "44%" }, { label: "Keepsake chest", detail: "View legacy records", href: "/files", icon: "lock", left: "72%", top: "55%" }],
  bedroom: [{ label: "Health & Medical", detail: "Open health records", href: "/room/bedroom#room-documents", icon: "folder", left: "28%", top: "49%" }, { label: "Appointments", detail: "View upcoming care", href: "/reminders", icon: "calendar", left: "70%", top: "38%" }],
  office: [{ label: "Document drawer", detail: "Open important files", href: "/files", icon: "folder", left: "28%", top: "52%" }, { label: "Family access", detail: "Manage trusted people", href: "/family", icon: "users", left: "72%", top: "42%" }],
  "family-room": [{ label: "Household members", detail: "Manage people and access", href: "/family", icon: "users", left: "32%", top: "40%" }, { label: "Family Inbox", detail: "Review shared action items", href: "/family", icon: "mail", left: "72%", top: "52%" }],
  "safe-room": [{ label: "Emergency plan", detail: "Open emergency access", href: "/emergency", icon: "shield", left: "34%", top: "45%" }, { label: "Secure files", detail: "View protected documents", href: "/files", icon: "lock", left: "70%", top: "54%" }],
  garage: [{ label: "Vehicle documents", detail: "Open MOT and insurance", href: "/room/garage#room-documents", icon: "car", left: "32%", top: "52%" }, { label: "Service calendar", detail: "View vehicle reminders", href: "/reminders", icon: "calendar", left: "72%", top: "39%" }],
  garden: [{ label: "Pet records", detail: "Open pet information", href: "/room/garden#room-documents", icon: "leaf", left: "31%", top: "52%" }, { label: "Garden jobs", detail: "View outdoor reminders", href: "/reminders", icon: "calendar", left: "72%", top: "43%" }],
  driveway: [{ label: "Travel documents", detail: "Open travel records", href: "/room/driveway#room-documents", icon: "map-pin", left: "32%", top: "48%" }, { label: "Trip planner", detail: "View upcoming travel", href: "/reminders", icon: "calendar", left: "72%", top: "42%" }]
};

export function buildRoomDocumentEntries(room: RoomDetail, documents: RoomDocument[], vaultDocuments: VaultDocument[]): RoomDocumentEntry[] {
  const vaultByTitle = new Map(vaultDocuments.map((item) => [item.title.trim().toLowerCase(), item]));
  const listedTitles = new Set(documents.map((item) => item.title.trim().toLowerCase()));
  return [
    ...documents.map((document) => {
      const vaultDocument = vaultByTitle.get(document.title.trim().toLowerCase());
      return { ...document, href: vaultDocument ? `/document/${vaultDocument.id}?from=${room.id}` : "/files", reviewStatus: vaultDocument?.reviewStatus };
    }),
    ...vaultDocuments.filter((item) => !listedTitles.has(item.title.trim().toLowerCase())).map((document) => ({ id: document.id, title: document.title, kind: document.kind, size: document.size, updated: document.updated, href: `/document/${document.id}?from=${room.id}`, reviewStatus: document.reviewStatus }))
  ];
}

export function roomDocumentSectionTitle(roomId: string) {
  return ({ bedroom: "Health & Medical", garage: "Vehicle documents", garden: "Pet records", driveway: "Travel documents" } as Record<string, string>)[roomId] ?? "Documents";
}
