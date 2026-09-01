import { NextResponse } from "next/server";

import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

type StorageSummaryRow = {
  tier: string;
  used_bytes: number;
  reserved_bytes: number;
  storage_limit_bytes: number;
};

export async function GET() {
  if (!isSupabaseConfiguredServer() || !isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Storage information is not configured." }, { status: 503 });
  }
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdminClient().rpc("get_user_storage_summary", {
    input_user_id: authData.user.id,
  });
  const row = (Array.isArray(data) ? data[0] : data) as StorageSummaryRow | null;
  if (error || !row) {
    return NextResponse.json({ error: "Storage information could not be loaded." }, { status: 503 });
  }

  return NextResponse.json({
    tier: row.tier,
    usedBytes: Number(row.used_bytes),
    reservedBytes: Number(row.reserved_bytes),
    limitBytes: Number(row.storage_limit_bytes),
  });
}
