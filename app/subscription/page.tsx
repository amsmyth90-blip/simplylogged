import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { WebSubscriptions } from "@/components/WebSubscriptions";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Plans & storage" };
export default async function SubscriptionPage() {
  const user = await requireUser();
  let storage = null;
  if (isSupabaseAdminConfigured()) {
    const { data, error } = await getSupabaseAdminClient().rpc("get_user_storage_summary", { input_user_id: user.id });
    const row = !error && (Array.isArray(data) ? data[0] : data);
    if (row) storage = { usedBytes: Number(row.used_bytes), limitBytes: Number(row.storage_limit_bytes) };
  }
  return <>
    <section className="py-5 pb-28 lg:pb-10">
      <Link href="/settings" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#486a50]">‹ Settings</Link>
      <h1 className="mb-4 mt-5 text-4xl font-semibold tracking-tight text-[#20352a]">Plans &amp; storage</h1>
      <p className="mb-8 text-base text-[#667068]">Your DiaryDock account, on your phone and on the web.</p>
      <WebSubscriptions storage={storage} />
      {!storage ? <p className="mt-3 text-sm text-[#667068]">Your current storage usage is temporarily unavailable.</p> : null}
    </section><BottomNav />
  </>;
}
