import OpenAI from "openai";
import { NextResponse } from "next/server";

import { checkSharedRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_AUDIO_SIZE = 12 * 1024 * 1024;

const noticeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    detail: { type: "string" },
    category: { type: "string", enum: ["School", "Home", "Health", "Plans"] },
    assignedTo: { type: "string" },
    due: { type: "string" },
    colour: { type: "string", enum: ["cream", "sage", "blue", "clay"] }
  },
  required: ["title", "detail", "category", "assignedTo", "due", "colour"]
} as const;

type ExtractedNotice = {
  title: string;
  detail: string;
  category: "School" | "Home" | "Health" | "Plans";
  assignedTo: string;
  due: string;
  colour: "cream" | "sage" | "blue" | "clay";
};

function getPrompt(sourceText?: string) {
  return [
    "Create one concise family noticeboard note for DiaryDock.",
    sourceText ? `The spoken request was: ${sourceText}` : "Read the photographed letter, card, handwritten note, invitation, appointment slip, or household message.",
    "Extract only information clearly present or directly implied.",
    "The title must be short and practical, no more than 45 characters.",
    "The detail should be one short helpful sentence, no more than 100 characters.",
    "Choose School for education and children, Home for household jobs and errands, Health for appointments and medicine, or Plans for events and family arrangements.",
    "Use Family when no person is named.",
    "Keep due as a short human-friendly date or time such as Today, Friday, 3:30 pm, or This week; leave it empty when none is supplied.",
    "Use blue for School, sage for Home, cream for Health, and clay for Plans.",
    "Never invent names, dates, medical advice, or obligations."
  ].join(" ");
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Smart notice capture is not configured yet." }, { status: 503 });
  }
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "You must be signed in to add a notice." }, { status: 401 });
  }

  const rateLimit = await checkSharedRateLimit(supabase, createRateLimitKey("api:kitchen:noticeboard", user.id), {
    limit: 18,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many smart notice captures. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
      }
    );
  }

  const formData = await request.formData();
  const mode = formData.get("mode");
  const file = formData.get("file");
  if ((mode !== "photo" && mode !== "voice") || !(file instanceof File)) {
    return NextResponse.json({ error: "Please provide a photo or voice note." }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    let sourceText = "";
    let imageUrl = "";

    if (mode === "voice") {
      if (file.size > MAX_AUDIO_SIZE) {
        return NextResponse.json({ error: "Please keep the voice note under 12 MB." }, { status: 400 });
      }
      const transcription = await client.audio.transcriptions.create({
        file,
        model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe"
      });
      sourceText = transcription.text.trim();
      if (!sourceText) {
        return NextResponse.json({ error: "No speech could be heard. Please try again." }, { status: 422 });
      }
    } else {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Please choose a photo." }, { status: 400 });
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "Please keep the photo under 8 MB." }, { status: 400 });
      }
      imageUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-5",
      input: [{
        role: "user",
        content: mode === "photo"
          ? [
              { type: "input_text", text: getPrompt() },
              { type: "input_image", image_url: imageUrl, detail: "high" }
            ]
          : [{ type: "input_text", text: getPrompt(sourceText) }]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "diarydock_notice_extraction",
          schema: noticeSchema,
          strict: true
        }
      }
    });

    if (!response.output_text) {
      return NextResponse.json({ error: "No notice could be prepared from that input." }, { status: 422 });
    }

    const notice = JSON.parse(response.output_text) as ExtractedNotice;
    return NextResponse.json({ notice, transcript: sourceText || undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The notice could not be prepared.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
