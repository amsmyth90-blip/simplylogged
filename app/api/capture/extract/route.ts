import OpenAI from "openai";
import { NextResponse } from "next/server";

import {
  documentExtractionSchema,
  type DocumentExtractionResult
} from "@/lib/document-extraction";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";
import {
  willDocumentAnalysisSchema,
  type WillDocumentAnalysis
} from "@/lib/will-document-analysis";
import {
  billDocumentAnalysisSchema,
  type BillDocumentAnalysis
} from "@/lib/bill-document-analysis";
import { insuranceDocumentAnalysisSchema, type InsuranceDocumentAnalysis } from "@/lib/insurance-document-analysis";
import { receiptDocumentAnalysisSchema, type ReceiptDocumentAnalysis } from "@/lib/receipt-document-analysis";
import { checkSharedRateLimit, createRateLimitKey } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_PAGE_COUNT = 12;

function getVisionModel() {
  return process.env.OPENAI_VISION_MODEL || "gpt-5";
}

function getMimeType(file: File) {
  if (file.type) {
    return file.type;
  }

  return "image/jpeg";
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server yet." },
      { status: 503 }
    );
  }

  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "You must be signed in to use document capture." }, { status: 401 });
  }

  const rateLimit = await checkSharedRateLimit(supabase, createRateLimitKey("api:capture:extract", user.id), {
    limit: 20,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many document scans. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
      }
    );
  }

  const formData = await request.formData();
  const requestedMode = formData.get("analysisMode");
  const analysisMode = requestedMode === "will" || requestedMode === "bill" || requestedMode === "insurance" || requestedMode === "receipt" ? requestedMode : "document";
  const uploadedPages = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  const legacyFile = formData.get("file");
  const files = uploadedPages.length ? uploadedPages : legacyFile instanceof File ? [legacyFile] : [];

  if (!files.length) {
    return NextResponse.json({ error: "Please upload at least one document page." }, { status: 400 });
  }

  if (files.length > MAX_PAGE_COUNT) {
    return NextResponse.json({ error: `Please keep each document to ${MAX_PAGE_COUNT} pages or fewer.` }, { status: 400 });
  }

  if (files.some((file) => file.size > MAX_FILE_SIZE)) {
    return NextResponse.json({ error: "One of the pages is too large. Please keep each page under 8 MB." }, { status: 400 });
  }

  const dataUrls = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      return `data:${getMimeType(file)};base64,${buffer.toString("base64")}`;
    })
  );
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const documentPrompt = [
    "You are extracting structured details from a photographed household document for a mobile app called DiaryDock.",
    `Read all ${files.length} page${files.length === 1 ? "" : "s"} carefully and treat them as one document in page order.`,
    "Return OCR text plus the most useful filing and follow-up metadata for a family organizer.",
    "Choose exactly one suggestedRoom from this estate map: Attic for memories, keepsakes, old letters, and family history; Office for legal, identity, contracts, deeds, finance, and official paperwork; Garage for vehicles, MOT, car insurance, service history, and transport renewals; Bedroom for personal health, medical, GP, prescriptions, and wellbeing; Family Room for school forms, family plans, household lists, and shared schedules; Kitchen for appliance manuals, warranties, food plans, grocery receipts, recipes, kitchen repairs, and household food documents; Garden for pets, vet records, outdoor care, and home maintenance outside; Driveway for travel, parking, guests, access notes, deliveries, and trips; Safe Room for emergency plans, insurance claims, crisis contacts, authority notes, and legacy-critical instructions; Mailbox only when the document is new incoming post that still needs routing.",
    "If a field is uncertain, make the safest reasonable guess.",
    "Look carefully for any expiry, renewal, appointment, MOT, tax, insurance, passport, warranty, school deadline, payment due, review, or service date.",
    "If a date is useful for follow-up, set dueDate and make reminderTitle/timeLabel practical for a household user.",
    "Keep reminderTimeLabel human friendly, for example: Today, This week, In 14 days, Next month.",
    "Keep dueDate empty if no date is visible.",
    "Keep extractedText concise but useful. Include key lines, not every visual detail."
  ].join(" ");

  const willPrompt = [
    "You are reading an uploaded will for DiaryDock, a private household organisation app.",
    `Read all ${files.length} page${files.length === 1 ? "" : "s"} carefully and treat them as one document in page order.`,
    "Create an informational, plain-language index of what is explicitly stated. Do not provide legal advice, decide whether the will is valid, or infer legal meaning that is not written.",
    "Separate detected references into executors, beneficiaries, guardians, specific gifts, charitable gifts, residue of estate, funeral wishes references, conditions or special instructions, and questions or unclear wording.",
    "Use short factual phrases. Keep an array empty when nothing is detected. Put ambiguity, unreadable wording, conflicts or matters needing professional interpretation into questionsOrUnclearWording.",
    "The user must review every result against the original, so do not describe any extracted detail as confirmed.",
    "Keep extractedText concise and limited to key lines needed for review rather than reproducing the entire document."
  ].join(" ");

  const billPrompt = [
    "You are reading a household bill for DiaryDock, a private household organisation app.",
    `Read all ${files.length} page${files.length === 1 ? "" : "s"} carefully and treat them as one bill in page order.`,
    "Extract only information visible in the bill. Never invent a date, amount, payment method or contract term.",
    "Use ISO YYYY-MM-DD for dates, or an empty string when no date is visible. Use 0 when no payable amount is visible.",
    "Classify the bill as Utilities, Council tax, Communications, Subscriptions, Home services or Other.",
    "Mask account numbers so that only the final four characters are shown. Never return bank account or card details.",
    "Frequency must be monthly, quarterly, annual or one-off. Use one-off if the document does not make a recurring frequency clear.",
    "Add any uncertainty or field the user should verify to reviewReasons. The user must review everything before it is saved as confirmed.",
    "Keep extractedText to the key lines needed for review and do not reproduce unrelated personal information."
  ].join(" ");

  const insurancePrompt = [
    "You are reading an insurance policy document for DiaryDock, a private household organisation app.",
    `Read all ${files.length} page${files.length === 1 ? "" : "s"} in order and extract only information explicitly visible.`,
    "This Office section accepts Home, Life, Income protection, Critical illness and Other personal protection policies only. Do not classify vehicle, pet, travel or medical insurance into this Office section.",
    "Use ISO YYYY-MM-DD dates or an empty string. Use 0 when a premium or excess is not visible.",
    "Mask policy numbers so only the final four characters remain visible. Do not return bank, card or login details.",
    "Summarise cover in simple neutral language without interpreting legal effect or advising whether the cover is suitable.",
    "Separate clearly included and excluded cover. Do not infer an exclusion or inclusion that is not stated.",
    "Add uncertainty and every important detail the user should verify to reviewReasons. The result is never confirmed until the user checks it against the original."
  ].join(" ");

  const receiptPrompt = [
    "You are reading a vehicle receipt for DiaryDock, a private household organisation app.",
    `Read all ${files.length} page${files.length === 1 ? "" : "s"} in order and extract only information explicitly visible.`,
    "Use ISO YYYY-MM-DD for the transaction date, or an empty string when it is not visible. Use 0 when the total paid is unclear.",
    "Classify the receipt as Fuel, Service, Repair, Tax, Insurance, Breakdown, Tyres, Parking or Other.",
    "Mileage must be an integer only when it is printed or handwritten clearly on the receipt; otherwise return null.",
    "Payment method may describe cash, card or another visible method, but must never include card or bank numbers.",
    "Return the receipt or invoice number only when visible. Do not return customer addresses, card numbers or unrelated personal information.",
    "Add every uncertain, unreadable or inferred field to reviewReasons. The result is a suggestion until the user checks it against the original.",
  ].join(" ");

  try {
    const response = await client.responses.create({
      model: getVisionModel(),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: analysisMode === "will" ? willPrompt : analysisMode === "bill" ? billPrompt : analysisMode === "insurance" ? insurancePrompt : analysisMode === "receipt" ? receiptPrompt : documentPrompt
            },
            ...dataUrls.map((imageUrl) => ({
              type: "input_image" as const,
              image_url: imageUrl,
              detail: "high" as const
            }))
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: analysisMode === "will" ? "diarydock_will_document_analysis" : analysisMode === "bill" ? "diarydock_bill_document_analysis" : analysisMode === "insurance" ? "diarydock_insurance_document_analysis" : analysisMode === "receipt" ? "diarydock_vehicle_receipt_analysis" : "lifedock_document_extraction",
          schema: analysisMode === "will" ? willDocumentAnalysisSchema : analysisMode === "bill" ? billDocumentAnalysisSchema : analysisMode === "insurance" ? insuranceDocumentAnalysisSchema : analysisMode === "receipt" ? receiptDocumentAnalysisSchema : documentExtractionSchema,
          strict: true
        }
      }
    });

    const outputText = response.output_text;
    if (!outputText) {
      return NextResponse.json({ error: "The vision model did not return extractable text." }, { status: 502 });
    }

    if (analysisMode === "will") {
      return NextResponse.json({ willAnalysis: JSON.parse(outputText) as WillDocumentAnalysis });
    }

    if (analysisMode === "bill") {
      return NextResponse.json({ billAnalysis: JSON.parse(outputText) as BillDocumentAnalysis });
    }

    if (analysisMode === "insurance") {
      return NextResponse.json({ insuranceAnalysis: JSON.parse(outputText) as InsuranceDocumentAnalysis });
    }

    if (analysisMode === "receipt") {
      return NextResponse.json({ receiptAnalysis: JSON.parse(outputText) as ReceiptDocumentAnalysis });
    }

    return NextResponse.json({ extraction: JSON.parse(outputText) as DocumentExtractionResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze the document right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
