import Link from "next/link";
import { CheckCircle2, CircleDashed, Database, KeyRound, ShieldCheck } from "lucide-react";
import { getSetupStatus } from "@/lib/supabase/setup-status";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const status = await getSetupStatus();

  const rows = [
    {
      label: "Supabase URL configured",
      value: status.supabaseUrlConfigured ? "Yes" : "No",
      ok: status.supabaseUrlConfigured,
    },
    {
      label: "Supabase Key configured",
      value: status.supabaseAnonKeyConfigured ? "Yes" : "No",
      ok: status.supabaseAnonKeyConfigured,
    },
    {
      label: "OpenAI Key configured",
      value: status.openAiKeyConfigured ? "Yes" : "No",
      ok: status.openAiKeyConfigured,
    },
    {
      label: "Database connected",
      value: status.databaseConnected,
      ok: status.databaseConnected === "Connected",
    },
    {
      label: "Storage bucket available",
      value: status.storageBucketAvailable,
      ok: status.storageBucketAvailable === "Connected",
    },
  ];

  return (
    <main className="min-h-svh bg-[#f7efe3] px-4 py-6 text-[#251a12]">
      <section className="mx-auto max-w-md">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-stone-300/50">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-black text-violet-700">Simply Logged</p>
              <h1 className="mt-1 text-3xl font-black">Setup status</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Check configuration without exposing any secret values.
              </p>
            </div>
          </div>
        </div>

        <section className="mt-4 space-y-3">
          {rows.map((row) => (
            <article key={row.label} className="flex min-h-16 items-center gap-3 rounded-[1.25rem] bg-white p-4 shadow-sm shadow-stone-200">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${row.ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {row.ok ? <CheckCircle2 className="h-5 w-5" /> : <CircleDashed className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-black">{row.label}</h2>
                <p className="mt-1 text-sm font-bold text-stone-500">{row.value}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-4 rounded-[1.5rem] bg-white p-4 shadow-sm shadow-stone-200">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-700" />
            <h2 className="font-black">Storage privacy</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Documents bucket private: <strong>{status.storageBucketPrivate ? "Yes" : "Pending"}</strong>
          </p>
        </section>

        {status.message ? (
          <section className="mt-4 rounded-[1.5rem] bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
            {status.message}
          </section>
        ) : null}

        <section className="mt-4 rounded-[1.5rem] bg-[#2a2119] p-4 text-white shadow-xl shadow-stone-300/50">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-200" />
            <h2 className="font-black">Next step</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/70">
            Add missing env vars locally and in Vercel, apply the Supabase migration, then re-open this page.
          </p>
          <Link href="/dashboard" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-black text-stone-950">
            Back to app
          </Link>
        </section>
      </section>
    </main>
  );
}
