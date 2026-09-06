import "server-only";

import OpenAI from "openai";

import {
  MAX_PANTRY_PHOTO_BYTES,
  MAX_PANTRY_PHOTO_COUNT,
  MAX_PANTRY_TOTAL_PHOTO_BYTES,
  pantryAnalysisSchema,
  parsePantryAnalysis,
} from "@diarydock/kitchen";

import { inspectCaptureFile } from "@/lib/capture/file-security";
import { RequestBodyError } from "@/lib/http/bounded-body";
import { readBoundedMultiFile } from "@/lib/http/bounded-multi-file";

const MAX_MULTIPART_OVERHEAD = 512 * 1024;
const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
const supportedImages = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export type PantryAnalysisResponse = {
  body: unknown;
  records?: number;
  status: number;
};

function visionModel() {
  return process.env.OPENAI_VISION_MODEL || "gpt-5";
}

export async function analysePantryRequest(request: Request): Promise<PantryAnalysisResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return { body: { error: "Kitchen photo reading is not configured yet." }, status: 503 };
  }
  let files;
  try {
    files = await readBoundedMultiFile(request, {
      fieldName: "files",
      maximumFileBytes: MAX_PANTRY_PHOTO_BYTES,
      maximumFiles: MAX_PANTRY_PHOTO_COUNT,
      maximumTotalBytes: MAX_PANTRY_TOTAL_PHOTO_BYTES,
      maximumTransportBytes: MAX_PANTRY_TOTAL_PHOTO_BYTES + MAX_MULTIPART_OVERHEAD,
    });
  } catch (error) {
    return { body: { error: "Choose up to eight kitchen photos totalling no more than 16 MB." },
      status: error instanceof RequestBodyError ? error.status : 400 };
  }
  const inspected = files.map((file) => ({ file,
    inspection: inspectCaptureFile({ bytes: file.bytes, declaredMimeType: file.mimeType }) }));
  if (inspected.some(({ inspection }) => !inspection.ok
    || !supportedImages.has(inspection.detectedMimeType))) {
    return { body: { error: "Only valid JPEG, PNG, WebP or HEIC kitchen photos can be analysed." },
      status: 415 };
  }
  const imageUrls = inspected.map(({ file, inspection }) =>
    `data:${inspection.ok ? inspection.detectedMimeType : "image/jpeg"};base64,${Buffer.from(file.bytes).toString("base64")}`);
  const prompt = [
    "You are helping a household organise food in a mobile app called DiaryDock.",
    `Inspect all ${files.length} kitchen photo${files.length === 1 ? "" : "s"} together.`,
    "Identify visible food and drink from the fridge, freezer, cupboards, worktops, or pantry.",
    "Use simple British English ingredient names and combine duplicates.",
    "Do not claim an ingredient is present unless it is visible or clearly labelled.",
    "Confidence must reflect visual certainty. The user will confirm the list.",
    "Suggest exactly four practical family meals that use as many visible ingredients as possible.",
    "For each meal, separate visible ingredients from ingredients that would need buying.",
    "Treat salt, pepper, cooking oil, and water as staples and omit them from missingIngredients.",
    "Keep meal summaries short, friendly, and specific. Keep missing items concise and deduplicated.",
  ].join(" ");
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.responses.create({
      model: visionModel(),
      input: [{ role: "user", content: [
        { type: "input_text", text: prompt },
        ...imageUrls.map((imageUrl) => ({ type: "input_image" as const,
          image_url: imageUrl, detail: "high" as const })),
      ] }],
      text: { format: { type: "json_schema", name: "diarydock_pantry_analysis",
        schema: pantryAnalysisSchema, strict: true } },
    }, { signal: AbortSignal.timeout(45_000) });
    if (!result.output_text || Buffer.byteLength(result.output_text, "utf8") > MAX_PROVIDER_RESPONSE_BYTES) {
      return { body: { error: "The kitchen photos could not be read." }, status: 502 };
    }
    return { body: { analysis: parsePantryAnalysis(JSON.parse(result.output_text)) },
      records: files.length, status: 200 };
  } catch {
    return { body: { error: "The kitchen photos could not be analysed securely right now." }, status: 502 };
  }
}
