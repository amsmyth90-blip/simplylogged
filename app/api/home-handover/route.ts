import { NextResponse } from "next/server";

import { hasRecentAuthentication } from "@/lib/auth/recent-auth";
import { isHandoverAssetCategory, isHandoverDocumentCategory } from "@/lib/home-handover";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authenticatedClient() {
  if (!isSupabaseConfiguredServer()) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, user: data.user };
}

function shortText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export async function GET() {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to open Home Handover." }, { status: 401, headers: privateHeaders });

  const [{ data: packs, error: packError }, { data: assets, error: assetError }] = await Promise.all([
    auth.supabase.from("home_handover_packs").select("id, name, status, created_at, updated_at").eq("owner_id", auth.user.id).eq("status", "DRAFT").order("updated_at", { ascending: false }),
    auth.supabase.from("assets").select("id, name, category, location, manufacturer, model, warranty_due_at, next_service_at, document_ids, handover_eligible").eq("owner_id", auth.user.id).order("created_at", { ascending: false }),
  ]);
  if (packError || assetError) return NextResponse.json({ error: "Home Handover could not be loaded." }, { status: 500, headers: privateHeaders });

  const eligibleAssets = (assets ?? []).filter((asset) => isHandoverAssetCategory(String(asset.category)));
  const linkedDocumentIds = [...new Set(eligibleAssets.flatMap((asset) => Array.isArray(asset.document_ids) ? asset.document_ids.map(String) : []))];
  const documentResult = linkedDocumentIds.length
    ? await auth.supabase.from("documents").select("id, title, category, kind, issuer, handover_eligible").eq("user_id", auth.user.id).in("id", linkedDocumentIds)
    : { data: [], error: null };
  if (documentResult.error) return NextResponse.json({ error: "Eligible property documents could not be loaded." }, { status: 500, headers: privateHeaders });

  const draft = packs?.[0] ?? null;
  const itemResult = draft
    ? await auth.supabase.from("home_handover_items").select("id, pack_id, resource_type, resource_id, preview_snapshot, provenance, added_at").eq("pack_id", draft.id).order("added_at")
    : { data: [], error: null };
  if (itemResult.error) return NextResponse.json({ error: "The handover preview could not be loaded." }, { status: 500, headers: privateHeaders });

  return NextResponse.json({
    draft,
    items: itemResult.data ?? [],
    candidates: [
      ...eligibleAssets.map((asset) => ({ type: "ASSET", id: String(asset.id), label: String(asset.name), detail: [asset.category, asset.location, asset.manufacturer, asset.model].filter(Boolean).join(" · "), eligible: Boolean(asset.handover_eligible) })),
      ...(documentResult.data ?? []).filter((document) => isHandoverDocumentCategory(String(document.category))).map((document) => ({ type: "DOCUMENT", id: String(document.id), label: String(document.title), detail: `${document.category} · Linked to an eligible home item`, eligible: Boolean(document.handover_eligible) })),
    ],
    exclusions: ["Private and unselected files", "Financial records and receipts", "Identity, legal and correspondence records", "Health, travel, pet and insurance records", "Emergency information", "Vault or future encrypted Vault content"],
  }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  const auth = await authenticatedClient();
  if (!auth) return NextResponse.json({ error: "Please sign in again to change Home Handover." }, { status: 401, headers: privateHeaders });
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 4096) return NextResponse.json({ error: "That request is too large." }, { status: 413, headers: privateHeaders });
  if (!hasRecentAuthentication(auth.user.last_sign_in_at)) return NextResponse.json({ error: "For your security, please sign in again before changing a handover draft.", code: "RECENT_AUTH_REQUIRED" }, { status: 403, headers: privateHeaders });

  const body = await request.json().catch((): Record<string, unknown> => ({}));
  const operation = shortText(body.operation, 40);
  if (operation === "CREATE_PACK") {
    const name = shortText(body.name, 120);
    if (!name) return NextResponse.json({ error: "Give this handover draft a name." }, { status: 400, headers: privateHeaders });
    const { data, error } = await auth.supabase.rpc("create_home_handover_pack", { input_name: name });
    if (error || !data) return NextResponse.json({ error: "That handover draft could not be created." }, { status: 400, headers: privateHeaders });
    return NextResponse.json({ packId: data }, { status: 201, headers: privateHeaders });
  }

  if (operation === "SET_ITEM") {
    const packId = shortText(body.packId, 50);
    const resourceType = body.resourceType === "ASSET" || body.resourceType === "DOCUMENT" ? body.resourceType : "";
    const resourceId = shortText(body.resourceId, 160);
    if (!uuidPattern.test(packId) || !resourceType || !resourceId) return NextResponse.json({ error: "Choose a valid handover item." }, { status: 400, headers: privateHeaders });
    const { data, error } = await auth.supabase.rpc("set_home_handover_item", { input_pack_id: packId, input_resource_type: resourceType, input_resource_id: resourceId, input_selected: body.selected === true });
    if (error || !data) return NextResponse.json({ error: "That item is not eligible for this handover draft." }, { status: 400, headers: privateHeaders });
    return NextResponse.json({ updated: true }, { headers: privateHeaders });
  }

  return NextResponse.json({ error: "That Home Handover request was not valid." }, { status: 400, headers: privateHeaders });
}
