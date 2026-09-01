import { NextResponse } from "next/server";

import { evaluateGuardianSources, type GuardianSource } from "@/lib/guardian/rules";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type FindingRow = {
  id: string;
  dedupe_key: string;
  type: string;
  severity: "INFO" | "ATTENTION" | "IMPORTANT" | "URGENT";
  resource_type: string;
  resource_id: string;
  title: string;
  description: string;
  due_at: string | null;
  status: "ACTIVE" | "SNOOZED" | "DISMISSED" | "RESOLVED";
  snoozed_until: string | null;
  detected_at: string;
};

async function authenticatedClient() {
  if (!isSupabaseConfiguredServer()) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, user: data.user };
}

function toResponseFinding(row: FindingRow) {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
    status: row.status,
    snoozedUntil: row.snoozed_until,
    detectedAt: row.detected_at
  };
}

async function reconcile(auth: NonNullable<Awaited<ReturnType<typeof authenticatedClient>>>) {
  const now = new Date();
  const nowIso = now.toISOString();
  const { data: reminderRows, error: reminderError } = await auth.supabase
    .from("reminders")
    .select("source_resource_type, source_resource_id, source_date_key, reminder_type, title, source_due_at, time_zone")
    .eq("user_id", auth.user.id)
    .eq("origin", "SYSTEM_GENERATED")
    .not("source_resource_type", "is", null)
    .not("source_resource_id", "is", null)
    .not("source_date_key", "is", null)
    .not("source_due_at", "is", null);
  if (reminderError) throw new Error("SOURCE_READ_FAILED");

  const sources = (reminderRows ?? []).flatMap((row): GuardianSource[] => {
    if (!row.source_resource_type || !row.source_resource_id || !row.source_date_key || !row.source_due_at) return [];
    return [{
      resourceType: String(row.source_resource_type),
      resourceId: String(row.source_resource_id),
      dateKey: String(row.source_date_key),
      reminderType: String(row.reminder_type || row.source_date_key),
      title: String(row.title || "Date to check"),
      dueAt: String(row.source_due_at),
      timeZone: String(row.time_zone || "Europe/London")
    }];
  });
  const candidates = evaluateGuardianSources(sources, now);

  const { data: membership } = await auth.supabase
    .from("household_memberships")
    .select("household_id")
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const householdId = membership?.household_id ? String(membership.household_id) : null;

  const { data: existingRows, error: existingError } = await auth.supabase
    .from("guardian_findings")
    .select("id, dedupe_key, status, snoozed_until")
    .eq("user_id", auth.user.id);
  if (existingError) throw new Error("FINDING_READ_FAILED");

  const existing = new Map((existingRows ?? []).map((row) => [String(row.dedupe_key), row]));
  const activeKeys = new Set(candidates.map((candidate) => candidate.dedupeKey));
  const rowsToUpsert = candidates.flatMap((candidate) => {
    const prior = existing.get(candidate.dedupeKey);
    if (prior?.status === "DISMISSED" || prior?.status === "RESOLVED") return [];
    if (prior?.status === "SNOOZED" && prior.snoozed_until && Date.parse(String(prior.snoozed_until)) > now.getTime()) return [];
    return [{
      user_id: auth.user.id,
      household_id: householdId,
      dedupe_key: candidate.dedupeKey,
      type: candidate.type,
      severity: candidate.severity,
      resource_type: candidate.resourceType,
      resource_id: candidate.resourceId,
      title: candidate.title,
      description: candidate.description,
      due_at: candidate.dueAt,
      status: "ACTIVE",
      snoozed_until: null,
      resolved_at: null,
      rule_version: candidate.ruleVersion
    }];
  });
  if (rowsToUpsert.length) {
    const { error } = await auth.supabase.from("guardian_findings").upsert(rowsToUpsert, { onConflict: "user_id,dedupe_key" });
    if (error) throw new Error("FINDING_WRITE_FAILED");
  }

  const staleIds = (existingRows ?? [])
    .filter((row) => row.status === "ACTIVE" && !activeKeys.has(String(row.dedupe_key)))
    .map((row) => String(row.id));
  if (staleIds.length) {
    const { error } = await auth.supabase
      .from("guardian_findings")
      .update({ status: "RESOLVED", resolved_at: nowIso })
      .eq("user_id", auth.user.id)
      .in("id", staleIds);
    if (error) throw new Error("FINDING_RECONCILE_FAILED");
  }
}

export async function GET() {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to open Guardian." }, { status: 401 });
  try {
    await reconcile(auth);
    const { data, error } = await auth.supabase
      .from("guardian_findings")
      .select("id, dedupe_key, type, severity, resource_type, resource_id, title, description, due_at, status, snoozed_until, detected_at")
      .eq("user_id", auth.user.id)
      .eq("status", "ACTIVE")
      .order("due_at", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return NextResponse.json({ findings: ((data ?? []) as FindingRow[]).map(toResponseFinding) });
  } catch {
    return NextResponse.json({ error: "Guardian could not refresh your briefing just now." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to update Guardian." }, { status: 401 });
  const body = await request.json().catch((): Record<string, unknown> => ({}));
  const findingId = typeof body.findingId === "string" ? body.findingId : "";
  const decision = body.decision === "dismiss" || body.decision === "resolve" || body.decision === "snooze" ? body.decision : null;
  if (!uuidPattern.test(findingId) || !decision) {
    return NextResponse.json({ error: "That Guardian choice was not valid." }, { status: 400 });
  }

  const now = new Date();
  const updates = decision === "dismiss"
    ? { status: "DISMISSED", dismissed_at: now.toISOString(), snoozed_until: null }
    : decision === "resolve"
      ? { status: "RESOLVED", resolved_at: now.toISOString(), snoozed_until: null }
      : { status: "SNOOZED", snoozed_until: new Date(now.getTime() + 7 * 86_400_000).toISOString() };
  const { data, error } = await auth.supabase
    .from("guardian_findings")
    .update(updates)
    .eq("id", findingId)
    .eq("user_id", auth.user.id)
    .eq("status", "ACTIVE")
    .select("id, status")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "That Guardian item could not be updated." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "That Guardian item is no longer waiting." }, { status: 409 });
  try { await auth.supabase.rpc("record_product_analytics_event", { input_event_name: "first_guardian_action", input_properties: { action: decision.toUpperCase() } }); } catch { /* Analytics never blocks a Guardian choice. */ }
  return NextResponse.json({ finding: data });
}
