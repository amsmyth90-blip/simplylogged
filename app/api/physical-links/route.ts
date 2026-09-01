import { NextResponse } from "next/server";

import { createPhysicalLinkToken, physicalLinkPath } from "@/lib/physical-links";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assetCategories = ["APPLIANCE", "BOILER", "EQUIPMENT", "OTHER"] as const;
const managementActions = ["RENAME", "DISABLE", "ENABLE", "REVOKE", "REASSIGN"] as const;

async function authenticatedClient() {
  if (!isSupabaseConfiguredServer()) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, user: data.user };
}

function shortText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function optionalDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value.includes("T") ? value : `${value}T09:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function maskedSerial(value: unknown) {
  const clean = shortText(value, 100).replace(/[^A-Za-z0-9]/g, "");
  return clean ? `•••• ${clean.slice(-4)}` : "";
}

export async function GET() {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to open Physical Links." }, { status: 401 });
  const [{ data: assets, error: assetError }, { data: links, error: linkError }] = await Promise.all([
    auth.supabase.from("assets").select("id, name, category, location, manufacturer, model, serial_number_masked, warranty_due_at, next_service_at, document_ids, service_history, maintenance_notes, visibility, created_at").eq("owner_id", auth.user.id).order("created_at", { ascending: false }),
    auth.supabase.from("physical_links").select("id, name, resource_id, status, replacement_of, replaced_by, expires_at, last_used_at, use_count, created_at").eq("owner_id", auth.user.id).order("created_at", { ascending: false })
  ]);
  if (assetError || linkError) return NextResponse.json({ error: "Physical Links could not be loaded." }, { status: 500 });
  return NextResponse.json({ assets: assets ?? [], links: links ?? [] });
}

export async function POST(request: Request) {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to manage Physical Links." }, { status: 401 });
  const body = await request.json().catch((): Record<string, unknown> => ({}));
  const operation = typeof body.operation === "string" ? body.operation : "";

  if (operation === "CREATE_ASSET") {
    const name = shortText(body.name, 120);
    const category = assetCategories.includes(body.category as (typeof assetCategories)[number]) ? body.category : "APPLIANCE";
    if (!name) return NextResponse.json({ error: "Give this item a name." }, { status: 400 });
    const { data: membership } = await auth.supabase.from("household_memberships").select("household_id").eq("user_id", auth.user.id).eq("status", "active").limit(1).maybeSingle();
    const { data, error } = await auth.supabase.from("assets").insert({
      owner_id: auth.user.id,
      household_id: membership?.household_id ?? null,
      name,
      category,
      location: shortText(body.location, 120),
      manufacturer: shortText(body.manufacturer, 120),
      model: shortText(body.model, 120),
      serial_number_masked: maskedSerial(body.serialNumber),
      warranty_due_at: optionalDate(body.warrantyDueAt),
      next_service_at: optionalDate(body.nextServiceAt),
      maintenance_notes: shortText(body.maintenanceNotes, 1000)
    }).select("id, name, category, location, manufacturer, model, serial_number_masked, warranty_due_at, next_service_at, document_ids, service_history, maintenance_notes, visibility, created_at").single();
    if (error) return NextResponse.json({ error: "That item could not be saved." }, { status: 400 });
    return NextResponse.json({ asset: data }, { status: 201 });
  }

  if (operation === "CREATE_LINK" || operation === "REPLACE_LINK") {
    const assetId = shortText(body.assetId, 50);
    const linkId = shortText(body.linkId, 50);
    if (operation === "CREATE_LINK" && !uuidPattern.test(assetId)) return NextResponse.json({ error: "Choose an item for this link." }, { status: 400 });
    if (operation === "REPLACE_LINK" && !uuidPattern.test(linkId)) return NextResponse.json({ error: "Choose a link to replace." }, { status: 400 });
    const token = createPhysicalLinkToken();
    const result = operation === "CREATE_LINK"
      ? await auth.supabase.rpc("create_asset_physical_link", { input_asset_id: assetId, input_name: shortText(body.name, 120) || "Physical tag", input_public_id: token.publicId, input_secret_hash: token.secretHash, input_expires_at: optionalDate(body.expiresAt) })
      : await auth.supabase.rpc("replace_asset_physical_link", { input_link_id: linkId, input_public_id: token.publicId, input_secret_hash: token.secretHash });
    if (result.error) return NextResponse.json({ error: "That physical link could not be created." }, { status: 400 });
    if (operation === "CREATE_LINK") {
      try { await auth.supabase.rpc("record_product_analytics_event", { input_event_name: "first_nfc_link", input_properties: { resourceType: "ASSET" } }); } catch { /* Analytics never blocks a tag. */ }
    }
    return NextResponse.json({ link: { id: result.data, path: physicalLinkPath(token.publicId, token.secret) } }, { status: 201 });
  }

  if (operation === "MANAGE_LINK") {
    const linkId = shortText(body.linkId, 50);
    const action = managementActions.includes(body.action as (typeof managementActions)[number]) ? body.action : null;
    if (!uuidPattern.test(linkId) || !action) return NextResponse.json({ error: "Choose a valid link action." }, { status: 400 });
    const value = action === "RENAME" ? shortText(body.value, 120) : action === "REASSIGN" ? shortText(body.value, 50) : null;
    const { data, error } = await auth.supabase.rpc("manage_asset_physical_link", { input_link_id: linkId, input_action: action, input_value: value });
    if (error || !data) return NextResponse.json({ error: "That physical link could not be updated." }, { status: 400 });
    return NextResponse.json({ updated: true });
  }

  return NextResponse.json({ error: "That Physical Links request was not valid." }, { status: 400 });
}
