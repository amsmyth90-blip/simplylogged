import { NextResponse } from "next/server";

import { hasRecentAuthentication } from "@/lib/auth/recent-auth";
import { createEmergencyInviteToken, emergencyInvitePath } from "@/lib/emergency-access";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const resourceTypes = ["DOCUMENT", "INSTRUCTION", "CONTACT", "HOME_INFO"] as const;
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => typeof value === "object" && value !== null ? value as RecordValue : {};
const rows = (value: unknown) => Array.isArray(value) ? value.map(record) : [];
const clean = (value: unknown, maximum = 180) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

async function authClient() {
  if (!isSupabaseConfiguredServer()) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, user: data.user };
}

export async function GET() {
  const auth = await authClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to manage emergency access." }, { status: 401, headers: privateHeaders });
  const [contactsResult, documentsResult, stateResult, receivedResult, notificationsResult] = await Promise.all([
    auth.supabase.from("trusted_emergency_contacts").select("id, name, email, relation, status, expires_at, accepted_at, created_at, emergency_access_grants(id, resource_type, resource_id, label, granted_at, revoked_at)").eq("owner_id", auth.user.id).order("created_at", { ascending: false }),
    auth.supabase.from("documents").select("id, title, category, room_name").eq("user_id", auth.user.id).eq("emergency_visible", true).order("updated_at", { ascending: false }).limit(100),
    auth.supabase.from("app_state").select("payload").eq("id", auth.user.id).maybeSingle(),
    auth.supabase.from("emergency_access_grants").select("id, owner_id, resource_type, label, snapshot, granted_at, trusted_emergency_contacts!inner(name, relation, status)").neq("owner_id", auth.user.id).is("revoked_at", null).order("granted_at", { ascending: false }),
    auth.supabase.from("emergency_access_notifications").select("id, event_type, label, created_at").or(`owner_id.eq.${auth.user.id},recipient_user_id.eq.${auth.user.id}`).order("created_at", { ascending: false }).limit(20)
  ]);
  if (contactsResult.error || documentsResult.error || stateResult.error || receivedResult.error || notificationsResult.error) return NextResponse.json({ error: "Emergency access could not be loaded safely." }, { status: 500, headers: privateHeaders });

  const state = record(stateResult.data?.payload);
  const resources = [
    ...(documentsResult.data ?? []).map((item) => ({ type: "DOCUMENT", id: String(item.id), label: String(item.title || "Emergency document"), detail: [item.category, item.room_name].filter(Boolean).join(" · ") })),
    ...rows(state.emergencyPlans).map((item) => ({ type: "INSTRUCTION", id: clean(item.id), label: clean(item.title), detail: clean(item.summary) })).filter((item) => item.id && item.label),
    ...rows(state.emergencyContacts).map((item) => ({ type: "CONTACT", id: clean(item.id), label: clean(item.name), detail: clean(item.relation) })).filter((item) => item.id && item.label),
    ...rows(state.homeInfo).map((item) => ({ type: "HOME_INFO", id: clean(item.label), label: clean(item.label), detail: "Home information" })).filter((item) => item.id)
  ];
  return NextResponse.json({ contacts: contactsResult.data ?? [], resources, received: receivedResult.data ?? [], notifications: notificationsResult.data ?? [] }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  const auth = await authClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to change emergency access." }, { status: 401, headers: privateHeaders });
  const length = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(length) && length > 8_192) return NextResponse.json({ error: "That request is too large." }, { status: 413, headers: privateHeaders });
  const body = await request.json().catch((): RecordValue => ({}));
  const operation = clean(body.operation, 40);
  if (!hasRecentAuthentication(auth.user.last_sign_in_at)) return NextResponse.json({ error: "For your security, please sign in again before changing trusted access.", code: "RECENT_AUTH_REQUIRED" }, { status: 403, headers: privateHeaders });

  if (operation === "CREATE_CONTACT") {
    const name = clean(body.name, 120); const email = clean(body.email, 254).toLowerCase(); const relation = clean(body.relation, 120);
    if (!name || !email.includes("@")) return NextResponse.json({ error: "Add the trusted person's name and email." }, { status: 400, headers: privateHeaders });
    const token = createEmergencyInviteToken();
    const { data, error } = await auth.supabase.rpc("create_trusted_emergency_contact", { input_name: name, input_email: email, input_relation: relation, input_public_id: token.publicId, input_secret_hash: token.secretHash });
    if (error || !data) return NextResponse.json({ error: error?.message || "That trusted person could not be added." }, { status: 400, headers: privateHeaders });
    return NextResponse.json({ contactId: data, invitePath: emergencyInvitePath(token.publicId, token.secret) }, { status: 201, headers: privateHeaders });
  }

  const contactId = clean(body.contactId, 50);
  if (!uuidPattern.test(contactId)) return NextResponse.json({ error: "Choose a valid trusted person." }, { status: 400, headers: privateHeaders });
  if (operation === "REVOKE_CONTACT") {
    const { data, error } = await auth.supabase.rpc("revoke_trusted_emergency_contact", { input_contact_id: contactId });
    if (error || !data) return NextResponse.json({ error: error?.message || "That access could not be revoked." }, { status: 400, headers: privateHeaders });
    return NextResponse.json({ updated: true }, { headers: privateHeaders });
  }
  if (operation === "GRANT" || operation === "REVOKE_GRANT") {
    const resourceType = clean(body.resourceType, 20);
    const resourceId = clean(body.resourceId, 180);
    if (!resourceTypes.includes(resourceType as (typeof resourceTypes)[number]) || !resourceId) return NextResponse.json({ error: "Choose a valid emergency item." }, { status: 400, headers: privateHeaders });
    const { data, error } = await auth.supabase.rpc("set_emergency_access_grant", { input_contact_id: contactId, input_resource_type: resourceType, input_resource_id: resourceId, input_grant: operation === "GRANT" });
    if (error || !data) return NextResponse.json({ error: error?.message || "That emergency item could not be updated." }, { status: 400, headers: privateHeaders });
    return NextResponse.json({ updated: true }, { headers: privateHeaders });
  }
  return NextResponse.json({ error: "That emergency access request was not valid." }, { status: 400, headers: privateHeaders });
}
