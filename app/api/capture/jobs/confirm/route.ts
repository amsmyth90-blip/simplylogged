import { NextResponse } from "next/server";

import { buildCaptureActionProposals, type ConfirmedCaptureField } from "@/lib/capture/proposals";
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

  let payload: { captureJobId?: unknown; documentId?: unknown; confirmedFields?: unknown };
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

  const confirmedFields: ConfirmedCaptureField[] = Array.isArray(payload.confirmedFields)
    ? payload.confirmedFields.slice(0, 24).flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const field = entry as Record<string, unknown>;
        const key = typeof field.key === "string" ? field.key.trim().slice(0, 80) : "";
        const label = typeof field.label === "string" ? field.label.trim().slice(0, 120) : "";
        const value = typeof field.value === "string" ? field.value.trim().slice(0, 500) : "";
        const confidence = typeof field.confidence === "number" && Number.isFinite(field.confidence)
          ? Math.max(0, Math.min(1, field.confidence))
          : 0;
        return key && label && value
          ? [{ key, label, value, confidence, source: "uploaded_document" as const, userConfirmed: true }]
          : [];
      })
    : [];

  const { data: captureJob, error: captureJobError } = await supabase
    .from("capture_jobs")
    .select("id, proposed_fields")
    .eq("id", captureJobId)
    .eq("user_id", user.id)
    .eq("status", "NEEDS_REVIEW")
    .maybeSingle();
  if (captureJobError || !captureJob) {
    return NextResponse.json({ error: "This capture is no longer waiting for review." }, { status: 409 });
  }
  const proposedFields = captureJob.proposed_fields && typeof captureJob.proposed_fields === "object"
    ? captureJob.proposed_fields as Record<string, unknown>
    : {};

  const { data, error } = await supabase
    .from("capture_jobs")
    .update({
      status: "CONFIRMED",
      confirmed_document_id: documentId,
      confirmed_at: new Date().toISOString(),
      proposed_fields: { ...proposedFields, extractedFields: confirmedFields, userConfirmed: true }
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

  const proposals = buildCaptureActionProposals({
    captureJobId,
    documentId,
    detectedDocumentType: typeof proposedFields.detectedDocumentType === "string" ? proposedFields.detectedDocumentType : undefined,
    title: typeof proposedFields.title === "string" ? proposedFields.title : undefined,
    suggestedRoom: typeof proposedFields.suggestedRoom === "string" ? proposedFields.suggestedRoom : undefined,
    dueDate: typeof proposedFields.dueDate === "string" ? proposedFields.dueDate : undefined,
    fields: confirmedFields
  });
  if (proposals.length) {
    const { error: proposalError } = await supabase.from("action_requests").upsert(
      proposals.map((proposal) => ({
        user_id: user.id,
        action_type: proposal.actionType,
        risk_level: proposal.riskLevel,
        status: "proposed",
        title: proposal.title,
        summary: proposal.summary,
        reason: "Suggested from details you confirmed in an uploaded document.",
        source_document_id: documentId,
        source_capture_job_id: captureJobId,
        dedupe_key: proposal.dedupeKey,
        proposed_payload: proposal.proposedPayload,
        requires_confirmation: true,
        requested_by: "system"
      })),
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
    );
    if (proposalError) {
      return NextResponse.json({ error: "The document was saved, but its optional suggestions could not be prepared." }, { status: 500 });
    }
  }

  return NextResponse.json({ confirmed: true, proposalCount: proposals.length });
}
