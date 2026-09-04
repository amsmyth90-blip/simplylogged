"use client";

import { useRef, useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { WillDashboardTools } from "@/components/wills/WillDashboardTools";
import { WillStatusCard } from "@/components/wills/WillStatusCard";
import { WillUploadPanel } from "@/components/wills/WillUploadPanel";
import {
  WillPageHeader,
  formatWillDate
} from "@/components/wills/WillUi";
import { analyseWillFile, readableWillFileSize, updateWillState, type WillUploadStage } from "@/components/wills/my-will-dashboard-model";
import { openPrivateDocument, uploadPrivateDocument, validateDocumentFile } from "@/lib/document-storage";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument, upsertStructuredReminder } from "@/lib/structured-data";
import {
  getCurrentWillVersion,
  getPreparationProgress,
  getWillDashboardStatus,
  hydrateWillRecord,
  setCurrentWillVersion,
  type WillRecord,
  type WillVersionStatus
} from "@/lib/will-records";

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
  const [uploadStage, setUploadStage] = useState<WillUploadStage>("idle");
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
        size: readableWillFileSize(selectedFile.size),
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

      <WillStatusCard
        currentVersion={currentVersion}
        fileMessage={fileMessage}
        onOpenUpload={() => { resetUpload(); setShowUpload(true); }}
        onViewCurrent={() => void viewCurrent()}
        record={record}
        status={status}
      />

      {showUpload ? (
        <WillUploadPanel
          confirmReplacement={confirmReplacement}
          currentVersion={Boolean(currentVersion)}
          fileInputRef={fileInputRef}
          makeCurrent={makeCurrent}
          message={message}
          onClose={() => { setShowUpload(false); resetUpload(); }}
          onConfirmReplacementChange={setConfirmReplacement}
          onFileChange={(file) => { setSelectedFile(file); setMessage(file ? validateDocumentFile(file) ?? "" : ""); }}
          onMakeCurrentChange={(value) => { setMakeCurrent(value); setConfirmReplacement(false); }}
          onSignedDateChange={setSignedDate}
          onSubmit={saveVersion}
          onVersionNotesChange={setVersionNotes}
          onVersionStatusChange={setVersionStatus}
          signedDate={signedDate}
          uploadStage={uploadStage}
          versionNotes={versionNotes}
          versionStatus={versionStatus}
        />
      ) : null}

      <WillDashboardTools
        currentVersion={currentVersion}
        preparation={preparation}
        record={record}
        onReviewNow={reviewNow}
        onSetReminder={() => void setReviewReminder()}
      />
    </div>
  );
}
