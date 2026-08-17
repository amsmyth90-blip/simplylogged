import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UiIcon } from "@/components/UiIcon";
import { processAccountDeletion } from "@/lib/account-deletion";
import { requireAccountDeletionAdmin } from "@/lib/admin-access";
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Account deletion admin"
};

type AccountDeletionRequest = {
  id: string;
  user_id: string;
  user_email: string | null;
  status: "requested" | "processing" | "completed" | "cancelled" | "rejected";
  requested_from: string | null;
  user_agent: string | null;
  request_count: number;
  requested_at: string;
  last_requested_at: string;
  completed_at: string | null;
  admin_note: string | null;
  updated_at: string;
};

type PageProps = {
  searchParams?: Promise<{ processed?: string; error?: string }>;
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusTone(status: AccountDeletionRequest["status"]) {
  if (status === "requested") return "bg-[#fff4d7] text-[#80683d]";
  if (status === "processing") return "bg-[#e9edf5] text-[#435170]";
  if (status === "completed") return "bg-[#dde6d8] text-[#45604d]";
  if (status === "cancelled") return "bg-[#f1eee5] text-[#667068]";
  return "bg-[#f7e4df] text-[#924a40]";
}

async function getDeletionRequests() {
  if (!isSupabaseAdminConfigured()) {
    return { requests: [] as AccountDeletionRequest[], configured: false, error: null as string | null };
  }

  const { data, error } = await getSupabaseAdminClient()
    .from("account_deletion_requests")
    .select(
      "id,user_id,user_email,status,requested_from,user_agent,request_count,requested_at,last_requested_at,completed_at,admin_note,updated_at"
    )
    .order("last_requested_at", { ascending: false });

  if (error) {
    return { requests: [] as AccountDeletionRequest[], configured: true, error: error.message };
  }

  return {
    requests: (data ?? []) as AccountDeletionRequest[],
    configured: true,
    error: null
  };
}

async function processDeletionRequest(formData: FormData) {
  "use server";

  await requireAccountDeletionAdmin();

  if (!isSupabaseAdminConfigured()) {
    redirect("/admin/account-deletion?error=not-configured");
  }

  const requestId = String(formData.get("requestId") ?? "").trim();
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();

  if (!requestId || confirmation !== "DELETE") {
    redirect("/admin/account-deletion?error=confirmation");
  }

  try {
    await processAccountDeletion(getSupabaseAdminClient(), requestId);
    revalidatePath("/admin/account-deletion");
    redirect("/admin/account-deletion?processed=1");
  } catch {
    redirect("/admin/account-deletion?error=processing");
  }
}

export default async function AccountDeletionAdminPage({ searchParams }: PageProps) {
  await requireAccountDeletionAdmin();
  const [query, { requests, configured, error: loadError }] = await Promise.all([
    searchParams ? searchParams : Promise.resolve({ processed: undefined, error: undefined }),
    getDeletionRequests()
  ]);
  const { processed, error } = query;

  const pendingRequests = requests.filter((request) => request.status === "requested" || request.status === "processing");
  const olderRequests = requests.filter((request) => request.status !== "requested" && request.status !== "processing");

  return (
    <main className="min-h-screen bg-[#f5f4ed] px-4 py-6 pb-12 text-[#20352a]">
      <div className="mx-auto w-full max-w-[960px] space-y-5">
        <header className="rounded-[28px] border border-white/80 bg-[#fffdf8]/95 p-5 shadow-[0_24px_55px_-42px_rgba(32,53,42,0.6)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
                DiaryDock internal admin
              </p>
              <h1 className="mt-2 font-serif text-[30px] leading-tight sm:text-4xl">Account deletion requests</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667068]">
                Review verified account deletion requests and process eligible user data from one protected place.
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#20352a]/10 bg-white px-4 text-xs font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
            >
              <UiIcon name="arrow-left" className="h-4 w-4" />
              Settings
            </Link>
          </div>

          <div className="mt-4 rounded-2xl bg-[#eef2e9] px-4 py-3 text-xs leading-5 text-[#48604e]">
            Only emails in <code className="rounded bg-white/70 px-1">ACCOUNT_DELETION_ADMIN_EMAILS</code> can open this
            page. Processing is irreversible and deletes the Supabase Auth user, private app data and stored document
            files linked to that user.
          </div>
        </header>

        {processed ? (
          <p role="status" className="rounded-2xl bg-[#dde6d8] px-4 py-3 text-sm font-semibold text-[#45604d]">
            Account deletion processed. The request may no longer appear because the Auth user and linked request record
            were removed.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-2xl bg-[#f7e4df] px-4 py-3 text-sm font-semibold text-[#924a40]">
            {error === "confirmation"
              ? "Type DELETE before processing a request."
              : error === "not-configured"
                ? "Supabase admin access is not configured."
                : "The deletion could not be processed. Check the request still exists and try again."}
          </p>
        ) : null}

        {!configured ? (
          <section className="rounded-[24px] border border-[#20352a]/[0.07] bg-white/92 p-5 shadow-[0_18px_42px_-34px_rgba(32,53,42,0.6)]">
            <h2 className="font-serif text-2xl">Admin processing is not configured</h2>
            <p className="mt-2 text-sm leading-6 text-[#667068]">
              Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to the server environment before processing requests.
            </p>
          </section>
        ) : null}

        {loadError ? (
          <section className="rounded-[24px] border border-[#b46b60]/20 bg-[#fff7f4] p-5 text-sm text-[#924a40]">
            Could not load deletion requests: {loadError}
          </section>
        ) : null}

        <section className="rounded-[24px] border border-[#20352a]/[0.07] bg-white/92 p-5 shadow-[0_18px_42px_-34px_rgba(32,53,42,0.6)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f8e72]">Pending</p>
              <h2 className="mt-1 font-serif text-2xl">Requests to process</h2>
            </div>
            <span className="rounded-full bg-[#eef2e9] px-3 py-1 text-xs font-semibold text-[#45604d]">
              {pendingRequests.length} pending
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {pendingRequests.length ? (
              pendingRequests.map((request) => (
                <article key={request.id} className="rounded-[20px] border border-[#20352a]/[0.07] bg-[#fffdf8] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#20352a]">
                          {request.user_email || "Email not recorded"}
                        </h3>
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${statusTone(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <dl className="mt-3 grid gap-2 text-xs text-[#667068] sm:grid-cols-2">
                        <div>
                          <dt className="font-semibold text-[#20352a]">Requested</dt>
                          <dd>{formatDate(request.requested_at)}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-[#20352a]">Last requested</dt>
                          <dd>{formatDate(request.last_requested_at)}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-[#20352a]">Request count</dt>
                          <dd>{request.request_count}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-[#20352a]">Source</dt>
                          <dd>{request.requested_from || "Not recorded"}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 break-all rounded-2xl bg-[#f6f5ef] px-3 py-2 text-[11px] text-[#667068]">
                        User ID: {request.user_id}
                      </p>
                    </div>

                    <form action={processDeletionRequest} className="w-full shrink-0 space-y-2 sm:w-64">
                      <input type="hidden" name="requestId" value={request.id} />
                      <label className="block text-[11px] font-semibold text-[#20352a]">
                        Type DELETE to confirm
                        <input
                          name="confirmation"
                          className="mt-1 min-h-11 w-full rounded-[14px] border border-[#20352a]/10 bg-white px-3 text-sm outline-none focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/15"
                          autoComplete="off"
                        />
                      </label>
                      <button
                        type="submit"
                        className="min-h-11 w-full rounded-[14px] bg-[#924a40] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b46b60] focus-visible:ring-offset-2"
                      >
                        Process deletion
                      </button>
                    </form>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[20px] bg-[#f7f5ef] px-5 py-8 text-center">
                <UiIcon name="check" className="mx-auto h-7 w-7 text-[#6f8e72]" />
                <h3 className="mt-3 text-sm font-semibold">No deletion requests waiting</h3>
                <p className="mt-1 text-xs text-[#667068]">When someone requests deletion from Settings, it will appear here.</p>
              </div>
            )}
          </div>
        </section>

        {olderRequests.length ? (
          <section className="rounded-[24px] border border-[#20352a]/[0.07] bg-white/80 p-5">
            <h2 className="font-serif text-2xl">Other request records</h2>
            <div className="mt-4 space-y-2">
              {olderRequests.map((request) => (
                <div key={request.id} className="flex min-h-14 items-center justify-between gap-3 rounded-[16px] bg-[#f7f5ef] px-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{request.user_email || request.user_id}</span>
                    <span className="text-[11px] text-[#667068]">Updated {formatDate(request.updated_at)}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${statusTone(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
