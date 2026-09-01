"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";
import type { SearchResult } from "@/lib/search/results";

const examples = [
  "When does my car insurance expire?",
  "Is my washing machine still under warranty?",
  "Which important documents expire this year?",
  "What do I need to sort before my holiday?"
];

type AskResponse = { answer?: string; citations?: SearchResult[]; usedAI?: boolean; error?: string };

export function AskDiaryDockWorkspace() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async (event?: FormEvent) => {
    event?.preventDefault();
    const clean = question.trim();
    if (clean.length < 2 || loading) return;
    setLoading(true); setError(""); setAnswer(""); setCitations([]);
    try {
      const response = await fetch("/api/ask", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: clean }) });
      const payload = await response.json() as AskResponse;
      if (!response.ok) throw new Error(payload.error || "DiaryDock could not answer that safely.");
      setAnswer(payload.answer || "No answer was returned.");
      setCitations(payload.citations ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "DiaryDock could not answer that safely.");
    } finally { setLoading(false); }
  };

  return <div className="space-y-4 pb-28">
    <PageHeader eyebrow="Private assistant" title="Ask DiaryDock" subtitle="Ask about the records in your DiaryDock. Permission checks happen before a small set of relevant details is used to answer." backHref="/dashboard" backLabel="Home" action={<Link href="/search" aria-label="Open private search" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#315443]/10 bg-white text-[#52705a]"><UiIcon name="search" className="h-4 w-4" /></Link>} meta={<><span className="estate-chip">Permission checked first</span><span className="estate-chip">Sources included</span></>} />

    <form onSubmit={(event) => void ask(event)} className="estate-sheet p-4 sm:p-5">
      <label htmlFor="diarydock-question" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52705a]">What would you like to know?</label>
      <div className="mt-3 rounded-[22px] border border-[#20352a]/10 bg-white/80 p-3 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)]">
        <textarea id="diarydock-question" autoFocus value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 300))} rows={3} placeholder="For example, when does my MOT expire?" className="w-full resize-none bg-transparent text-[16px] leading-6 text-ink outline-none placeholder:text-ink/38" />
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#20352a]/8 pt-3">
          <span className="text-[10px] text-[#667068]">{question.length}/300</span>
          <button type="submit" disabled={question.trim().length < 2 || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[15px] bg-[#315443] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"><UiIcon name="search" className="h-4 w-4" />{loading ? "Checking…" : "Ask"}</button>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#667068]">If AI is available, your question and no more than eight relevant, stripped-down record summaries are sent securely to OpenAI. Full documents, notes and contact details are not sent.</p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{examples.map((example) => <button key={example} type="button" onClick={() => setQuestion(example)} className="shrink-0 rounded-full border border-[#315443]/10 bg-[#eef2e9] px-3 py-2 text-xs font-semibold text-[#52705a]">{example}</button>)}</div>
    </form>

    {error ? <div role="alert" className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
    {answer ? <section aria-live="polite" className="estate-sheet p-5">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e8efe5] text-[#52705a]"><UiIcon name="star" className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f8e72]">DiaryDock answer</p><h2 className="font-serif text-xl text-[#20352a]">Based on your authorised records</h2></div></div>
      <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-[#33423a]">{answer}</p>
      {citations.length ? <div className="mt-5 border-t border-[#20352a]/8 pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#667068]">Records used</p><div className="mt-2 space-y-2">{citations.map((citation) => <Link key={citation.id} href={citation.href} className="flex min-h-14 items-center gap-3 rounded-[16px] border border-[#20352a]/8 bg-white/70 px-3 py-2.5 transition hover:bg-white"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef2e9] text-[#52705a]"><UiIcon name="file" className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#20352a]">{citation.title}</span><span className="block truncate text-xs text-[#667068]">{citation.detail || citation.badge || "DiaryDock record"}</span></span><UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-[#7b847d]" /></Link>)}</div></div> : null}
      <p className="mt-4 text-[11px] leading-5 text-[#667068]">Check the linked records before relying on important dates or decisions. Ask DiaryDock cannot change or share anything.</p>
    </section> : null}
  </div>;
}
