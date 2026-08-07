"use client";

import { useState } from "react";

import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillLegalNotice, WillPageHeader, formatWillDate } from "@/components/wills/WillUi";
import { openPrivateDocument } from "@/lib/document-storage";
import type { LifeDockAppState } from "@/lib/lifedock-data";
import { hydrateWillRecord, setCurrentWillVersion, type WillRecord } from "@/lib/will-records";

function updateWill(state: LifeDockAppState, updater: (record: WillRecord) => WillRecord) {
  return { ...state, willsWishes: { ...state.willsWishes, myWill: updater(hydrateWillRecord(state.willsWishes.myWill)) } };
}

export function WillHistoryWorkspace() {
  const { state, hydrated, updateState } = useLifeDockData();
  const record = hydrateWillRecord(state.willsWishes.myWill);
  const [message, setMessage] = useState("");
  const versions = [...record.versions].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  const viewVersion = async (documentId: string) => {
    setMessage("");
    const document = state.vaultDocuments.find((item) => item.id === documentId);
    try {
      await openPrivateDocument(document?.storageBucket, document?.storagePath);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open this version.");
    }
  };

  const makeCurrent = (versionId: string) => {
    if (!window.confirm("Make this the current version? The existing current version will remain stored and will be marked superseded.")) return;
    updateState((current) => updateWill(current, (currentRecord) => setCurrentWillVersion(currentRecord, versionId)));
    setMessage("Current version updated. No previous file was deleted.");
  };

  if (!hydrated) return <div className="mx-auto w-full max-w-[760px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068] sm:max-w-[680px] xl:max-w-[760px]">Opening version history…</div>;

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader title="Version history" subtitle="Previous will files remain stored so you can see what changed and when." backHref="/wills/my-will" />
      <WillCard>
        <div className="flex items-center gap-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#dde6d8] text-[#45604d]"><UiIcon name="clock" className="h-5 w-5" /></span><div><h2 className="font-semibold text-[#20352a]">{versions.length} stored version{versions.length === 1 ? "" : "s"}</h2><p className="mt-0.5 text-xs text-[#667068]">Only one version can be marked current.</p></div></div>
      </WillCard>
      {message ? <p role="status" className="rounded-[15px] bg-[#eef2e9] px-4 py-3 text-sm text-[#45604d]">{message}</p> : null}
      {versions.length ? (
        <ol className="relative space-y-4 before:absolute before:bottom-8 before:left-[21px] before:top-8 before:w-px before:bg-[#cfd9ca]">
          {versions.map((version) => {
            const document = state.vaultDocuments.find((item) => item.id === version.documentId);
            return (
              <li key={version.id} className="relative pl-11">
                <span className={`absolute left-[14px] top-7 z-10 h-[15px] w-[15px] rounded-full border-[3px] border-[#f8f4ec] ${version.isCurrent ? "bg-[#456c53]" : "bg-[#bdc8b8]"}`} />
                <WillCard as="article">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold text-[#20352a]">{version.versionLabel} · {formatWillDate(version.uploadedAt)}</p><p className="mt-1 text-[12px] text-[#667068]">{document?.originalFileName ?? "Stored will file"}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${version.isCurrent ? "bg-[#dde6d8] text-[#45604d]" : "bg-[#f0f0ea] text-[#667068]"}`}>{version.isCurrent ? "Current" : version.status === "superseded" ? "Superseded" : version.status === "signed" ? "Signed" : "Draft"}</span></div>
                  <dl className="mt-4 grid gap-2 text-[12px] sm:grid-cols-3"><div><dt className="font-semibold text-[#20352a]/65">Signed date</dt><dd className="mt-0.5 text-[#667068]">{formatWillDate(version.signedDate)}</dd></div><div><dt className="font-semibold text-[#20352a]/65">Analysis</dt><dd className="mt-0.5 capitalize text-[#667068]">{version.analysisStatus.replace("-", " ")}</dd></div><div><dt className="font-semibold text-[#20352a]/65">File status</dt><dd className="mt-0.5 capitalize text-[#667068]">{version.status}</dd></div></dl>
                  {version.notes ? <p className="mt-4 rounded-[13px] bg-[#f5f5ef] px-3 py-2.5 text-[12px] leading-5 text-[#59655d]">{version.notes}</p> : null}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void viewVersion(version.documentId)} className="min-h-11 rounded-[14px] border border-[#6f8e72]/30 bg-white px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">View this version</button>{!version.isCurrent ? <button type="button" onClick={() => makeCurrent(version.id)} className="min-h-11 rounded-[14px] bg-[#eef2e9] px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Make current</button> : null}</div>
                </WillCard>
              </li>
            );
          })}
        </ol>
      ) : (
        <WillCard><div className="py-5 text-center"><UiIcon name="archive" className="mx-auto h-8 w-8 text-[#6f8e72]" /><h2 className="mt-3 font-semibold text-[#20352a]">No versions stored yet</h2><p className="mt-1 text-sm text-[#667068]">Upload your first will from the My Will dashboard.</p></div></WillCard>
      )}
      <WillLegalNotice />
    </div>
  );
}
