import { MAX_DOCUMENT_BYTES } from "@diarydock/documents";

import type { CapturedDocument } from "./capture-source";

export async function combineCapturePages(captures: CapturedDocument[]): Promise<CapturedDocument> {
  if (captures.length === 1) return captures[0]!;
  if (!captures.length || captures.length > 12) throw new Error("Choose between one and twelve pages.");
  const { PDFDocument } = await import("pdf-lib");
  const document = await PDFDocument.create();
  for (const capture of captures) {
    const data = capture.bytes.buffer.slice(
      capture.bytes.byteOffset,
      capture.bytes.byteOffset + capture.bytes.byteLength,
    ) as ArrayBuffer;
    const image = capture.mimeType === "image/jpeg"
      ? await document.embedJpg(data)
      : capture.mimeType === "image/png"
        ? await document.embedPng(data)
        : null;
    if (!image) throw new Error("Multi-page scans currently require JPEG or PNG pages.");
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const scale = Math.min((pageWidth - 40) / image.width, (pageHeight - 40) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const page = document.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
  }
  const bytes = await document.save();
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("The combined scan is larger than 4 MB. Use fewer pages or retake them closer to the document.");
  }
  return {
    bytes,
    fileName: `diarydock-${captures.length}-page-scan.pdf`,
    mimeType: "application/pdf",
    previewUrl: captures[0]?.previewUrl ?? null,
  };
}
