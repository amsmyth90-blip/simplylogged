"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";

type Proposal = {
  id: string;
  action_type: string;
  risk_level: string;
  status: "proposed" | "approved";
  title: string;
  summary: string;
  reason?: string;
  source_document_id?: string;
  created_at: string;
};

export function CaptureProposalsWorkspace() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/actions/proposals", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { proposals?: Proposal[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Suggestions could not be loaded.");
        setProposals(payload.proposals ?? []);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Suggestions could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const decide = async (proposalId: string, decision: "approve" | "dismiss") => {
    setBusyId(proposalId);
    setMessage("");
    try {
      const response = await fetch("/api/actions/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, decision })
      });
      const payload = await response.json() as { error?: string; proposal?: { status?: string } };
      if (!response.ok) throw new Error(payload.error || "That suggestion could not be updated.");
      if (decision === "dismiss") {
        setProposals((current) => current.filter((proposal) => proposal.id !== proposalId));
      } else if (payload.proposal?.status === "completed") {
        setProposals((current) => current.filter((proposal) => proposal.id !== proposalId));
        setMessage("The reminder schedule was created and will stay linked to its source date.");
      } else {
        setProposals((current) => current.map((proposal) => proposal.id === proposalId ? { ...proposal, status: "approved" } : proposal));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That suggestion could not be updated.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-[100svh] bg-[#f5f1e8] px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] text-[#20352a]">
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="DiaryDock" title="Suggested next steps" subtitle="Nothing here changes your records until you choose it." backHref="/dashboard" />
        {message ? <p role="alert" className="mt-4 rounded-2xl bg-[#fbe5df] px-4 py-3 text-sm text-[#a4473d]">{message}</p> : null}
        {loading ? <p className="mt-5 rounded-3xl bg-white/80 p-6 text-sm text-[#667068]">Opening your suggestions…</p> : null}
        {!loading && !proposals.length ? (
          <section className="mt-5 rounded-[26px] border border-white/80 bg-white/80 p-6 text-center shadow-sm">
            <UiIcon name="check" className="mx-auto h-7 w-7 text-[#6f8e72]" />
            <h2 className="mt-3 text-lg font-semibold">Nothing waiting</h2>
            <p className="mt-2 text-sm leading-6 text-[#667068]">Scan a document and DiaryDock will offer useful next steps when it finds them.</p>
            <Link href="/capture" className="mt-5 inline-flex min-h-12 items-center rounded-2xl bg-[#355540] px-5 text-sm font-semibold text-white">Scan a document</Link>
          </section>
        ) : null}
        <div className="mt-5 space-y-3">
          {proposals.map((proposal) => (
            <article key={proposal.id} className="rounded-[24px] border border-white/85 bg-white/85 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8efe5] text-[#52705a]"><UiIcon name={proposal.action_type === "create_reminder" ? "bell" : "plus"} className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><h2 className="text-base font-semibold">{proposal.title}</h2><p className="mt-1 text-sm leading-6 text-[#667068]">{proposal.summary}</p></div>
              </div>
              {proposal.source_document_id ? <Link href={`/document/${proposal.source_document_id}`} className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-[#52705a]">View the source document</Link> : null}
              {proposal.status === "approved" ? (
                <p className="mt-3 rounded-2xl bg-[#e8efe5] px-4 py-3 text-xs font-semibold text-[#45604d]">Kept for the next step. DiaryDock has not changed the record yet.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" disabled={busyId === proposal.id} onClick={() => void decide(proposal.id, "dismiss")} className="min-h-12 rounded-2xl border border-[#6f8e72]/25 text-sm font-semibold text-[#667068] disabled:opacity-50">Not now</button>
                  <button type="button" disabled={busyId === proposal.id} onClick={() => void decide(proposal.id, "approve")} className="min-h-12 rounded-2xl bg-[#355540] text-sm font-semibold text-white disabled:opacity-50">Keep this step</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
