import "server-only";

import OpenAI from "openai";

import {
  groceryAnalysisSchema,
  MAX_GROCERY_PHOTO_BYTES,
  MAX_GROCERY_PHOTO_COUNT,
  MAX_GROCERY_TOTAL_PHOTO_BYTES,
  parseGroceryAnalysis,
} from "@diarydock/kitchen";

import { inspectCaptureFile } from "@/lib/capture/file-security";
import { RequestBodyError } from "@/lib/http/bounded-body";
import { readBoundedMultiFile } from "@/lib/http/bounded-multi-file";

const MAX_MULTIPART_OVERHEAD = 512 * 1024;
const MAX_PROVIDER_RESPONSE_BYTES = 48 * 1024;
const supportedImages = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export type GroceryAnalysisResponse = {
  body: unknown;
  records?: number;
  status: number;
};

function visionModel() {
  return process.env.OPENAI_VISION_MODEL || "gpt-5";
}

export async function analyseGroceryRequest(request: Request): Promise<GroceryAnalysisResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return { body: { error: "Grocery label reading is not configured yet." }, status: 503 };
  }
  let files;
  try {
    files = await readBoundedMultiFile(request, {
      fieldName: "files",
      maximumFileBytes: MAX_GROCERY_PHOTO_BYTES,
      maximumFiles: MAX_GROCERY_PHOTO_COUNT,
      maximumTotalBytes: MAX_GROCERY_TOTAL_PHOTO_BYTES,
      maximumTransportBytes: MAX_GROCERY_TOTAL_PHOTO_BYTES + MAX_MULTIPART_OVERHEAD,
    });
  } catch (error) {
    return {
      body: { error: "Choose up to eight grocery photos totalling no more than 16 MB." },
      status: error instanceof RequestBodyError ? error.status : 400,
    };
  }
  const inspected = files.map((file) => ({ file,
    inspection: inspectCaptureFile({ bytes: file.bytes, declaredMimeType: file.mimeType }) }));
  if (inspected.some(({ inspection }) => !inspection.ok
    || !supportedImages.has(inspection.detectedMimeType))) {
    return { body: { error: "Only valid JPEG, PNG, WebP or HEIC grocery photos can be analysed." },
      status: 415 };
  }
  const imageUrls = inspected.map(({ file, inspection }) =>
    `data:${inspection.ok ? inspection.detectedMimeType : "image/jpeg"};base64,${Buffer.from(file.bytes).toString("base64")}`);
  const today = new Date().toISOString().slice(0, 10);
  const prompt = [
    "You are reading grocery packaging for a household app called DiaryDock.",
    `Today is ${today}. Inspect all ${files.length} photo${files.length === 1 ? "" : "s"} together.`,
    "Identify each distinct food or drink product whose label is visible.",
    "Read USE BY, BEST BEFORE, or DISPLAY UNTIL dates when clearly visible.",
    "Return dates in YYYY-MM-DD format and interpret British day-month-year ordering.",
    "If a year is omitted, infer only the nearest plausible future date from today's date.",
    "Never invent a date or date type. Use null for both when the label is unclear or absent.",
    "Combine duplicate views of the same product and prefer the clearest visible date.",
    "Use a short everyday British English product name. Confidence must reflect visual certainty.",
    "The user will review every result before anything is saved.",
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
      text: { format: { type: "json_schema", name: "diarydock_grocery_analysis",
        schema: groceryAnalysisSchema, strict: true } },
    }, { signal: AbortSignal.timeout(45_000) });
    if (!result.output_text || Buffer.byteLength(result.output_text, "utf8")
      > MAX_PROVIDER_RESPONSE_BYTES) {
      return { body: { error: "The grocery labels could not be read." }, status: 502 };
    }
    const analysis = parseGroceryAnalysis(JSON.parse(result.output_text));
    return { body: { analysis }, records: files.length, status: 200 };
  } catch {
    return { body: { error: "The grocery labels could not be analysed securely right now." },
      status: 502 };
  }
}
