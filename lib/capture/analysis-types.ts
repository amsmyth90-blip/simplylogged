export type AnalysisMode = "document" | "will" | "bill" | "insurance" | "receipt";

export type CaptureFile = Pick<File, "size" | "type" | "arrayBuffer">;

export type SafeCaptureFile = {
  bytes: Uint8Array;
  mimeType: string;
};

export function getAnalysisMode(value: unknown): AnalysisMode {
  return value === "will" || value === "bill" || value === "insurance" || value === "receipt"
    ? value
    : "document";
}
