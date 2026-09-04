import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  GUARDIAN_SCHEMA_VERSION,
  evaluateGuardianSources,
  parseGuardianResponse,
  type GuardianDecision,
  type GuardianFinding,
  type GuardianSource,
} from "@diarydock/guardian";

type FindingRow = {
  id: string;
  type: string;
  severity: GuardianFinding["severity"];
  resource_type: string;
  resource_id: string;
  title: string;
  description: string;
  due_at: string;
};

function toFinding(row: FindingRow): GuardianFinding {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
  };
}

async function reconcile(supabase: SupabaseClient, userId: string) {
  const now = new Date();
  const { data: reminderRows, error: reminderError } = await supabase
    .from("reminders")
    .select("source_resource_type,source_resource_id,source_date_key,reminder_type,title,source_due_at,time_zone")
    .eq("origin", "SYSTEM_GENERATED")
    .not("source_resource_type", "is", null)
    .not("source_resource_id", "is", null)
    .not("source_date_key", "is", null)
    .not("source_due_at", "is", null)
    .limit(500);
  if (reminderError) throw new Error("SOURCE_READ_FAILED");
  const sources = (reminderRows ?? []).flatMap((row): GuardianSource[] => {
    if (!row.source_resource_type || !row.source_resource_id
      || !row.source_date_key || !row.source_due_at) return [];
    return [{
      resourceType: String(row.source_resource_type),
      resourceId: String(row.source_resource_id),
      dateKey: String(row.source_date_key),
      reminderType: String(row.reminder_type || row.source_date_key),
      title: String(row.title || "Date to check"),
      dueAt: String(row.source_due_at),
      timeZone: String(row.time_zone || "Europe/London"),
    }];
  });
  const candidates = evaluateGuardianSources(sources, now);
  const { data: membership } = await supabase.from("household_memberships")
    .select("household_id").eq("user_id", userId).eq("status", "active")
    .limit(1).maybeSingle();
  const householdId = membership?.household_id ? String(membership.household_id) : null;
  const { data: existingRows, error: existingError } = await supabase
    .from("guardian_findings").select("id,dedupe_key,status,snoozed_until")
    .eq("user_id", userId).limit(500);
  if (existingError) throw new Error("FINDING_READ_FAILED");
  const existing = new Map((existingRows ?? []).map((row) => [String(row.dedupe_key), row]));
  const activeKeys = new Set(candidates.map((candidate) => candidate.dedupeKey));
  const upserts = candidates.flatMap((candidate) => {
    const prior = existing.get(candidate.dedupeKey);
    if (prior?.status === "DISMISSED" || prior?.status === "RESOLVED") return [];
    if (prior?.status === "SNOOZED" && prior.snoozed_until
      && Date.parse(String(prior.snoozed_until)) > now.getTime()) return [];
    return [{
      user_id: userId,
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
      rule_version: candidate.ruleVersion,
    }];
  });
  if (upserts.length) {
    const { error } = await supabase.from("guardian_findings")
      .upsert(upserts, { onConflict: "user_id,dedupe_key" });
    if (error) throw new Error("FINDING_WRITE_FAILED");
  }
  const staleIds = (existingRows ?? [])
    .filter((row) => row.status === "ACTIVE" && !activeKeys.has(String(row.dedupe_key)))
    .map((row) => String(row.id));
  if (staleIds.length) {
    const { error } = await supabase.from("guardian_findings")
      .update({ status: "RESOLVED", resolved_at: now.toISOString() })
      .eq("user_id", userId).in("id", staleIds);
    if (error) throw new Error("FINDING_RECONCILE_FAILED");
  }
}

export async function loadGuardianBriefing(supabase: SupabaseClient, userId: string) {
  try {
    await reconcile(supabase, userId);
    const { data, error } = await supabase.from("guardian_findings")
      .select("id,type,severity,resource_type,resource_id,title,description,due_at")
      .eq("user_id", userId).eq("status", "ACTIVE")
      .order("due_at", { ascending: true, nullsFirst: false }).limit(100);
    if (error) throw error;
    const response = parseGuardianResponse({
      schemaVersion: GUARDIAN_SCHEMA_VERSION,
      findings: ((data ?? []) as FindingRow[]).map(toFinding),
    });
    return { findings: response.findings, error: null };
  } catch {
    return { findings: [] as GuardianFinding[], error: "UNAVAILABLE" as const };
  }
}

export async function decideGuardianFinding(
  supabase: SupabaseClient,
  userId: string,
  findingId: string,
  decision: GuardianDecision,
) {
  const now = new Date();
  const updates = decision === "dismiss"
    ? { status: "DISMISSED", dismissed_at: now.toISOString(), snoozed_until: null }
    : decision === "resolve"
      ? { status: "RESOLVED", resolved_at: now.toISOString(), snoozed_until: null }
      : { status: "SNOOZED", snoozed_until: new Date(now.getTime() + 7 * 86_400_000).toISOString() };
  const { data, error } = await supabase.from("guardian_findings")
    .update(updates).eq("id", findingId).eq("user_id", userId).eq("status", "ACTIVE")
    .select("id,status").maybeSingle();
  if (error) return "ERROR" as const;
  return data ? "OK" as const : "MISSING" as const;
}
