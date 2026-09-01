"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  WillActionLink,
  WillCard,
  WillLegalNotice,
  WillPageHeader,
  WillSectionHeading,
  formatWillDate
} from "@/components/wills/WillUi";
import { analysePrivateDocument, openPrivateDocument, uploadPrivateDocument, validateDocumentFile } from "@/lib/document-storage";
import type { DiaryDockAppState } from "@/lib/diarydock-data";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument, upsertStructuredReminder } from "@/lib/structured-data";
import type { WillDocumentAnalysis } from "@/lib/will-document-analysis";
import {
  getCurrentWillVersion,
  getPreparationProgress,
  getWillDashboardStatus,
  hydrateWillRecord,
  setCurrentWillVersion,
  type WillRecord,
  type WillVersionStatus
} from "@/lib/will-records";

type UploadStage = "idle" | "uploading" | "processing" | "complete" | "error";

function updateWillState(state: DiaryDockAppState, updater: (record: WillRecord) => WillRecord): DiaryDockAppState {
  return {
    ...state,
    willsWishes: {
      ...state.willsWishes,
      myWill: updater(hydrateWillRecord(state.willsWishes.myWill))
    }
  };
}

function readableFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function analyseWillFile(stored: { bucket: string; path: string }) {
  const payload = await analysePrivateDocument<{ willAnalysis?: WillDocumentAnalysis; error?: string }>(stored, "will");
  if (!payload.willAnalysis) throw new Error(payload.error ?? "The document could not be analysed.");
  return payload.willAnalysis;
}

const lifeEvents = [
  "Marriage or civil partnership",
  "Separation or divorce",
  "Birth or adoption",
  "Death of an executor or beneficiary",
  "New home",
  "Major asset change",
  "Starting or selling a business",
  "Moving country"
];

