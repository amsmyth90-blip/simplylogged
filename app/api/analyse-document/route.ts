import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import {
  analyseDocument,
  documentCategories,
  type DocumentAnalysis,
  type SuggestedReminder,
} from "@/lib/mock-ai";

const maxFileSize = 12 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const roomIds = ["bedroom", "safe-room", "garage", "office", "family-room", "garden", "driveway", "vault"];
type AnalysisSource = "real-ai" | "mock-fallback" | "low-confidence";

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    documentType: { type: "string" },
    suggestedRoomId: { type: "string", enum: roomIds },
    suggestedRoomName: { type: "string" },
    category: { type: "string", enum: documentCategories },
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

    if (!apiKey) {
      return analysisResponse(analyseDocument(file.name), "mock-fallback", "AI unavailable");
    }

    if (file.type === "application/pdf") {
      return analysePdf(file, apiKey);
    }

    if (!imageTypes.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload an image or PDF." },
        { status: 415 },
      );
    }

    try {
      const analysis = await analyseImageWithOpenAI(file, apiKey);
      return analysisResponse(normalizeAnalysis(analysis, file.name, "image"), "real-ai");
    } catch (error) {
      console.warn("OpenAI image analysis failed; using explicit mock fallback", error);
      return analysisResponse(
        lowConfidenceFallback(file.name, "AI unavailable. OpenAI image analysis failed. Please review before saving."),
        "mock-fallback",
        "AI unavailable",
      );
    }
  } catch (error) {
    console.warn("Document analysis route failed", error);
    return NextResponse.json(
      { error: "The document could not be analysed. Please try again." },
      { status: 500 },
    );
  }
}

async function analysePdf(file: File, apiKey: string) {
  let text = "";

  try {
    text = await extractPdfText(file);
  } catch (error) {
    console.warn("PDF text extraction failed", { fileName: file.name, error });
    return analysisResponse(
      lowConfidencePdfResult(
        file.name,
        "PDF text could not be extracted. This PDF appears to be scanned. Please upload a photo/screenshot or enable OCR.",
      ),
      "low-confidence",
      "PDF text could not be extracted",
    );
  }

  if (!hasUsefulText(text)) {
    console.warn("PDF text extraction returned too little text", {
      fileName: file.name,
      textLength: text.length,
    });
    return analysisResponse(
      lowConfidencePdfResult(
        file.name,
        "PDF text could not be extracted. This PDF appears to be scanned. Please upload a photo/screenshot or enable OCR.",
      ),
      "low-confidence",
      "PDF text could not be extracted",
    );
  }

  try {
    const analysis = await analyseTextWithOpenAI(text, file.name, apiKey);
    return analysisResponse(normalizeAnalysis(analysis, file.name, "pdf-text"), "real-ai");
  } catch (error) {
    console.warn("OpenAI PDF text analysis failed; returning explicit low-confidence result", {
      fileName: file.name,
      error,
    });
    return analysisResponse(
      lowConfidencePdfResult(file.name, "AI unavailable. PDF text was extracted, but OpenAI could not analyse it. Please try again."),
      "mock-fallback",
      "AI unavailable",
    );
  }
}

async function extractPdfText(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: bytes });

  try {
    const parsed = await parser.getText();
    return parsed.text.trim().replace(/\s+/g, " ").slice(0, 15000);
  } finally {
    await parser.destroy();
  }
}

async function analyseImageWithOpenAI(file: File, apiKey: string): Promise<DocumentAnalysis> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;

  return requestOpenAIAnalysis(apiKey, [
    {
      type: "input_text",
      text: buildPrompt("image", file.name),
    },
    {
      type: "input_image",
      image_url: dataUrl,
    },
  ]);
}

async function analyseTextWithOpenAI(text: string, fileName: string, apiKey: string): Promise<DocumentAnalysis> {
  return requestOpenAIAnalysis(apiKey, [
    {
      type: "input_text",
      text: `${buildPrompt("pdf-text", fileName)}\n\nExtracted PDF text:\n${text}`,
    },
  ]);
}

