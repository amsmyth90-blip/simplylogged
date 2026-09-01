import { NextResponse } from "next/server";

import { resourceVisibilities, type ResourceVisibility } from "@/lib/resource-access";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asVisibility(value: unknown): ResourceVisibility {
  return value === "HOUSEHOLD" || value === "SELECTED_MEMBERS" ? value : "PRIVATE";
}

async function authenticatedClient() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function GET(request: Request) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Document sharing is not configured." }, { status: 503 });
  }

  const documentId = new URL(request.url).searchParams.get("documentId")?.trim() ?? "";
  if (!uuidPattern.test(documentId)) {
    return NextResponse.json({ error: "Choose a valid document." }, { status: 400 });
  }

  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again to review sharing." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_document_sharing", {
    target_document_id: documentId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    visibility: asVisibility(row?.visibility),
    selectedUserIds: Array.isArray(row?.selected_user_ids)
      ? row.selected_user_ids.filter((value: unknown): value is string => typeof value === "string")
      : [],
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Document sharing is not configured." }, { status: 503 });
  }

  const body = await request.json().catch((): Record<string, unknown> => ({}));
  const documentId = typeof body.documentId === "string" ? body.documentId.trim() : "";
  const requestedVisibility = typeof body.visibility === "string" ? body.visibility : "";
  if (!uuidPattern.test(documentId) || !resourceVisibilities.includes(requestedVisibility as ResourceVisibility)) {
    return NextResponse.json({ error: "Choose a valid document and sharing option." }, { status: 400 });
  }

  const selectedUserIds = requestedVisibility === "SELECTED_MEMBERS" && Array.isArray(body.selectedUserIds)
    ? [...new Set(body.selectedUserIds.filter(
        (value: unknown): value is string => typeof value === "string" && uuidPattern.test(value),
      ))].slice(0, 100)
    : [];

  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again to change sharing." }, { status: 401 });
  }

  const { error } = await supabase.rpc("set_document_sharing", {
    target_document_id: documentId,
    new_visibility: requestedVisibility,
    selected_user_ids: selectedUserIds,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    visibility: requestedVisibility,
    selectedUserIds,
  });
}
