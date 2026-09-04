import type { DocumentExtractionResult } from "@/lib/document-extraction";
import { sanitizeDocumentFileName } from "@/lib/document-storage";

const MAX_ANALYSIS_IMAGE_EDGE = 1800;
export const MAX_ANALYSIS_UPLOAD_SIZE = 3.5 * 1024 * 1024;

function blobFromCanvas(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Unable to prepare this image for document reading.")),
      "image/jpeg",
      quality
    );
  });
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read this image. Please try another photo."));
    };
    image.src = objectUrl;
  });
}

export async function prepareCapturePage(file: File, maxBytes: number) {
  if (!file.type.startsWith("image/")) {
    throw new Error("DiaryDock can currently scan photographed image pages only.");
  }
  const image = await loadImageFromFile(file);
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, MAX_ANALYSIS_IMAGE_EDGE / longestEdge);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare this page for document reading.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.84;
  let blob = await blobFromCanvas(canvas, quality);
  while (blob.size > maxBytes && quality > 0.34) {
    quality -= 0.1;
    blob = await blobFromCanvas(canvas, quality);
  }
  if (blob.size > maxBytes) {
    throw new Error(
      "One page is too detailed to upload. Please crop it closer to the document and try again."
    );
  }
  const baseName =
    sanitizeDocumentFileName(file.name.replace(/\.[^.]+$/, "")) || "document-page";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

export async function createCapturePdf(files: File[]) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  for (const file of files) {
    const image = await pdf.embedJpg(await file.arrayBuffer());
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const scale = Math.min((pageWidth - 40) / image.width, (pageHeight - 40) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height
    });
  }
  const bytes = await pdf.save();
  return new File([bytes], `diarydock-${files.length}-page-scan.pdf`, {
    type: "application/pdf",
    lastModified: Date.now()
  });
}

export async function readCaptureApiPayload(response: Response) {
  if ((response.headers.get("content-type") ?? "").includes("application/json")) {
    return (await response.json()) as {
      captureJobId?: string;
      error?: string;
      extraction?: DocumentExtractionResult;
    };
  }
  const text = (await response.text()).trim();
  return {
    error:
      text.toLowerCase().includes("request entity") ||
      text.toLowerCase().includes("request body")
        ? "That photo was too large for document reading. DiaryDock now compresses large images automatically, so please try the scan again."
        : text || "The document could not be analyzed. Please try again."
  };
}
