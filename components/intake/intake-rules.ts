import type { IconName } from "@/components/UiIcon";
import type { MailItem } from "@/lib/diarydock-data";
import { roomDetails, type VaultDocument } from "@/lib/mock-data";

export type IntakeAction = "vault" | "reminder" | "room" | "ignored";

export const intakeStatusCopy: Record<MailItem["routeStatus"], { label: string; tone: string }> = {
  new: { label: "Needs filing", tone: "bg-amber-100/80 text-amber-700" },
  vault: { label: "Saved to Vault", tone: "bg-sky-100/80 text-sky-700" },
  reminder: { label: "Reminder made", tone: "bg-orange-100/80 text-orange-700" },
  room: { label: "Sent to room", tone: "bg-emerald-100/80 text-emerald-700" },
  ignored: { label: "Ignored", tone: "bg-stone-100/90 text-stone-500" },
};

export const intakeSourceCards: Array<{
  title: string; detail: string; icon: IconName; badge: string;
}> = [
  { title: "Scan", detail: "Photograph letters, bills and forms with AI read-through.",
    icon: "plus", badge: "Live" },
  { title: "Share to DiaryDock", detail: "Native app share-sheet target for email attachments and PDFs.",
    icon: "share", badge: "Next" },
  { title: "Email forwarding", detail: "Forward bills or appointments into a private DiaryDock inbox.",
    icon: "mail", badge: "Planned" },
];

export function intakeRoomId(name?: string) {
  if (!name) return "office";
  const match = Object.values(roomDetails)
    .find((room) => room.name.toLowerCase() === name.toLowerCase());
  return match?.id ?? name.toLowerCase().replaceAll(" ", "-");
}

export function intakeCategory(roomId: string) {
  if (roomId === "bedroom") return "Health & Medical";
  if (roomId === "attic" || roomId === "family-room" || roomId === "garden") return "Memories";
  if (roomId === "office" || roomId === "safe-room") return "Legal & Estate";
  return "Home & Property";
}

export function intakeDocumentKind(item: MailItem): VaultDocument["kind"] {
  return item.kind === "Form" || item.kind === "Statement" ? "PDF" : "Scan";
}
