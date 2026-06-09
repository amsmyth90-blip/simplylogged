import { NextResponse } from "next/server";
import { analyseDocument, type DocumentAnalysis } from "@/lib/mock-ai";

const maxFileSize = 12 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    documentType: { type: "string" },
    suggestedRoomId: {
      type: "string",
      enum: [
        "bedroom",
        "safe-room",
        "garage",
        "office",
        "family-room",
        "garden",
        "driveway",
        "vault",
      ],
    },
    suggestedRoomName: { type: "string" },
    category: { type: "string" },
    provider: { type: "string" },
    policyNumber: { type: "string" },
    issueDate: { type: "string" },
    expiryDate: { type: "string" },
    reminderDate: { type: "string" },
    confidence: { type: "number" },
    extractedSummary: { type: "string" },
    suggestedReminders: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          dueDate: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["title", "dueDate", "priority"],
      },
    },
  },
  required: [
    "title",
    "documentType",
    "suggestedRoomId",
    "suggestedRoomName",
    "category",
    "provider",
    "policyNumber",
    "issueDate",
    "expiryDate",
    "reminderDate",
    "confidence",
    "extractedSummary",
    "suggestedReminders",
  ],
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: "This file is too large. Please upload a file under 12 MB." },
        { status: 413 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (file.type === "application/pdf") {
      return analysisResponse(analyseDocument(file.name), "mock-fallback");
    }

    if (!imageTypes.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload an image or PDF." },
        { status: 415 },
      );
    }

    if (!apiKey) {
      return analysisResponse(analyseDocument(file.name), "mock-fallback");
    }

    try {
      const analysis = await analyseImageWithOpenAI(file, apiKey);
      return analysisResponse(normalizeAnalysis(analysis, file.name), "real-ai");
    } catch (error) {
      console.error("OpenAI document analysis failed", error);
      return analysisResponse(analyseDocument(file.name), "mock-fallback");
    }
  } catch (error) {
    console.error("Document analysis route failed", error);
    return NextResponse.json(
      { error: "The document could not be analysed. Please try again." },
      { status: 500 },
    );
  }
}

async function analyseImageWithOpenAI(file: File, apiKey: string): Promise<DocumentAnalysis> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Analyse this life admin document image for Simply Logged.",
                "Return only structured JSON matching the supplied schema.",
                "Use ISO dates in YYYY-MM-DD format when dates are visible; otherwise use an empty string.",
                "Room mapping:",
                "- passport, driving licence, birth certificate, medical, qualifications -> bedroom",
                "- will, power of attorney, life insurance, funeral wishes -> safe-room",
                "- car insurance, MOT, vehicle tax, service record, breakdown cover -> garage",
                "- mortgage, pension, investments, bank, finance, contract -> office",
                "- home insurance, utilities, boiler, warranties, property documents -> family-room",
                "- pet insurance, vet record, garden equipment -> garden",
                "- travel insurance, flights, visas, holiday booking -> driveway",
                "- unknown -> vault",
              ].join("\n"),
            },
            {
              type: "input_image",
              image_url: dataUrl,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "document_analysis",
          strict: true,
          schema: analysisSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}`);
  }

  const data = await response.json();
  const text = extractOutputText(data);

  if (!text) {
    throw new Error("OpenAI response did not include JSON text.");
  }

  return JSON.parse(text) as DocumentAnalysis;
}

function extractOutputText(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  const outputText = (data as { output_text?: unknown }).output_text;
  if (typeof outputText === "string") {
    return outputText;
  }

  const output = (data as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return "";
  }

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      if (
        contentItem &&
        typeof contentItem === "object" &&
        typeof (contentItem as { text?: unknown }).text === "string"
      ) {
        return (contentItem as { text: string }).text;
      }
    }
  }

  return "";
}

function normalizeAnalysis(analysis: DocumentAnalysis, fileName: string): DocumentAnalysis {
  const fallback = analyseDocument(fileName);

  return {
    ...fallback,
    ...analysis,
    suggestedRoomId: analysis.suggestedRoomId || fallback.suggestedRoomId,
    suggestedRoomName: analysis.suggestedRoomName || fallback.suggestedRoomName,
    confidence: clampConfidence(analysis.confidence),
    suggestedReminders: Array.isArray(analysis.suggestedReminders)
      ? analysis.suggestedReminders.map((reminder) => ({
          title: reminder.title || "Review document",
          dueDate: reminder.dueDate || analysis.reminderDate || fallback.reminderDate,
          priority: ["low", "medium", "high"].includes(reminder.priority)
            ? reminder.priority
            : "medium",
        }))
      : fallback.suggestedReminders,
  };
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
}

function analysisResponse(analysis: DocumentAnalysis, source: "real-ai" | "mock-fallback") {
  return NextResponse.json(analysis, {
    headers: {
      "x-analysis-source": source,
    },
  });
}
