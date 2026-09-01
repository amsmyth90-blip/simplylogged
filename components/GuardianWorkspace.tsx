"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";

type Finding = {
  id: string;
  type: string;
  severity: "INFO" | "ATTENTION" | "IMPORTANT" | "URGENT";
  resourceType: string;
  resourceId: string;
  title: string;
  description: string;
  dueAt: string | null;
};

const severityStyle: Record<Finding["severity"], string> = {
  INFO: "bg-[#e8efe5] text-[#52705a]",
  ATTENTION: "bg-[#f5ecd8] text-[#80652c]",
  IMPORTANT: "bg-[#f5e2d9] text-[#92513c]",
  URGENT: "bg-[#f1dcd8] text-[#93483e]"
};

const severityLabel: Record<Finding["severity"], string> = {
  INFO: "Coming up",
  ATTENTION: "Worth checking",
  IMPORTANT: "Needs attention",
  URGENT: "Recorded date passed"
};

function sourceHref(finding: Finding) {
  if (finding.resourceId.startsWith("document:")) return `/document/${finding.resourceId.slice("document:".length)}`;
  return "/files";
}

export function GuardianWorkspace() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/guardian", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { findings?: Finding[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Guardian could not open your briefing.");
        setFindings(payload.findings ?? []);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Guardian could not open your briefing."))
      .finally(() => setLoading(false));
  }, []);

  const decide = async (findingId: string, decision: "dismiss" | "resolve" | "snooze") => {
    setBusyId(findingId);
    setMessage("");
    try {
      const response = await fetch("/api/guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId, decision })
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "That Guardian item could not be updated.");
      setFindings((current) => current.filter((finding) => finding.id !== findingId));
      setMessage(decision === "snooze" ? "We’ll leave that out of your briefing for seven days." : decision === "resolve" ? "Marked as sorted." : "Removed from this briefing.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That Guardian item could not be updated.");
    } finally {
      setBusyId(null);
    }
  };

  const heading = findings.length === 0
    ? "Everything looks settled"
    : `${findings.length} ${findings.length === 1 ? "thing needs" : "things need"} your attention`;

  return (
    <main className="min-h-[100svh] bg-[#f5f1e8] px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] text-[#20352a] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="A calm check-in" title="Guardian" subtitle="A short, private briefing from dates already saved in DiaryDock." backHref="/dashboard" />
        {message ? <p role="status" className="mt-4 rounded-2xl border border-[#6f8e72]/15 bg-white/75 px-4 py-3 text-sm text-[#52705a]">{message}</p> : null}
        <section className="mt-5 rounded-[28px] bg-[#315443] p-6 text-white shadow-[0_24px_55px_-38px_rgba(32,53,42,0.9)] sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12"><UiIcon name={findings.length ? "bell" : "check"} className="h-6 w-6" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/65">Your briefing</p><h2 className="mt-1 font-serif text-2xl leading-tight sm:text-3xl">{loading ? "Checking your saved dates…" : heading}</h2></div>
          </div>
        </section>

        {!loading && !findings.length ? (
          <section className="mt-4 rounded-[26px] border border-white/80 bg-white/80 p-6 text-center shadow-sm">
            <p className="text-sm leading-6 text-[#667068]">There is nothing you need to act on in the next 90 days. Guardian will check again when you return.</p>
            <Link href="/dashboard" className="mt-5 inline-flex min-h-12 items-center rounded-2xl bg-[#355540] px-5 text-sm font-semibold text-white">Back to your home</Link>
          </section>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {findings.map((finding) => (
            <article key={finding.id} className="flex flex-col rounded-[26px] border border-white/85 bg-white/85 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${severityStyle[finding.severity]}`}>{severityLabel[finding.severity]}</span>
                {finding.dueAt ? <time className="text-xs font-semibold text-[#789078]" dateTime={finding.dueAt}>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(finding.dueAt))}</time> : null}
              </div>
              <h2 className="mt-4 text-lg font-semibold leading-snug">{finding.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[#667068]">{finding.description}</p>
              <Link href={sourceHref(finding)} className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[#52705a]">Open the source <UiIcon name="chevron-right" className="h-3.5 w-3.5" /></Link>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button type="button" disabled={busyId === finding.id} onClick={() => void decide(finding.id, "dismiss")} className="min-h-11 rounded-xl border border-[#6f8e72]/20 px-2 text-xs font-semibold text-[#667068] disabled:opacity-50">Dismiss</button>
                <button type="button" disabled={busyId === finding.id} onClick={() => void decide(finding.id, "snooze")} className="min-h-11 rounded-xl border border-[#6f8e72]/20 px-2 text-xs font-semibold text-[#52705a] disabled:opacity-50">7 days</button>
                <button type="button" disabled={busyId === finding.id} onClick={() => void decide(finding.id, "resolve")} className="min-h-11 rounded-xl bg-[#355540] px-2 text-xs font-semibold text-white disabled:opacity-50">Sorted</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
