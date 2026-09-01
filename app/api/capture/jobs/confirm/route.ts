import { NextResponse } from "next/server";

import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Please sign in again to confirm this capture." }, { status: 401 });
  }

  let payload: { captureJobId?: unknown; documentId?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "The confirmation request was not valid." }, { status: 400 });
  }

  const captureJobId = typeof payload.captureJobId === "string" ? payload.captureJobId : "";
  const documentId = typeof payload.documentId === "string" ? payload.documentId : "";
  if (!uuidPattern.test(captureJobId) || !uuidPattern.test(documentId)) {
    return NextResponse.json({ error: "The confirmation request was not valid." }, { status: 400 });
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (documentError || !document) {
    return NextResponse.json({ error: "The saved document could not be verified." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("capture_jobs")
    .update({
      status: "CONFIRMED",
      confirmed_document_id: documentId,
      confirmed_at: new Date().toISOString()
    })
    .eq("id", captureJobId)
    .eq("user_id", user.id)
    .eq("status", "NEEDS_REVIEW")
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "DiaryDock could not record this confirmation." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "This capture is no longer waiting for review." }, { status: 409 });
  }

  return NextResponse.json({ confirmed: true });
}
