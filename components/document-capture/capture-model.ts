import type { SuggestedRoom } from "@/lib/document-extraction";
import type { VaultDocument } from "@/lib/mock-data";

export type CaptureStage =
  | "idle"
  | "preparing"
  | "reading"
  | "organising"
  | "review"
  | "saving"
  | "complete"
  | "error";

export const captureFilingTargets: Record<
  SuggestedRoom,
  { left: number; imagePosition: number }
> = {
  Attic: { left: 50, imagePosition: 16 },
  Bedroom: { left: 25, imagePosition: 36 },
  Office: { left: 54, imagePosition: 36 },
  "Family Room": { left: 25, imagePosition: 58 },
  Kitchen: { left: 36, imagePosition: 58 },
  "Safe Room": { left: 54, imagePosition: 58 },
  Garage: { left: 82, imagePosition: 58 },
  Garden: { left: 21, imagePosition: 80 },
  Driveway: { left: 82, imagePosition: 76 },
  Mailbox: { left: 20, imagePosition: 100 }
};

export const captureRoomIds: Record<string, string> = {
  Attic: "attic",
  Office: "office",
  Garage: "garage",
  Bedroom: "bedroom",
  "Family Room": "family-room",
  Kitchen: "kitchen",
  Garden: "garden",
  Driveway: "driveway",
  "Safe Room": "safe-room",
  Mailbox: "mailbox"
};

export const categoryDocumentKinds: Record<
  VaultDocument["category"],
  VaultDocument["kind"]
> = {
  Identity: "Scan",
  "Home & Property": "Scan",
  Finance: "PDF",
  "Legal & Estate": "PDF",
  "Health & Medical": "Scan",
  Memories: "Image"
};

export function activeCaptureStage(stage: CaptureStage) {
  return ["preparing", "reading", "organising", "saving"].includes(stage)
    ? (stage as "preparing" | "reading" | "organising" | "saving")
    : null;
}

export function captureStageIndex(stage: ReturnType<typeof activeCaptureStage>) {
  if (stage === "preparing" || stage === "reading") return 0;
  if (stage === "organising") return 1;
  return stage === "saving" ? 2 : 0;
}
