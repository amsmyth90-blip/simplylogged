import { inspectDocumentBytes } from "@diarydock/documents";

import { getRequestMediaType, RequestBodyError } from "@/lib/http/bounded-body";
import { readBoundedFormData } from "@/lib/http/bounded-form-data";

export type NoticeCaptureInput = {
  file: File;
  mode: "photo" | "voice";
};

export type NoticeCaptureInputResult =
  | { ok: true; input: NoticeCaptureInput }
  | { ok: false; error: string; status: number };

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 512 * 1024;
const AUDIO_TYPES = new Set(["audio/mp4", "audio/mpeg", "audio/wav", "audio/webm", "audio/x-m4a"]);

function audioSignature(bytes: Uint8Array) {
  const text = (offset: number, length: number) => String.fromCharCode(...bytes.slice(offset, offset + length));
  return (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3)
    || text(4, 4) === "ftyp"
    || (text(0, 4) === "RIFF" && text(8, 4) === "WAVE")
    || text(0, 3) === "ID3"
    || (bytes[0] === 0xff && (bytes[1] ?? 0) >= 0xe0);
}

async function validPhoto(file: File) {
  const inspected = inspectDocumentBytes({
    bytes: new Uint8Array(await file.arrayBuffer()),
    declaredMimeType: file.type.toLowerCase().split(";")[0] ?? "",
  });
  return inspected.ok && inspected.detectedMimeType.startsWith("image/");
}

async function validVoice(file: File) {
  const type = file.type.toLowerCase().split(";")[0] ?? "";
  if (!AUDIO_TYPES.has(type)) return false;
  return audioSignature(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
}

export async function readNoticeCaptureInput(request: Request): Promise<NoticeCaptureInputResult> {
  if (getRequestMediaType(request) !== "multipart/form-data") {
    return { ok: false, error: "The capture upload format is not supported.", status: 415 };
  }
  let form: FormData;
  try {
    form = await readBoundedFormData(request, MAX_AUDIO_BYTES + MAX_MULTIPART_OVERHEAD);
  } catch (error) {
    const oversized = error instanceof RequestBodyError && error.status === 413;
    return {
      ok: false,
      error: oversized ? "The capture is too large." : "Please provide one photo or voice note.",
      status: oversized ? 413 : 400,
    };
  }
  const mode = form.get("mode");
  const file = form.get("file");
  if ((mode !== "photo" && mode !== "voice") || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please provide one photo or voice note.", status: 400 };
  }
  if (mode === "photo") {
    if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Please keep the photo under 8 MB.", status: 413 };
    if (!await validPhoto(file)) return { ok: false, error: "The selected photo is not a supported image.", status: 415 };
  } else {
    if (file.size > MAX_AUDIO_BYTES) return { ok: false, error: "Please keep the voice note under 12 MB.", status: 413 };
    if (!await validVoice(file)) return { ok: false, error: "The voice note format is not supported.", status: 415 };
  }
  return { ok: true, input: { file, mode } };
}
