import { analysePrivateDocument } from "@/lib/document-storage";
import type { DiaryDockAppState } from "@/lib/diarydock-data";
import type { WillDocumentAnalysis } from "@/lib/will-document-analysis";
import { hydrateWillRecord, type WillRecord } from "@/lib/will-records";

export type WillUploadStage = "idle" | "uploading" | "processing" | "complete" | "error";

export const willLifeEvents = [
  "Marriage or civil partnership",
  "Separation or divorce",
  "Birth or adoption",
  "Death of an executor or beneficiary",
  "New home",
  "Major asset change",
  "Starting or selling a business",
  "Moving country"
];

export function updateWillState(
  state: DiaryDockAppState,
  updater: (record: WillRecord) => WillRecord
): DiaryDockAppState {
  return {
    ...state,
    willsWishes: {
      ...state.willsWishes,
      myWill: updater(hydrateWillRecord(state.willsWishes.myWill))
    }
  };
}

export function readableWillFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function analyseWillFile(stored: { bucket: string; path: string }) {
  const payload = await analysePrivateDocument<{ willAnalysis?: WillDocumentAnalysis; error?: string }>(stored, "will");
  if (!payload.willAnalysis) throw new Error(payload.error ?? "The document could not be analysed.");
  return payload.willAnalysis;
}