export function MyWillDashboard() {
  const { state, hydrated, repositoryMode, updateState } = useDiaryDockData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const record = hydrateWillRecord(state.willsWishes.myWill);
  const currentVersion = getCurrentWillVersion(record);
  const currentDocument = currentVersion
    ? state.vaultDocuments.find((document) => document.id === currentVersion.documentId) ?? null
    : null;
  const status = getWillDashboardStatus(record);
  const preparation = getPreparationProgress(record);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionStatus, setVersionStatus] = useState<WillVersionStatus>("signed");
  const [signedDate, setSignedDate] = useState("");
  const [versionNotes, setVersionNotes] = useState("");
  const [makeCurrent, setMakeCurrent] = useState(true);
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [message, setMessage] = useState("");
  const [fileMessage, setFileMessage] = useState("");

  const resetUpload = () => {
    setSelectedFile(null);
    setSignedDate("");
    setVersionNotes("");
    setVersionStatus("signed");
    setMakeCurrent(true);
    setConfirmReplacement(false);
    setUploadStage("idle");
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveVersion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (!selectedFile) {
      setMessage("Choose your will file first.");
      return;
    }
    const validationError = validateDocumentFile(selectedFile);
    if (validationError) {
      setMessage(validationError);
      return;
    }
    if (repositoryMode !== "supabase") {
      setMessage("Secure uploads require the connected DiaryDock account service.");
      return;
    }
    if (currentVersion && makeCurrent && !confirmReplacement) {
      setMessage("Please confirm that this upload should become the current version.");
      return;
    }

    const documentId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const uploadedAt = new Date().toISOString();
    const versionLabel = `v${record.versions.length + 1}.0`;

    try {
      setUploadStage("uploading");
      const storedFile = await uploadPrivateDocument(selectedFile, documentId);
      const nextDocument: VaultDocument = {
        id: documentId,
        title: `Will ${versionLabel}`,
        category: "Legal & Estate",
        kind: selectedFile.type === "application/pdf" ? "PDF" : "Scan",
        size: readableFileSize(selectedFile.size),
        updated: "Just now",
        storageBucket: storedFile.bucket,
        storagePath: storedFile.path,
        originalFileName: selectedFile.name,
        mimeType: selectedFile.type,
        roomId: "office",
        roomName: "Office",
        issuer: "Personal will",
        reviewStatus: "needs-review",
        reviewReasons: ["Please check the document details and AI summary"]
      };

      await upsertStructuredDocument(nextDocument);
      updateState((current) => {
        const withDocument = {
          ...current,
          vaultDocuments: [nextDocument, ...current.vaultDocuments.filter((document) => document.id !== documentId)]
        };
        return updateWillState(withDocument, (currentRecord) => {
          const nextRecord: WillRecord = {
            ...currentRecord,
            versions: [
              ...currentRecord.versions,
              {
                id: versionId,
                documentId,
                versionLabel,
                uploadedAt,
                signedDate: versionStatus === "signed" ? signedDate : "",
                status: versionStatus,
                isCurrent: makeCurrent || !currentRecord.currentVersionId,
                currentConfirmed: !currentRecord.currentVersionId || confirmReplacement,
                notes: versionNotes.trim(),
                analysisStatus: "processing",
                summaryReview: "unreviewed",
                summaryReviewNote: ""
              }
            ],
            updatedAt: uploadedAt
          };
          return makeCurrent || !currentRecord.currentVersionId ? setCurrentWillVersion(nextRecord, versionId) : nextRecord;
        });
      });

      setUploadStage("processing");
      try {
        const analysis = await analyseWillFile(storedFile);
        const analysedDocument: VaultDocument = {
          ...nextDocument,
          extractionSummary: analysis.overview,
          extractedText: analysis.extractedText,
          actionItems: analysis.questionsOrUnclearWording,
          confidence: analysis.confidence,
          reviewStatus: "needs-review",
          reviewReasons: ["Please check the details against the original will"]
        };
        await upsertStructuredDocument(analysedDocument);
        updateState((current) => {
          const withAnalysis = {
            ...current,
            vaultDocuments: current.vaultDocuments.map((document) => document.id === documentId ? analysedDocument : document)
          };
          return updateWillState(withAnalysis, (currentRecord) => ({
            ...currentRecord,
            versions: currentRecord.versions.map((version) => version.id === versionId ? { ...version, analysisStatus: "ready", detectedSummary: analysis } : version),
            updatedAt: new Date().toISOString()
          }));
        });
        setMessage("Your will is securely stored. The informational summary is ready for you to check.");
      } catch {
        updateState((current) => updateWillState(current, (currentRecord) => ({
          ...currentRecord,
          versions: currentRecord.versions.map((version) => version.id === versionId ? { ...version, analysisStatus: "failed" } : version),
          updatedAt: new Date().toISOString()
        })));
        setMessage("Your will is securely stored. DiaryDock could not prepare the summary, but your file is safe and available.");
      }
      setUploadStage("complete");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setUploadStage("error");
      setMessage(error instanceof Error ? error.message : "The upload could not be completed.");
    }
  };

  const viewCurrent = async () => {
    setFileMessage("");
    try {
      await openPrivateDocument(currentDocument?.storageBucket, currentDocument?.storagePath);
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : "Unable to open this document.");
    }
  };

  const reviewNow = () => {
    const today = new Date().toISOString().slice(0, 10);
    updateState((current) => updateWillState(current, (currentRecord) => ({ ...currentRecord, lastReviewedAt: today, updatedAt: new Date().toISOString() })));
    setFileMessage("Review date updated. This records an organisational review, not a legal assessment.");
  };

  const setReviewReminder = async () => {
    if (!record.nextReviewAt) {
      setFileMessage("Add a next review date in Will details before setting a reminder.");
      return;
    }
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: "Review my will records",
      note: "Check that the current version, original location, executors and solicitor details are still accurate.",
      roomId: "office",
      roomName: "Office",
      group: "later",
      timeLabel: formatWillDate(record.nextReviewAt),
      priority: "normal",
      documentId: currentVersion?.documentId,
      documentTitle: currentDocument?.title
    };
    updateState((current) => ({ ...current, reminders: [reminder, ...current.reminders.filter((item) => item.id !== reminder.id)] }));
    try {
      await upsertStructuredReminder(reminder);
      setFileMessage("Review reminder added.");
    } catch {
      setFileMessage("The reminder is saved in this DiaryDock session, but could not be synced just now.");
    }
  };

  if (!hydrated) {
    return <div className="mx-auto w-full max-w-[760px] animate-pulse rounded-[28px] bg-white/60 p-8 text-sm text-[#667068] sm:max-w-[680px] xl:max-w-[760px]">Opening your private will records…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader title="My Will" subtitle="Store, organise and review the information connected to your will." />

      <WillCard>
        <div className="flex items-start gap-3">
          <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] ${status.tone === "complete" ? "bg-[#dde6d8] text-[#45604d]" : status.tone === "attention" ? "bg-[#f3ead7] text-[#816b42]" : "bg-[#eef0e9] text-[#667068]"}`}>
            <UiIcon name={currentVersion ? "lock" : "file"} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-semibold text-[#20352a]">{currentVersion ? "Your will is stored securely" : status.label}</h2>
              {currentVersion ? <span className="rounded-full bg-[#dde6d8] px-2.5 py-1 text-[10px] font-semibold text-[#45604d]">{status.label}</span> : null}
            </div>
            {currentVersion ? (
              <dl className="mt-3 grid gap-2 text-[12px] text-[#667068] sm:grid-cols-3">
                <div><dt className="font-semibold text-[#20352a]/70">Uploaded</dt><dd className="mt-0.5">{formatWillDate(currentVersion.uploadedAt)}</dd></div>
                <div><dt className="font-semibold text-[#20352a]/70">Signed</dt><dd className="mt-0.5">{formatWillDate(currentVersion.signedDate)}</dd></div>
                <div><dt className="font-semibold text-[#20352a]/70">Last reviewed</dt><dd className="mt-0.5">{formatWillDate(record.lastReviewedAt)}</dd></div>
              </dl>
            ) : <p className="mt-1 text-[13px] leading-5 text-[#667068]">Add an existing will, or begin organising information for a future solicitor appointment.</p>}
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {currentVersion ? (
            <>
              <button type="button" onClick={() => void viewCurrent()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#203f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 motion-reduce:transition-none"><UiIcon name="file" className="h-4 w-4" />View current will</button>
              <button type="button" onClick={() => { resetUpload(); setShowUpload(true); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] border border-[#6f8e72]/30 bg-white px-4 py-3 text-sm font-semibold text-[#294436] transition hover:bg-[#f3f6ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 motion-reduce:transition-none"><UiIcon name="plus" className="h-4 w-4" />Update or replace</button>
              <Link href="/wills/my-will/details" className="sm:col-span-2 inline-flex min-h-11 items-center justify-center rounded-[15px] bg-[#eef2e9] px-4 py-2.5 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2">Review will details</Link>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { resetUpload(); setShowUpload(true); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#203f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 motion-reduce:transition-none"><UiIcon name="plus" className="h-4 w-4" />Upload an existing will</button>
              <Link href="/wills/my-will/preparation" className="inline-flex min-h-12 items-center justify-center rounded-[15px] border border-[#6f8e72]/30 bg-white px-4 py-3 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2">Start organising my information</Link>
            </>
          )}
        </div>
        {fileMessage ? <p role="status" className="mt-3 rounded-xl bg-[#f3f4ed] px-3 py-2.5 text-[12px] leading-5 text-[#59655d]">{fileMessage}</p> : null}
      </WillCard>

      {showUpload ? (
        <WillCard className="border-[#6f8e72]/20" as="section">
          <div className="flex items-start justify-between gap-3">
            <WillSectionHeading icon="plus" title={currentVersion ? "Add a newer version" : "Upload your will"} description="The original file is kept private. Previous versions are preserved." />
            <button type="button" onClick={() => { setShowUpload(false); resetUpload(); }} aria-label="Close upload form" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#667068] hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="plus" className="h-4 w-4 rotate-45" /></button>
          </div>
          <form className="mt-5 space-y-4" onSubmit={saveVersion}>
            <label className="block">
              <span className="text-sm font-semibold text-[#20352a]">Will file</span>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/jpeg,image/png,image/webp,image/heic" onChange={(event) => { const file = event.target.files?.[0] ?? null; setSelectedFile(file); setMessage(file ? validateDocumentFile(file) ?? "" : ""); }} className="mt-2 block min-h-12 w-full rounded-[15px] border border-dashed border-[#6f8e72]/45 bg-[#f8f8f2] px-3 py-3 text-sm text-[#59655d] file:mr-3 file:rounded-full file:border-0 file:bg-[#dde6d8] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]" />
              <span className="mt-1.5 block text-[11px] leading-4 text-[#758078]">PDF, JPEG, PNG, WebP or HEIC, up to 4 MB.</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="text-sm font-semibold text-[#20352a]">Copy type</span><select value={versionStatus} onChange={(event) => setVersionStatus(event.target.value as WillVersionStatus)} className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a] outline-none focus:border-[#6f8e72]"><option value="signed">Signed copy</option><option value="draft">Draft</option></select></label>
              <label className="block"><span className="text-sm font-semibold text-[#20352a]">Date signed <span className="font-normal text-[#667068]">(if known)</span></span><input type="date" value={signedDate} disabled={versionStatus === "draft"} onChange={(event) => setSignedDate(event.target.value)} className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a] outline-none focus:border-[#6f8e72] disabled:bg-[#f2f2ed]" /></label>
            </div>
            <label className="block"><span className="text-sm font-semibold text-[#20352a]">Version notes <span className="font-normal text-[#667068]">(optional)</span></span><textarea value={versionNotes} onChange={(event) => setVersionNotes(event.target.value)} rows={3} className="mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm text-[#20352a] outline-none focus:border-[#6f8e72]" placeholder="For example, updated executors or signed after moving home." /></label>
            {currentVersion ? (
              <div className="space-y-3 rounded-[16px] bg-[#f4f5ee] p-3.5">
                <label className="flex min-h-11 items-center gap-3 text-sm text-[#20352a]"><input type="checkbox" checked={makeCurrent} onChange={(event) => { setMakeCurrent(event.target.checked); setConfirmReplacement(false); }} className="h-5 w-5 accent-[#52705a]" />Make this the current version</label>
                {makeCurrent ? <label className="flex min-h-11 items-start gap-3 text-[12px] leading-5 text-[#59655d]"><input type="checkbox" checked={confirmReplacement} onChange={(event) => setConfirmReplacement(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#52705a]" />I confirm this upload should become current. The previous version will remain available and will be marked superseded.</label> : null}
              </div>
            ) : null}
            {message ? <p role="status" className={`rounded-[14px] px-3.5 py-3 text-[12px] leading-5 ${uploadStage === "error" ? "bg-red-50 text-red-700" : "bg-[#eef2e9] text-[#45604d]"}`}>{message}</p> : null}
            <button type="submit" disabled={uploadStage === "uploading" || uploadStage === "processing"} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#203f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"><UiIcon name={uploadStage === "processing" ? "clock" : "lock"} className="h-4 w-4" />{uploadStage === "uploading" ? "Uploading securely…" : uploadStage === "processing" ? "Stored — preparing summary…" : "Store this version"}</button>
          </form>
        </WillCard>
      ) : null}

      <section aria-labelledby="will-tools-heading">
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f8e72]">Overview</p><h2 id="will-tools-heading" className="mt-1 text-xl font-semibold text-[#20352a]">Your will tools</h2></div>{record.versions.length ? <span className="text-xs text-[#667068]">{record.versions.length} version{record.versions.length === 1 ? "" : "s"}</span> : null}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <WillActionLink href="/wills/my-will/summary" icon="leaf" title="Will summary" detail={currentVersion?.analysisStatus === "ready" ? "Plain-language overview ready to check" : currentVersion ? "Summary is not available yet" : "Available after an uploaded will is analysed"} />
          <WillActionLink href="/wills/my-will/history" icon="clock" title="Version history" detail={`${record.versions.length} stored version${record.versions.length === 1 ? "" : "s"}`} />
          <WillActionLink href="/wills/my-will/details" icon="users" title="Executor details" detail={record.primaryExecutor.name ? `Primary: ${record.primaryExecutor.name}` : "Primary and backup executors not recorded"} />
          <WillActionLink href="/wills/my-will/record-check" icon="check" title="Will record check" detail="Review practical gaps in your records" />
        </div>
      </section>

      <WillCard>
        <WillSectionHeading icon="calendar" title="Next review" description="You may wish to review your will records after a major life change." />
        <div className="mt-4 flex flex-wrap gap-2">{lifeEvents.map((event) => <span key={event} className="rounded-full bg-[#f1f2eb] px-3 py-1.5 text-[11px] text-[#5f6b63]">{event}</span>)}</div>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <p className="mr-auto text-sm text-[#667068]">Review date: <span className="font-semibold text-[#20352a]">{formatWillDate(record.nextReviewAt)}</span></p>
          <button type="button" onClick={reviewNow} className="min-h-11 rounded-[14px] border border-[#6f8e72]/30 bg-white px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Review now</button>
          <button type="button" onClick={() => void setReviewReminder()} className="min-h-11 rounded-[14px] bg-[#dde6d8] px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Set reminder</button>
        </div>
      </WillCard>

      <WillCard>
        <WillSectionHeading icon="briefcase" title="Will preparation" description="Organise information a solicitor may need. This does not create a will." />
        <div className="mt-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e6e9df]"><div className="h-full rounded-full bg-[#6f8e72]" style={{ width: `${(preparation.complete / preparation.total) * 100}%` }} /></div><span className="text-xs font-semibold text-[#45604d]">{preparation.complete}/{preparation.total}</span></div>
        <Link href="/wills/my-will/preparation" className="mt-4 inline-flex min-h-11 w-full items-center justify-between rounded-[15px] bg-[#f1f3ec] px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><span>{preparation.started ? "Continue organising" : "Start organising"}</span><UiIcon name="chevron-right" className="h-4 w-4" /></Link>
      </WillCard>

      <WillLegalNotice />
    </div>
  );
}
