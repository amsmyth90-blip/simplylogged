import { NextResponse } from "next/server";

import { offsetsForReminderType } from "@/lib/reminder-engine";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authenticatedClient() {
  if (!isSupabaseConfiguredServer()) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, user: data.user };
}

export async function GET() {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to review suggestions." }, { status: 401 });

  const { data, error } = await auth.supabase
    .from("action_requests")
    .select("id, action_type, risk_level, status, title, summary, reason, proposed_payload, source_document_id, created_at")
    .eq("user_id", auth.user.id)
    .in("status", ["proposed", "approved"])
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ error: "Suggestions could not be loaded." }, { status: 500 });
  return NextResponse.json({ proposals: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to review suggestions." }, { status: 401 });
  const body = await request.json().catch((): Record<string, unknown> => ({}));
  const proposalId = typeof body.proposalId === "string" ? body.proposalId : "";
  const decision = body.decision === "approve" || body.decision === "dismiss" ? body.decision : null;
  if (!uuidPattern.test(proposalId) || !decision) {
    return NextResponse.json({ error: "That suggestion decision was not valid." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from("action_requests")
    .select("id, action_type, title, proposed_payload, source_document_id")
    .eq("id", proposalId)
    .eq("user_id", auth.user.id)
    .eq("status", "proposed")
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: "That suggestion could not be opened." }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "That suggestion is no longer waiting for a decision." }, { status: 409 });

  let completed = false;
  if (decision === "approve" && existing.action_type === "create_reminder") {
    const proposed = existing.proposed_payload && typeof existing.proposed_payload === "object"
      ? existing.proposed_payload as Record<string, unknown>
      : {};
    const dueDate = typeof proposed.dueDate === "string" ? proposed.dueDate.trim() : "";
    const resourceType = typeof proposed.resourceType === "string" ? proposed.resourceType.trim() : "";
    const reminderType = typeof proposed.reminderType === "string" ? proposed.reminderType.trim() : "expiry";
    if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(dueDate) || !resourceType || !existing.source_document_id) {
      return NextResponse.json({ error: "This reminder suggestion needs a valid confirmed date and source." }, { status: 422 });
    }
    const sourceDueAt = dueDate.includes("T") ? dueDate : `${dueDate}T09:00:00.000Z`;
    const { error: reminderError } = await auth.supabase.rpc("sync_system_reminders", {
      input_source_resource_type: resourceType,
      input_source_resource_id: `document:${existing.source_document_id}`,
      input_source_date_key: reminderType,
      input_source_due_at: sourceDueAt,
      input_title: existing.title,
      input_note: "Created from details you confirmed in an uploaded document.",
      input_room_id: resourceType === "vehicle" ? "garage" : resourceType === "pet" ? "garden" : "kitchen",
      input_room_name: resourceType === "vehicle" ? "Garage" : resourceType === "pet" ? "Garden" : "Kitchen",
      input_reminder_type: reminderType,
      input_rule_id: `capture-${reminderType}`,
      input_rule_version: 1,
      input_offsets: [...offsetsForReminderType(reminderType)]
    });
    if (reminderError) return NextResponse.json({ error: "The reminder schedule could not be created." }, { status: 500 });
    completed = true;
  }

  const { data, error } = await auth.supabase
    .rpc("finalize_action_request", {
      input_action_request_id: proposalId,
      input_decision: decision,
      input_completed: completed,
    })
    .single();
  if (error) return NextResponse.json({ error: "That suggestion could not be updated." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "That suggestion is no longer waiting for a decision." }, { status: 409 });
  return NextResponse.json({ proposal: data });
}
