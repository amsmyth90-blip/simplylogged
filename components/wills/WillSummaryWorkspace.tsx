"use client";

import Link from "next/link";
import { useState } from "react";

import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { WillCard, WillLegalNotice, WillPageHeader, formatWillDate } from "@/components/wills/WillUi";
import type { LifeDockAppState } from "@/lib/lifedock-data";
import { getCurrentWillVersion, hydrateWillRecord, type WillRecord, type WillSummaryReview } from "@/lib/will-records";

function updateWill(state: LifeDockAppState, updater: (record: WillRecord) => WillRecord) {
  return { ...state, willsWishes: { ...state.willsWishes, myWill: updater(hydrateWillRecord(state.willsWishes.myWill)) } };
}

export function WillSummaryWorkspace() {
  const { state, hydrated, updateState } = useLifeDockData();
  const record = hydrateWillRecord(state.willsWishes.myWill);
  const currentVersion = getCurrentWillVersion(record);
  const document = currentVersion ? state.vaultDocuments.find((item) => item.id === currentVersion.documentId) ?? null : null;
  const [reviewNote, setReviewNote] = useState(currentVersion?.summaryReviewNote ?? "");
  const [message, setMessage] = useState("");
  const detected = currentVersion?.detectedSummary;

  const confirmedPreparation = (key: keyof WillRecord["preparation"]) => {
    const item = record.preparation[key];
    return item.status === "complete" && item.confirmedData.trim() ? item.confirmedData.trim() : "Not confirmed in your organiser yet.";
  };

  const detectedText = (values: string[] | undefined, confirmedFallback: string) => values?.length ? values.join(" · ") : confirmedFallback;
  const sections: Array<{ title: string; icon: IconName; text: string }> = [
    { title: "Executors", icon: "users", text: detectedText(detected?.executors, [record.primaryExecutor.name ? `Primary: ${record.primaryExecutor.name}` : "", record.backupExecutor.name ? `Backup: ${record.backupExecutor.name}` : ""].filter(Boolean).join(" · ") || confirmedPreparation("executors")) },
    { title: "Beneficiaries", icon: "heart", text: detectedText(detected?.beneficiaries, confirmedPreparation("beneficiaries")) },
    { title: "Guardians", icon: "shield", text: detectedText(detected?.guardians, confirmedPreparation("guardians")) },
    { title: "Specific gifts", icon: "star", text: detectedText(detected?.specificGifts, confirmedPreparation("specific-gifts")) },
    { title: "Charitable gifts", icon: "leaf", text: detectedText(detected?.charitableGifts, confirmedPreparation("charitable-gifts")) },
    { title: "Residue of estate", icon: "archive", text: detectedText(detected?.residueOfEstate, confirmedPreparation("residue-estate")) },
    { title: "Funeral wishes references", icon: "file", text: detectedText(detected?.funeralWishesReferences, "No reference was identified. Keep separate preferences in My Wishes & Preferences.") },
    { title: "Conditions or special instructions", icon: "alert", text: detectedText(detected?.conditionsOrInstructions, "No separate instruction was identified.") },
    { title: "Questions or unclear wording", icon: "search", text: detectedText(detected?.questionsOrUnclearWording, record.preparation["solicitor-questions"].confirmedData.trim() || "No specific question was identified. Review any uncertainty with a qualified solicitor.") }
  ];

  const saveReview = (review: WillSummaryReview) => {
    if (!currentVersion) return;
    updateState((current) => updateWill(current, (currentRecord) => ({
      ...currentRecord,
      versions: currentRecord.versions.map((version) => version.id === currentVersion.id ? { ...version, summaryReview: review, summaryReviewNote: review === "incorrect" ? reviewNote.trim() : "" } : version),
      updatedAt: new Date().toISOString()
    })));
    setMessage(review === "incorrect" ? "Marked for correction. No extracted information was saved as confirmed data." : "Summary review recorded. Always keep the original document as your reference.");
  };

  if (!hydrated) return <div className="mx-auto w-full max-w-[760px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068] sm:max-w-[680px] xl:max-w-[760px]">Preparing the summary…</div>;

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader title="Will summary" subtitle="A plain-language overview to help you find important information." backHref="/wills/my-will" />

      {!currentVersion ? (
        <WillCard><div className="py-5 text-center"><UiIcon name="file" className="mx-auto h-8 w-8 text-[#6f8e72]" /><h2 className="mt-3 font-semibold text-[#20352a]">No will to summarise</h2><p className="mt-1 text-sm text-[#667068]">Upload an existing will from the My Will dashboard first.</p><Link href="/wills/my-will" className="mt-4 inline-flex min-h-11 items-center rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white">Back to My Will</Link></div></WillCard>
      ) : currentVersion.analysisStatus === "processing" ? (
        <WillCard><div className="flex items-center gap-3"><UiIcon name="clock" className="h-6 w-6 text-[#6f8e72]" /><div><h2 className="font-semibold text-[#20352a]">Summary is being prepared</h2><p className="mt-1 text-sm text-[#667068]">Your original file is already stored securely.</p></div></div></WillCard>
      ) : currentVersion.analysisStatus !== "ready" || !document?.extractionSummary ? (
        <WillCard><div className="flex items-start gap-3"><UiIcon name="alert" className="mt-0.5 h-6 w-6 shrink-0 text-[#8a744d]" /><div><h2 className="font-semibold text-[#20352a]">Summary unavailable</h2><p className="mt-1 text-sm leading-6 text-[#667068]">DiaryDock could not prepare an AI summary for this version. The original file remains securely stored and available from My Will.</p></div></div></WillCard>
      ) : (
        <>
          <WillCard className="bg-[#f1f3ec]">
            <div className="flex items-start gap-3"><UiIcon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-[#52705a]" /><div><h2 className="text-sm font-semibold text-[#20352a]">Please check these details</h2><p className="mt-1 text-[12px] leading-5 text-[#59655d]">This is an informational summary. Always refer to your original will or a qualified solicitor where wording matters.</p>{detected && detected.confidence < 0.8 ? <p className="mt-2 rounded-lg bg-[#f5ead6] px-2.5 py-2 text-[11px] leading-4 text-[#765f38]">Extra care recommended: some wording may not have been read clearly.</p> : null}<p className="mt-2 text-[11px] text-[#758078]">Current version: {currentVersion.versionLabel} · uploaded {formatWillDate(currentVersion.uploadedAt)}</p></div></div>
          </WillCard>

          <WillCard>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f8e72]">AI document overview</p>
            <h2 className="mt-2 font-serif text-2xl text-[#20352a]">What DiaryDock identified</h2>
            <p className="mt-3 text-sm leading-7 text-[#59655d]">{document.extractionSummary}</p>
          </WillCard>

          <section aria-labelledby="summary-key-points"><h2 id="summary-key-points" className="mb-3 text-xl font-semibold text-[#20352a]">Key points to review</h2><div className="space-y-3">{sections.map((section) => <WillCard key={section.title} as="article" className="p-4"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#52705a]"><UiIcon name={section.icon} className="h-[18px] w-[18px]" /></span><div><h3 className="text-sm font-semibold text-[#20352a]">{section.title}</h3><p className="mt-1 text-[12px] leading-5 text-[#667068]">{section.text}</p></div></div></WillCard>)}</div></section>

          <WillCard>
            <h2 className="text-base font-semibold text-[#20352a]">Is anything incorrect?</h2>
            <p className="mt-1 text-[12px] leading-5 text-[#667068]">AI-detected information is not silently added to your confirmed details.</p>
            <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={3} className="mt-3 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm text-[#20352a] outline-none focus:border-[#6f8e72]" placeholder="Optional note about what needs checking" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => saveReview("confirmed")} className="min-h-11 rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">I have checked this</button><button type="button" onClick={() => saveReview("incorrect")} className="min-h-11 rounded-[14px] border border-[#6f8e72]/30 bg-white px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Something is incorrect</button></div>
            {message ? <p role="status" className="mt-3 rounded-[13px] bg-[#eef2e9] px-3 py-2.5 text-[12px] leading-5 text-[#45604d]">{message}</p> : null}
          </WillCard>
        </>
      )}

      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f5efe3] px-4 py-3.5 text-[12px] leading-5 text-[#6d624e]">This summary may not reflect every legal detail. Refer to the original document and seek professional advice where needed.</p>
      <WillLegalNotice />
    </div>
  );
}
