import {
  Camera,
  CameraDirection,
  CameraErrorCode,
  EncodingType,
  MediaTypeSelection,
  type MediaResult,
} from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";

import {
  detectDocumentMimeType,
  inspectDocumentBytes,
  MAX_DOCUMENT_BYTES,
  sanitizeDocumentFileName,
  validateDocumentUpload,
} from "@diarydock/documents";

import { readBoundedResponseBytes } from "../platform/bounded-response-bytes.ts";
import { requestSignal } from "../platform/request-deadline.ts";

export type CapturedDocument = {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  previewUrl: string | null;
};

export function capturedDocumentFromBytes(
  bytes: Uint8Array,
  fileName: string,
  declaredMimeType: string,
): CapturedDocument {
  const validationError = validateDocumentUpload({
    size: bytes.byteLength,
    type: declaredMimeType,
  });
  if (validationError) throw new Error(validationError);
  const inspected = inspectDocumentBytes({ declaredMimeType, bytes });
  if (!inspected.ok) throw new Error(inspected.error);
  const safeName = sanitizeDocumentFileName(
    fileName || `shared-document.${extension(inspected.detectedMimeType)}`,
  );
  return {
    bytes,
    fileName: safeName,
    mimeType: inspected.detectedMimeType,
    previewUrl: inspected.detectedMimeType.startsWith("image/")
      ? URL.createObjectURL(new Blob([bytes], { type: inspected.detectedMimeType }))
      : null,
  };
}

function decodeBase64(value: string) {
  const encoded = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function bytesFromMedia(result: MediaResult) {
  if (Capacitor.isNativePlatform()) {
    if (!result.uri) throw new Error("The selected image could not be opened.");
    const read = await Filesystem.readFile({
      path: result.uri,
      length: MAX_DOCUMENT_BYTES + 1,
    });
    const bytes = typeof read.data !== "string"
      ? new Uint8Array(await read.data.arrayBuffer())
      : decodeBase64(read.data);
    if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
      throw new Error("Please choose a file no larger than 4 MB.");
    }
    return bytes;
  }
  const source = result.webPath ?? (result.thumbnail ? `data:image/jpeg;base64,${result.thumbnail}` : null);
  if (!source) throw new Error("The selected image could not be opened.");
  const response = await fetch(source, {
    signal: requestSignal(undefined, 15_000),
  });
  if (!response.ok) throw new Error("The selected image could not be opened.");
  return readBoundedResponseBytes(response, MAX_DOCUMENT_BYTES, "selected image");
}

function extension(mimeType: string) {
  return mimeType === "image/png" ? "png"
    : mimeType === "image/webp" ? "webp"
      : mimeType === "image/heic" ? "heic" : "jpg";
}

export async function capturedDocumentFromMedia(result: MediaResult): Promise<CapturedDocument> {
  const bytes = await bytesFromMedia(result);
  const mimeType = detectDocumentMimeType(bytes) ?? "";
  const inspected = inspectDocumentBytes({ declaredMimeType: mimeType, bytes });
  if (!inspected.ok) throw new Error(inspected.error);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    bytes,
    fileName: `diarydock-scan-${timestamp}.${extension(inspected.detectedMimeType)}`,
    mimeType: inspected.detectedMimeType,
    previewUrl: result.webPath ?? null,
  };
}

export async function capturedDocumentFromFile(file: File): Promise<CapturedDocument> {
  const declaredMimeType = file.type.toLowerCase().split(";")[0] ?? "";
  const validationError = validateDocumentUpload({ size: file.size, type: declaredMimeType });
  if (validationError) throw new Error(validationError);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return capturedDocumentFromBytes(bytes, file.name, declaredMimeType);
}

function cancelled(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === CameraErrorCode.TakePhotoCancelled
    || candidate.code === CameraErrorCode.ChooseMediaCancelled
    || (typeof candidate.message === "string" && /cancel/i.test(candidate.message));
}

async function optionalCapture(work: () => Promise<MediaResult>) {
  try {
    return await capturedDocumentFromMedia(await work());
  } catch (error) {
    if (cancelled(error)) return null;
    throw error;
  }
}

export function takeDocumentPhoto() {
  return optionalCapture(() => Camera.takePhoto({
    cameraDirection: CameraDirection.Rear,
    correctOrientation: true,
    editable: "no",
    encodingType: EncodingType.JPEG,
    includeMetadata: true,
    quality: 82,
    saveToGallery: false,
    targetHeight: 2200,
    targetWidth: 2200,
    webUseInput: true,
  }));
}

export async function chooseDocumentPhoto() {
  try {
    const selected = await Camera.chooseFromGallery({
      allowMultipleSelection: false,
      correctOrientation: true,
      editable: "no",
      includeMetadata: true,
      limit: 1,
      mediaType: MediaTypeSelection.Photo,
      quality: 88,
      targetHeight: 2400,
      targetWidth: 2400,
      webUseInput: true,
    });
    const first = selected.results[0];
    return first ? capturedDocumentFromMedia(first) : null;
  } catch (error) {
    if (cancelled(error)) return null;
    throw error;
  }
}
