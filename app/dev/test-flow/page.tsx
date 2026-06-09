"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Database, XCircle } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getDocuments } from "@/lib/supabase/documents";
import { getReminders } from "@/lib/supabase/reminders";

type ChecklistState = Record<string, "pass" | "fail" | "unset">;

const checklistKey = "simplyLoggedDevTestFlow";

const steps = [
  {
    id: "signup",
    label: "Sign up",
    href: "/signup",
    expected: "A new account is created and the user reaches the account screen.",
  },
  {
    id: "login",
    label: "Log in",
    href: "/login",
    expected: "The user can authenticate with email and password.",
  },
  {
    id: "upload",
    label: "Upload/take photo of a document",
    href: "/add",
    expected: "The selected image previews, or the PDF file name is shown.",
  },
  {
    id: "analyse",
    label: "AI analyses document",
    href: "/add",
    expected: "The app shows a reviewing state and opens the review page with structured results.",
  },
  {
    id: "review",
    label: "Review detected room/category/dates",
    href: "/add/review",
    expected: "The review screen shows source, category, suggested room, key dates, and reminders.",
  },
  {
    id: "save",
    label: "Save document",
    href: "/add/review",
    expected: "Saving redirects to the suggested room or vault without errors.",
  },
  {
    id: "vault",
    label: "Confirm document appears in Vault",
    href: "/vault",
    expected: "The saved document appears in the vault list and can be searched or filtered.",
  },
  {
    id: "room",
    label: "Confirm document appears in correct room page",
    href: "/room/garage",
    expected: "The saved document appears in its suggested room with category and summary.",
  },
  {
    id: "reminders",
    label: "Confirm reminder appears in Reminders",
    href: "/reminders",
    expected: "A saved reminder appears in upcoming or overdue reminders.",
  },
  {
    id: "dashboard",
    label: "Confirm dashboard badges update",
    href: "/dashboard",
    expected: "Mailbox/new-document and reminder status badges reflect saved data.",
  },
  {
    id: "logout",
    label: "Log out",
    href: "/account",
    expected: "The account screen signs the user out and returns to the estate.",
  },
  {
    id: "persist",
    label: "Log back in and confirm data persists",
    href: "/login",
    expected: "After logging back in, vault documents and reminders are still available.",
  },
];

export default function DevTestFlowPage() {
  const [checks, setChecks] = useState<ChecklistState>({});
  const [diagnostics, setDiagnostics] = useState({
    configured: false,
    email: "",
    documentCount: 0,
    reminderCount: 0,
    storageMode: "localStorage fallback",
  });

  useEffect(() => {
    const raw = window.localStorage.getItem(checklistKey);
    if (raw) {
      queueMicrotask(() => setChecks(JSON.parse(raw) as ChecklistState));
    }
  }, []);

  useEffect(() => {
    async function loadDiagnostics() {
      const configured = isSupabaseConfigured();
      const supabase = getSupabaseClient();
      const { data } = supabase
        ? await supabase.auth.getUser()
        : { data: { user: null } };
      const documents = await getDocuments();
      const reminders = await getReminders();

      setDiagnostics({
        configured,
        email: data.user?.email ?? "Not signed in",
        documentCount: documents.length,
        reminderCount: reminders.length,
        storageMode: configured && data.user ? "Supabase" : "localStorage fallback",
      });
    }

    loadDiagnostics();
    window.addEventListener("storage", loadDiagnostics);
    window.addEventListener("simplyLoggedStorage", loadDiagnostics);

    return () => {
      window.removeEventListener("storage", loadDiagnostics);
      window.removeEventListener("simplyLoggedStorage", loadDiagnostics);
    };
  }, []);

  const completedCount = useMemo(
    () => steps.filter((step) => checks[step.id] === "pass").length,
    [checks],
  );

  function setResult(stepId: string, result: "pass" | "fail") {
    const next: ChecklistState = {
      ...checks,
      [stepId]: checks[stepId] === result ? "unset" : result,
    };
    setChecks(next);
    window.localStorage.setItem(checklistKey, JSON.stringify(next));
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,#f5f3ff_0,#f8fafc_34%,#e7eef9_100%)] px-4 py-5 text-zinc-950">
      <div className="mx-auto max-w-3xl">
        <header className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-slate-300/40">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-white">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-violet-700">Development only</p>
              <h1 className="text-3xl font-bold">Simply Logged test flow</h1>
              <p className="mt-2 text-sm text-zinc-600">
                {completedCount} of {steps.length} checks marked as passing.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-4 rounded-[1.5rem] bg-zinc-950 p-4 text-white">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-violet-300" />
            <h2 className="text-sm font-bold">Developer panel</h2>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <Metric label="Supabase configured" value={diagnostics.configured ? "yes" : "no"} />
            <Metric label="Current auth user email" value={diagnostics.email} />
            <Metric label="Number of documents" value={String(diagnostics.documentCount)} />
            <Metric label="Number of reminders" value={String(diagnostics.reminderCount)} />
            <Metric label="Storage mode" value={diagnostics.storageMode} />
          </div>
        </section>

        <section className="mt-4 space-y-3">
          {steps.map((step, index) => {
            const state = checks[step.id] ?? "unset";

            return (
              <article
                key={step.id}
                className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
                      Step {index + 1}
                    </p>
                    <h2 className="mt-1 text-lg font-bold">{step.label}</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      Expected result: {step.expected}
                    </p>
                  </div>
                  <Link
                    href={step.href}
                    className="shrink-0 rounded-full bg-zinc-950 px-3 py-2 text-xs font-bold text-white"
                  >
                    Open
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setResult(step.id, "pass")}
                    className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${
                      state === "pass"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Pass
                  </button>
                  <button
                    onClick={() => setResult(step.id, "fail")}
                    className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${
                      state === "fail" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Fail
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}
