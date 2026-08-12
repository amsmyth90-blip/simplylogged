"use client";

import { useEffect, useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillLegalNotice, WillPageHeader, WillSectionHeading } from "@/components/wills/WillUi";
import type { DiaryDockAppState } from "@/lib/diarydock-data";
import { createInitialWillRecord, getPreparationProgress, hydrateWillRecord, willPreparationSections, type WillPreparationStatus, type WillRecord } from "@/lib/will-records";

function replaceWill(state: DiaryDockAppState, record: WillRecord) {
  return { ...state, willsWishes: { ...state.willsWishes, myWill: record } };
}

export function WillPreparationWorkspace() {
  const { state, hydrated, updateState } = useDiaryDockData();
  const stored = hydrateWillRecord(state.willsWishes.myWill);
  const [draft, setDraft] = useState<WillRecord>(createInitialWillRecord);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (hydrated) setDraft(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const progress = getPreparationProgress(draft);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = { ...draft, updatedAt: new Date().toISOString() };
    updateState((current) => replaceWill(current, next));
    setDraft(next);
    setMessage("Your preparation information has been saved privately.");
  };

  const downloadPack = () => {
    const completedSections = willPreparationSections.flatMap(({ key, label }) => {
      const item = draft.preparation[key];
      return item.status === "complete" && item.confirmedData.trim() ? [{ section: label, confirmedInformation: item.confirmedData.trim() }] : [];
    });
    if (!completedSections.length) {
      setMessage("Complete and confirm at least one preparation section before creating the pack.");
      return;
    }
    const documentIndex = draft.versions.map((version) => {
      const document = state.vaultDocuments.find((item) => item.id === version.documentId);
      return { version: version.versionLabel, status: version.status, uploadedAt: version.uploadedAt, signedDate: version.signedDate || null, fileName: document?.originalFileName ?? null };
    });
    const pack = {
      title: "DiaryDock Will preparation pack",
      preparedAt: new Date().toISOString(),
      notice: "This is an organisational information pack, not a completed will or legal advice.",
      confirmedSections: completedSections,
      proposedExecutors: [draft.primaryExecutor.name, draft.backupExecutor.name].filter(Boolean),
      solicitor: { name: draft.solicitorName || null, firm: draft.solicitorFirm || null, phone: draft.solicitorPhone || null, email: draft.solicitorEmail || null },
      existingDocumentIndex: documentIndex
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `diarydock-will-preparation-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Your preparation pack has been downloaded. It contains only confirmed organiser information and a document index.");
  };

  if (!hydrated) return <div className="mx-auto w-full max-w-[760px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068] sm:max-w-[680px] xl:max-w-[760px]">Opening your preparation organiser…</div>;

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader title="Will preparation" subtitle="Organise information you may wish to discuss with a qualified solicitor." backHref="/wills/my-will" />
      <WillCard>
        <WillSectionHeading icon="briefcase" title="Your preparation progress" description={`${progress.complete} of ${progress.total} sections complete. Completion does not mean a will is legally valid.`} />
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e6e9df]"><div className="h-full rounded-full bg-[#6f8e72]" style={{ width: `${(progress.complete / progress.total) * 100}%` }} /></div>
      </WillCard>

      <section aria-labelledby="preparation-sections"><h2 id="preparation-sections" className="mb-3 text-xl font-semibold text-[#20352a]">Preparation sections</h2><div className="space-y-3">{willPreparationSections.map(({ key, label }) => {
        const item = draft.preparation[key];
        return (
          <details key={key} className="group rounded-[20px] border border-[#20352a]/[0.07] bg-[#fffdf8] shadow-[0_16px_38px_-30px_rgba(32,53,42,0.5)]">
            <summary className="flex min-h-[72px] cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6f8e72]"><span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${item.status === "complete" ? "bg-[#dde6d8] text-[#45604d]" : "bg-[#f0f1ea] text-[#667068]"}`}><UiIcon name={item.status === "complete" ? "check" : "file"} className="h-[18px] w-[18px]" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#20352a]">{label}</span><span className="mt-0.5 block text-[11px] capitalize text-[#667068]">{item.status.replace("-", " ")}</span></span><UiIcon name="chevron-down" className="h-4 w-4 text-[#6f8e72] transition group-open:rotate-180 motion-reduce:transition-none" /></summary>
            <div className="border-t border-[#20352a]/[0.06] px-4 pb-4 pt-3">
              <label className="block"><span className="text-xs font-semibold text-[#59655d]">Status</span><select value={item.status} onChange={(event) => setDraft((current) => ({ ...current, preparation: { ...current.preparation, [key]: { ...current.preparation[key], status: event.target.value as WillPreparationStatus, updatedAt: new Date().toISOString() } } }))} className="mt-2 min-h-11 w-full rounded-[14px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a] outline-none focus:border-[#6f8e72]"><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="complete">Complete</option></select></label>
              <label className="mt-3 block"><span className="text-xs font-semibold text-[#59655d]">Your confirmed information</span><textarea value={item.confirmedData} onChange={(event) => setDraft((current) => ({ ...current, preparation: { ...current.preparation, [key]: { ...current.preparation[key], confirmedData: event.target.value, updatedAt: new Date().toISOString() } } }))} rows={4} className="mt-2 w-full rounded-[14px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm leading-6 text-[#20352a] outline-none focus:border-[#6f8e72]" placeholder={`Add your notes for ${label.toLowerCase()}…`} /></label>
            </div>
          </details>
        );
      })}</div></section>

      <WillCard>
        <WillSectionHeading icon="archive" title="Will preparation pack" description="Download an organised file containing only information you have marked complete and confirmed." />
        <p className="mt-3 text-[12px] leading-5 text-[#667068]">The pack excludes passwords, account credentials, private notes and full document contents. It is not a completed will.</p>
        <button type="button" onClick={downloadPack} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#6f8e72]/30 bg-white px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="archive" className="h-4 w-4" />Download preparation pack</button>
      </WillCard>
      {message ? <p role="status" className="rounded-[15px] bg-[#eef2e9] px-4 py-3 text-sm leading-6 text-[#45604d]">{message}</p> : null}
      <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#2f5140] px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"><UiIcon name="check" className="h-4 w-4" />Save preparation</button>
      <WillLegalNotice />
    </form>
  );
}