async function requestOpenAIAnalysis(
  apiKey: string,
  content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string }>,
): Promise<DocumentAnalysis> {
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
          content,
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

function buildPrompt(mode: "image" | "pdf-text", fileName: string) {
  return [
    "You are analysing a life admin document for Simply Logged, a family vault app.",
    mode === "image"
      ? "Read the visible text in the uploaded image. Do not classify from filename alone."
      : "Classify using the extracted PDF text. Use the filename only as a weak hint if the text is unclear.",
    `Filename: ${fileName}`,
    "Return only JSON matching the schema.",
    "Extract these fields: document title, document_type, category, provider/company, policy/account/serial/reference number, issue date, expiry/renewal/due date, suggested room, one useful reminder, confidence, and a short plain-English summary.",
    "For bank, card, mortgage, or loan statements, extract the bank/provider name, account holder name if visible, masked account number or last 4 digits only, statement period, statement date, and balance if visible. Include those details in the plain-English summary.",
    "Privacy rule: never return a full bank account number. If a bank account number is visible, return only a masked value such as 'ending 1234' or '****1234' in policyNumber.",
    `Category must be one of: ${documentCategories.join(", ")}.`,
    "Classification guidance:",
    "- Insurance: home, car, pet, travel, life, buildings, contents, policy schedule, certificate of insurance.",
    "- Warranty: guarantee, appliance/boiler/product warranty, serial number, coverage period.",
    "- Appliance Manual: instruction manual, user guide, installation guide.",
    "- Utility Bill: energy, gas, electricity, water, council tax, broadband, phone bill.",
    "- Bank Statement: bank statement, current account statement, savings statement, credit card statement, mortgage statement, loan statement.",
    "- Mortgage / Rent: mortgage offer/statement, rent agreement, tenancy, lease.",
    "- Tax: HMRC, self assessment, P60, P45, tax calculation.",
    "- Vehicle: MOT, V5C/log book, vehicle tax, service history, breakdown cover.",
    "- Pet: vet record, vaccination, microchip, pet insurance.",
    "- Medical: NHS, clinic, hospital, prescription, medical record.",
    "- School: school/nursery records, reports, exam or qualification documents.",
    "- Legal: will, power of attorney, solicitor, funeral wishes, contracts.",
    "- ID / Certificate: passport, driving licence, birth/marriage/death certificate.",
    "- Home Maintenance: boiler service, gas safety, repairs, maintenance contracts.",
    "Room mapping:",
    "- bedroom: ID / Certificate, Medical, School, personal records.",
    "- safe-room: Legal, life insurance, power of attorney, funeral wishes.",
    "- garage: Vehicle, car insurance, MOT, vehicle tax, service history.",
    "- office: Bank Statement, Mortgage / Rent, Tax, finance, pension, bank documents.",
    "- family-room: Insurance for home, Utility Bill, Warranty, Appliance Manual, Home Maintenance.",
    "- garden: Pet records, garden/outdoor equipment.",
    "- driveway: travel insurance, flights, visas, holiday bookings.",
    "- vault: Other or unclear documents.",
    "Confidence rules:",
    "- 0.80-1.00 only if title/type/provider and at least one date or reference number are clearly visible.",
    "- 0.50-0.79 if some key fields are visible but classification is partly inferred.",
    "- 0.00-0.49 if mostly guessed, filename-based, or text is unclear.",
    "Use ISO dates in YYYY-MM-DD format when visible. Use empty strings for missing dates/numbers/providers.",
    "If no useful reminder exists, return an empty reminder array and empty reminderDate.",
  ].join("\n");
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

function normalizeAnalysis(analysis: DocumentAnalysis, fileName: string, mode: "image" | "pdf-text"): DocumentAnalysis {
  const fallback = analyseDocument(fileName);
  const category = documentCategories.includes(analysis.category as (typeof documentCategories)[number])
    ? analysis.category
    : fallback.category;
  const reminders = normalizeReminders(analysis.suggestedReminders, analysis.reminderDate);

  const normalized = {
    ...fallback,
    ...analysis,
    category,
    suggestedRoomId: roomIds.includes(analysis.suggestedRoomId) ? analysis.suggestedRoomId : fallback.suggestedRoomId,
    suggestedRoomName: analysis.suggestedRoomName || fallback.suggestedRoomName,
    policyNumber: maskSensitiveReference(analysis.policyNumber),
    confidence: applyConfidenceRules(analysis, mode),
    suggestedReminders: reminders,
  };

  return {
    ...normalized,
    reminderDate: normalized.reminderDate || reminders[0]?.dueDate || "",
  };
}

function normalizeReminders(reminders: SuggestedReminder[], reminderDate: string) {
  if (!Array.isArray(reminders)) {
    return [];
  }

  return reminders
    .filter((reminder) => reminder.title)
    .slice(0, 3)
    .map((reminder) => ({
      title: reminder.title,
      dueDate: reminder.dueDate || reminderDate || "",
      priority: ["low", "medium", "high"].includes(reminder.priority) ? reminder.priority : "medium",
    }));
}

function applyConfidenceRules(analysis: DocumentAnalysis, mode: "image" | "pdf-text") {
  let confidence = clampConfidence(analysis.confidence);
  const hasTitle = hasDetectedValue(analysis.title);
  const hasType = hasDetectedValue(analysis.documentType);
  const hasProvider = hasDetectedValue(analysis.provider);
  const hasDateOrNumber =
    hasDetectedValue(analysis.policyNumber) ||
    hasDetectedValue(analysis.issueDate) ||
    hasDetectedValue(analysis.expiryDate) ||
    hasDetectedValue(analysis.reminderDate);

  if (!(hasTitle && hasType && hasProvider)) {
    confidence = Math.min(confidence, 0.68);
  }

  if (!hasDateOrNumber) {
    confidence = Math.min(confidence, 0.74);
  }

  if (mode === "pdf-text" && confidence > 0.9 && (!hasProvider || !hasDateOrNumber)) {
    confidence = 0.72;
  }

  return confidence;
}

function hasDetectedValue(value: string) {
  return Boolean(value && !/^(unknown|not detected|n\/a|none)$/i.test(value.trim()));
}

function hasUsefulText(text: string) {
  return text.replace(/\s+/g, "").length >= 40;
}

function lowConfidenceFallback(fileName: string, reason: string): DocumentAnalysis {
  const fallback = analyseDocument(fileName);
  return {
    ...fallback,
    confidence: Math.min(fallback.confidence, 0.24),
    extractedSummary: reason,
    suggestedReminders: [],
    reminderDate: "",
  };
}

function lowConfidencePdfResult(fileName: string, reason: string): DocumentAnalysis {
  return {
    title: tidyFileName(fileName),
    documentType: "PDF document",
    suggestedRoomId: "vault",
    suggestedRoomName: "Vault",
    category: "Other",
    provider: "Not detected",
    policyNumber: "Not detected",
    issueDate: "",
    expiryDate: "",
    reminderDate: "",
    confidence: 0.12,
    extractedSummary: reason,
    suggestedReminders: [],
  };
}

function tidyFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function maskSensitiveReference(value: string) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (/^(unknown|not detected|n\/a|none)$/i.test(trimmed)) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 6) {
    return `ending ${digits.slice(-4)}`;
  }

  return trimmed;
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) {
    return 0.35;
  }

  return Math.max(0, Math.min(1, value));
}

function analysisResponse(analysis: DocumentAnalysis, source: AnalysisSource, reason?: string) {
  return NextResponse.json(analysis, {
    headers: {
      "x-analysis-source": source,
      ...(reason ? { "x-analysis-reason": reason } : {}),
    },
  });
}
