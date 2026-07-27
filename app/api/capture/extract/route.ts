import OpenAI from "openai";
import { NextResponse } from "next/server";

import {
  documentExtractionSchema,
  type DocumentExtractionResult
} from "@/lib/document-extraction";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

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

  const formData = await request.formData();
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

  const prompt = [
    "You are extracting structured details from a photographed household document for a mobile app called LifeDock.",
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

  try {
    const response = await client.responses.create({
      model: getVisionModel(),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt
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
          name: "lifedock_document_extraction",
          schema: documentExtractionSchema,
          strict: true
        }
      }
    });

    const outputText = response.output_text;
    if (!outputText) {
      return NextResponse.json({ error: "The vision model did not return extractable text." }, { status: 502 });
    }

    const extraction = JSON.parse(outputText) as DocumentExtractionResult;

    return NextResponse.json({ extraction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze the document right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
