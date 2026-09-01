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
import { getCaptureAnalysisProvider } from "@/lib/capture/provider";
import {
  captureScannerIsRequired,
  getCaptureSecurityScanner,
  inspectCaptureFile
} from "@/lib/capture/file-security";
import { checkServerRateLimit, createRateLimitKey } from "@/lib/rate-limit-server";
import { isOwnedStoredDocument, type StoredDocumentReference } from "@/lib/document-upload";
import { MAX_DOCUMENT_BYTES } from "@/lib/document-rules";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const MAX_FILE_SIZE = MAX_DOCUMENT_BYTES;
const MAX_LEGACY_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_PAGE_COUNT = 12;

type AnalysisMode = "document" | "will" | "bill" | "insurance" | "receipt";
type CaptureFile = Pick<File, "size" | "type" | "arrayBuffer">;

function getAnalysisMode(value: unknown): AnalysisMode {
  return value === "will" || value === "bill" || value === "insurance" || value === "receipt"
    ? value
    : "document";
}

function isStoredReference(value: unknown): value is StoredDocumentReference {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.bucket === "string" && typeof record.path === "string";
}

function getVisionModel() {
  return process.env.OPENAI_VISION_MODEL || "gpt-5";
}

export async function POST(request: Request) {
  const provider = getCaptureAnalysisProvider();
  if (!provider) {
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

  const rateLimit = await checkServerRateLimit(createRateLimitKey("api:capture:extract", user.id), {
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

  let analysisMode: AnalysisMode = "document";
  let files: CaptureFile[] = [];
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: "Secure document analysis is not configured." }, { status: 503 });
    }
    const body = await request.json().catch(() => null) as { analysisMode?: unknown; storedFiles?: unknown } | null;
    analysisMode = getAnalysisMode(body?.analysisMode);
    const storedFiles = Array.isArray(body?.storedFiles) ? body.storedFiles.filter(isStoredReference) : [];
    if (!storedFiles.length || storedFiles.length > MAX_PAGE_COUNT || storedFiles.some((file) => !isOwnedStoredDocument(user.id, file))) {
      return NextResponse.json({ error: "The stored document reference is invalid." }, { status: 400 });
    }
    const admin = getSupabaseAdminClient();
    const downloads = await Promise.all(storedFiles.map(async (reference) => {
      const { data, error } = await admin.storage.from(reference.bucket).download(reference.path);
      return error || !data ? null : data;
    }));
    if (downloads.some((file) => !file)) {
      return NextResponse.json({ error: "One of the stored document pages could not be loaded." }, { status: 404 });
    }
    files = downloads.filter((file): file is Blob => Boolean(file));
  } else {
    const formData = await request.formData();
    analysisMode = getAnalysisMode(formData.get("analysisMode"));
    const uploadedPages = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
    const legacyFile = formData.get("file");
    files = uploadedPages.length ? uploadedPages : legacyFile instanceof File ? [legacyFile] : [];
  }

  if (!files.length) {
    return NextResponse.json({ error: "Please upload at least one document page." }, { status: 400 });
  }

  if (files.length > MAX_PAGE_COUNT) {
    return NextResponse.json({ error: `Please keep each document to ${MAX_PAGE_COUNT} pages or fewer.` }, { status: 400 });
  }

  if (files.some((file) => file.size > MAX_FILE_SIZE)) {
    return NextResponse.json({ error: "One of the pages is too large. Please keep each page under 4 MB." }, { status: 400 });
  }

  if (!contentType.includes("application/json") && files.reduce((total, file) => total + file.size, 0) > MAX_LEGACY_REQUEST_BYTES) {
    return NextResponse.json({ error: "Please keep the combined document pages under 4 MB." }, { status: 400 });
  }

  const inspectedFiles = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const inspection = inspectCaptureFile({ declaredMimeType: file.type, bytes: buffer });
      return { buffer, inspection };
    })
  );
  const invalidFile = inspectedFiles.find((entry) => !entry.inspection.ok);
  if (invalidFile && !invalidFile.inspection.ok) {
    return NextResponse.json({ error: invalidFile.inspection.error }, { status: 400 });
  }

  const safeFiles = inspectedFiles.map((entry) => ({
    bytes: entry.buffer,
    mimeType: entry.inspection.ok ? entry.inspection.detectedMimeType : "application/octet-stream"
  }));
  const scanResult = await getCaptureSecurityScanner().scan(safeFiles);
  if (scanResult.status === "BLOCKED" || (captureScannerIsRequired() && scanResult.status !== "PASSED")) {
    return NextResponse.json(
      { error: "This document could not pass the configured security check." },
      { status: 422 }
    );
  }

  const captureJobId = crypto.randomUUID();
  const { error: jobError } = await supabase.from("capture_jobs").insert({
    id: captureJobId,
    user_id: user.id,
    status: "EXTRACTING",
    analysis_mode: analysisMode,
    page_count: files.length,
    detected_mime_types: safeFiles.map((file) => file.mimeType),
    security_scan_status: scanResult.status,
    scanner_name: scanResult.scanner,
    provider_name: provider.name
  });
  if (jobError) {
    return NextResponse.json({ error: "DiaryDock could not start a secure capture job." }, { status: 503 });
  }

  const dataUrls = safeFiles.map(
    (file) => `data:${file.mimeType};base64,${Buffer.from(file.bytes).toString("base64")}`
  );
  const documentPrompt = [
    "You are extracting structured details from a photographed household document for a mobile app called DiaryDock.",
    `Read all ${files.length} page${files.length === 1 ? "" : "s"} carefully and treat them as one document in page order.`,
    "Return OCR text plus the most useful filing and follow-up metadata for a family organizer.",
    "Choose exactly one suggestedRoom from this estate map: Attic for memories, keepsakes, old letters, and family history; Office for legal, identity, contracts, deeds, finance, and official paperwork; Garage for vehicles, MOT, car insurance, service history, and transport renewals; Bedroom for personal health, medical, GP, prescriptions, and wellbeing; Family Room for school forms, family plans, household lists, and shared schedules; Kitchen for appliance manuals, warranties, food plans, grocery receipts, recipes, kitchen repairs, and household food documents; Garden for pets, vet records, outdoor care, and home maintenance outside; Driveway for travel, parking, guests, access notes, deliveries, and trips; Safe Room for emergency plans, insurance claims, crisis contacts, authority notes, and legacy-critical instructions; Mailbox only when the document is new incoming post that still needs routing.",
    "If a field is uncertain, make the safest reasonable guess.",
    "Look carefully for any expiry, renewal, appointment, MOT, tax, insurance, passport, warranty, school deadline, payment due, review, or service date.",
    "Use ISO YYYY-MM-DD for dueDate when a complete date is visible. Keep dueDate empty rather than guessing when it is absent or incomplete.",
    "If a date is useful for follow-up, set dueDate and make reminderTitle/timeLabel practical for a household user.",
    "Keep reminderTimeLabel human friendly, for example: Today, This week, In 14 days, Next month.",
    "Keep dueDate empty if no date is visible.",
    "Keep extractedText concise but useful. Include key lines, not every visual detail.",
    "Return extractedFields for useful structured values visible in the document. Use stable snake_case keys. For MOT documents prefer registration, test_date, mot_expiry, mileage and result. For appliance receipts or warranties prefer product, manufacturer, model, serial_number, purchase_date, retailer, price, warranty_duration and warranty_expiry. For pet vaccination records prefer pet_name, vaccine, vaccination_date, next_due_date, vet and batch_number. Each field must retain its own confidence, source uploaded_document and userConfirmed false. Do not include a field when its value is absent."
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
    const prompt =
      analysisMode === "will"
        ? willPrompt
        : analysisMode === "bill"
          ? billPrompt
          : analysisMode === "insurance"
            ? insurancePrompt
            : analysisMode === "receipt"
              ? receiptPrompt
              : documentPrompt;
    const schema =
      analysisMode === "will"
        ? willDocumentAnalysisSchema
        : analysisMode === "bill"
          ? billDocumentAnalysisSchema
          : analysisMode === "insurance"
            ? insuranceDocumentAnalysisSchema
            : analysisMode === "receipt"
              ? receiptDocumentAnalysisSchema
              : documentExtractionSchema;
    const schemaName =
      analysisMode === "will"
        ? "diarydock_will_document_analysis"
        : analysisMode === "bill"
          ? "diarydock_bill_document_analysis"
          : analysisMode === "insurance"
            ? "diarydock_insurance_document_analysis"
            : analysisMode === "receipt"
              ? "diarydock_vehicle_receipt_analysis"
              : "diarydock_document_extraction";

    const completeJob = async (result: Record<string, unknown>) => {
      const proposedFields = {
        title: typeof result.title === "string" ? result.title : undefined,
        category: typeof result.category === "string" ? result.category : undefined,
        suggestedRoom: typeof result.suggestedRoom === "string" ? result.suggestedRoom : undefined,
        detectedDocumentType:
          typeof result.detectedDocumentType === "string" ? result.detectedDocumentType : undefined,
        dueDate: typeof result.dueDate === "string" ? result.dueDate : undefined,
        confidence: typeof result.confidence === "number" ? result.confidence : undefined,
        source: "uploaded_document",
        userConfirmed: false,
        extractedFields: Array.isArray(result.extractedFields) ? result.extractedFields : []
      };
      await supabase
        .from("capture_jobs")
        .update({ status: "NEEDS_REVIEW", proposed_fields: proposedFields })
        .eq("id", captureJobId);
    };

    if (analysisMode === "will") {
      const willAnalysis = await provider.analyse<WillDocumentAnalysis>({
        model: getVisionModel(),
        prompt,
        pages: dataUrls.map((imageUrl) => ({ imageUrl, detail: "high" })),
        schemaName,
        schema
      });
      await completeJob(willAnalysis as unknown as Record<string, unknown>);
      return NextResponse.json({
        captureJobId,
        willAnalysis
      });
    }

    if (analysisMode === "bill") {
      const billAnalysis = await provider.analyse<BillDocumentAnalysis>({ model: getVisionModel(), prompt, pages: dataUrls.map((imageUrl) => ({ imageUrl, detail: "high" })), schemaName, schema });
      await completeJob(billAnalysis as unknown as Record<string, unknown>);
      return NextResponse.json({ captureJobId, billAnalysis });
    }

    if (analysisMode === "insurance") {
      const insuranceAnalysis = await provider.analyse<InsuranceDocumentAnalysis>({ model: getVisionModel(), prompt, pages: dataUrls.map((imageUrl) => ({ imageUrl, detail: "high" })), schemaName, schema });
      await completeJob(insuranceAnalysis as unknown as Record<string, unknown>);
      return NextResponse.json({ captureJobId, insuranceAnalysis });
    }

    if (analysisMode === "receipt") {
      const receiptAnalysis = await provider.analyse<ReceiptDocumentAnalysis>({ model: getVisionModel(), prompt, pages: dataUrls.map((imageUrl) => ({ imageUrl, detail: "high" })), schemaName, schema });
      await completeJob(receiptAnalysis as unknown as Record<string, unknown>);
      return NextResponse.json({ captureJobId, receiptAnalysis });
    }

    const extraction = await provider.analyse<DocumentExtractionResult>({ model: getVisionModel(), prompt, pages: dataUrls.map((imageUrl) => ({ imageUrl, detail: "high" })), schemaName, schema });
    await completeJob(extraction as unknown as Record<string, unknown>);
    return NextResponse.json({ captureJobId, extraction });
  } catch (error) {
    await supabase
      .from("capture_jobs")
      .update({ status: "FAILED", failure_code: "PROVIDER_FAILURE" })
      .eq("id", captureJobId);
    const message = error instanceof Error ? error.message : "Unable to analyze the document right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
