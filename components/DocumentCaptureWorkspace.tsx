"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { type DocumentExtractionResult, type SuggestedRoom } from "@/lib/document-extraction";
import { sanitizeDocumentFileName, uploadPrivateDocument } from "@/lib/document-storage";
import { roomDetails, type Reminder, type RoomActivity, type RoomDocument, type VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument, upsertStructuredReminder } from "@/lib/structured-data";

const MAX_ANALYSIS_UPLOAD_SIZE = 3.5 * 1024 * 1024;
const MAX_ANALYSIS_IMAGE_EDGE = 1800;

const filingRouteTargets: Record<SuggestedRoom, { left: number; imagePosition: number }> = {
  Attic: { left: 50, imagePosition: 16 },
  Bedroom: { left: 25, imagePosition: 36 },
  Office: { left: 54, imagePosition: 36 },
  "Family Room": { left: 25, imagePosition: 58 },
  Kitchen: { left: 36, imagePosition: 58 },
  "Safe Room": { left: 54, imagePosition: 58 },
  Garage: { left: 82, imagePosition: 58 },
  Garden: { left: 21, imagePosition: 80 },
  Driveway: { left: 82, imagePosition: 76 },
  Mailbox: { left: 20, imagePosition: 100 }
};

function blobFromCanvas(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to prepare this image for document reading."));
        }
      },
      "image/jpeg",
      quality
    );
  });
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read this image. Please try another photo."));
    };
    image.src = objectUrl;
  });
}

async function preparePageImage(file: File, maxBytes: number) {
  if (!file.type.startsWith("image/")) {
    throw new Error("DiaryDock can currently scan photographed image pages only.");
  }

  const image = await loadImageFromFile(file);
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, MAX_ANALYSIS_IMAGE_EDGE / longestEdge);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare this page for document reading.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.84;
  let blob = await blobFromCanvas(canvas, quality);
  while (blob.size > maxBytes && quality > 0.34) {
    quality -= 0.1;
    blob = await blobFromCanvas(canvas, quality);
  }

  if (blob.size > maxBytes) {
    throw new Error("One page is too detailed to upload. Please crop it closer to the document and try again.");
  }

  const baseName = sanitizeDocumentFileName(file.name.replace(/\.[^.]+$/, "")) || "document-page";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

async function createCombinedPdf(files: File[]) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();

  for (const file of files) {
    const image = await pdf.embedJpg(await file.arrayBuffer());
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const availableWidth = pageWidth - 40;
    const availableHeight = pageHeight - 40;
    const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const page = pdf.addPage([pageWidth, pageHeight]);

    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height
    });
  }

  const bytes = await pdf.save();
  return new File([bytes], `diarydock-${files.length}-page-scan.pdf`, {
    type: "application/pdf",
    lastModified: Date.now()
  });
}

async function readCaptureApiPayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as {
      extraction?: DocumentExtractionResult;
      error?: string;
    };
  }

  const text = (await response.text()).trim();
  return {
    error: text.toLowerCase().includes("request entity") || text.toLowerCase().includes("request body")
      ? "That photo was too large for document reading. DiaryDock now compresses large images automatically, so please try the scan again."
      : text || "The document could not be analyzed. Please try again."
  };
}

const roomNameToId: Record<string, string> = {
  Attic: "attic",
  Office: "office",
  Garage: "garage",
  Bedroom: "bedroom",
  "Family Room": "family-room",
  Kitchen: "kitchen",
  Garden: "garden",
  Driveway: "driveway",
  "Safe Room": "safe-room",
  Mailbox: "mailbox"
};

const categoryToDocumentKind: Record<VaultDocument["category"], VaultDocument["kind"]> = {
  Identity: "Scan",
  "Home & Property": "Scan",
  Finance: "PDF",
  "Legal & Estate": "PDF",
  "Health & Medical": "Scan",
  Memories: "Image"
};

function buildReviewReasons(extraction: DocumentExtractionResult) {
  const reasons: string[] = [];

  if (extraction.confidence < 0.85) {
    reasons.push("This document needs a quick confidence check");
  }

  if (!extraction.issuer.trim() || extraction.issuer.toLowerCase().includes("unknown")) {
    reasons.push("Issuer needs checking");
  }

  if (!extraction.title.trim() || extraction.title.toLowerCase().includes("document")) {
    reasons.push("Title may need a clearer name");
  }

  if (!extraction.extractedText.trim()) {
    reasons.push("OCR text is missing");
  }

  return reasons;
}

export function DocumentCaptureWorkspace() {
  const { repositoryMode, updateState } = useLifeDockData();
  const searchParams = useSearchParams();
  const preferredRoomId = searchParams.get("room");
  const preferredRoom = preferredRoomId ? roomDetails[preferredRoomId] : null;
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [preparedFiles, setPreparedFiles] = useState<File[]>([]);
  const [draft, setDraft] = useState<DocumentExtractionResult | null>(null);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<
    "idle" | "preparing" | "reading" | "organising" | "saving" | "complete" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createReminder, setCreateReminder] = useState(false);
  const [reminderTimeLabel, setReminderTimeLabel] = useState("This week");

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  const resetResults = () => {
    setDraft(null);
    setPreparedFiles([]);
    setSavedDocumentId(null);
    setErrorMessage(null);
    setCreateReminder(false);
    setReminderTimeLabel("This week");
    setProcessingStage("idle");
  };

  const addPages = (files: File[]) => {
    if (!files.length) return;

    if (processingStage === "complete" || processingStage === "error") {
      resetResults();
      setSelectedFiles(files.slice(0, 12));
      return;
    }

    setErrorMessage(null);
    setSelectedFiles((current) => [...current, ...files].slice(0, 12));
  };

  const removePage = (index: number) => {
    setSelectedFiles((current) => current.filter((_, pageIndex) => pageIndex !== index));
  };

  async function saveToLifeDock(
    originalFiles: File[],
    preparedFiles: File[],
    extraction: DocumentExtractionResult,
    options: {
      createReminder: boolean;
      reminderTimeLabel: string;
      reminderPriority: Reminder["priority"];
    }
  ) {
    setProcessingStage("saving");

    const roomId = roomNameToId[extraction.suggestedRoom] ?? "office";
    const timestamp = Date.now();
    const documentId = crypto.randomUUID();
    const reminderId = crypto.randomUUID();
    const activityId = `capture-activity-${timestamp}`;
    const mailItemId = `capture-mail-${timestamp}`;
    const storedUpload = originalFiles.length > 1 ? await createCombinedPdf(preparedFiles) : originalFiles[0];
    const documentKind: VaultDocument["kind"] = originalFiles.length > 1 ? "PDF" : categoryToDocumentKind[extraction.category];
    const totalKb = Math.max(1, Math.round(originalFiles.reduce((total, file) => total + file.size, 0) / 1024));
    const fileMeta = `${originalFiles.length} page${originalFiles.length === 1 ? "" : "s"} - ${totalKb} KB`;

    try {
      const storedFile = repositoryMode === "supabase" ? await uploadPrivateDocument(storedUpload, documentId) : null;
      const reviewReasons = buildReviewReasons(extraction);
      const nextDocument: VaultDocument = {
        id: documentId,
        title: extraction.title,
        category: extraction.category,
        kind: documentKind,
        size: fileMeta,
        updated: "Just now",
        storageBucket: storedFile?.bucket,
        storagePath: storedFile?.path,
        originalFileName: storedUpload.name,
        mimeType: storedUpload.type || "application/octet-stream",
        roomId,
        roomName: extraction.suggestedRoom,
        issuer: extraction.issuer,
        dueDate: extraction.dueDate,
        extractionSummary: extraction.summary,
        extractedText: extraction.extractedText,
        actionItems: extraction.actionItems,
        confidence: extraction.confidence,
        reviewStatus: reviewReasons.length ? "needs-review" : "reviewed",
        reviewReasons,
        reviewedAt: reviewReasons.length ? undefined : "Just now"
      };
      const nextRoomDocument: RoomDocument = {
        id: `${roomId}-${documentId}`,
        title: extraction.title,
        kind: documentKind,
        size: fileMeta,
        updated: "Just now"
      };
      const nextActivity: RoomActivity = {
        id: activityId,
        text: `DiaryDock read ${originalFiles.length} page${originalFiles.length === 1 ? "" : "s"}, filed ${extraction.title}, and stored the original`,
        when: "Just now",
        by: "DiaryDock"
      };
      const reminderNote = [
        extraction.issuer,
        extraction.summary,
        extraction.dueDate ? `Due: ${extraction.dueDate}` : ""
      ]
        .filter(Boolean)
        .join(" - ");
      const nextReminder: Reminder | null = options.createReminder
        ? {
            id: reminderId,
            title: extraction.reminderTitle || `Follow up on ${extraction.title}`,
            note: reminderNote,
            roomId,
            roomName: extraction.suggestedRoom,
            group:
              options.reminderTimeLabel === "Today"
                ? "today"
                : options.reminderTimeLabel.includes("month")
                  ? "later"
                  : "week",
            timeLabel: options.reminderTimeLabel,
            priority: options.reminderPriority,
            documentId,
            documentTitle: extraction.title
          }
        : null;

      updateState((current) => ({
        ...current,
        vaultDocuments: [nextDocument, ...current.vaultDocuments],
        reminders: nextReminder ? [nextReminder, ...current.reminders] : current.reminders,
        roomDocuments: {
          ...current.roomDocuments,
          [roomId]: [nextRoomDocument, ...(current.roomDocuments[roomId] ?? [])]
        },
        roomActivity: {
          ...current.roomActivity,
          [roomId]: [nextActivity, ...(current.roomActivity[roomId] ?? [])]
        },
        mailboxItems: [
          {
            id: mailItemId,
            title: extraction.title,
            source: extraction.issuer || "Mobile capture",
            kind: extraction.detectedDocumentType.toLowerCase().includes("bill")
              ? "Bill"
              : extraction.detectedDocumentType.toLowerCase().includes("form")
                ? "Form"
                : extraction.detectedDocumentType.toLowerCase().includes("statement")
                  ? "Statement"
                  : "Letter",
            suggestedRoom: extraction.suggestedRoom,
            routeStatus: options.createReminder ? "reminder" : "room"
          },
          ...current.mailboxItems
        ]
      }));

      if (repositoryMode === "supabase") {
        await upsertStructuredDocument(nextDocument);
        if (nextReminder) await upsertStructuredReminder(nextReminder);
      }

      setSavedDocumentId(documentId);
      setProcessingStage("complete");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `The document could not be saved: ${error.message}`
          : "The document could not be saved. Please try again."
      );
      setProcessingStage("error");
    }
  }

  async function analyzePages(files: File[]) {
    if (!files.length) return;

    setDraft(null);
    setErrorMessage(null);
    setProcessingStage("preparing");

    try {
      const pageBudget = Math.max(220 * 1024, Math.floor(MAX_ANALYSIS_UPLOAD_SIZE / files.length));
      const preparedFiles = await Promise.all(files.map((file) => preparePageImage(file, pageBudget)));
      setProcessingStage("reading");
      const formData = new FormData();
      preparedFiles.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/capture/extract", { method: "POST", body: formData });
      const payload = await readCaptureApiPayload(response);
      if (!response.ok || !payload.extraction) {
        throw new Error(payload.error || "The document could not be analysed.");
      }

      const extraction = preferredRoom
        ? {
            ...payload.extraction,
            suggestedRoom: preferredRoom.name as DocumentExtractionResult["suggestedRoom"]
          }
        : payload.extraction;
      const shouldCreateReminder = Boolean(extraction.reminderTitle);
      const nextReminderTime = extraction.reminderTimeLabel || "This week";
      setDraft(extraction);
      setPreparedFiles(preparedFiles);
      setCreateReminder(shouldCreateReminder);
      setReminderTimeLabel(nextReminderTime);
      setProcessingStage("organising");
      // Keep the confirmed route visible long enough to understand where the document is going.
      await new Promise((resolve) => window.setTimeout(resolve, 1800));
      await saveToLifeDock(files, preparedFiles, extraction, {
        createReminder: shouldCreateReminder,
        reminderTimeLabel: nextReminderTime,
        reminderPriority: extraction.dueDate ? "high" : "normal"
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to read this document right now.");
      setProcessingStage("error");
    }
  }

  const processingLabels = {
    preparing: ["OPTIMISING PAGES", "Making every page crystal clear"],
    reading: ["READING PAGES", `Reading ${selectedFiles.length} page${selectedFiles.length === 1 ? "" : "s"} together`],
    organising: ["SMART FILING", "Finding its room, category and dates"],
    saving: ["SECURE FILES", "Combining and saving your document"]
  } as const;
  const activeProcessingStage =
    processingStage === "preparing" ||
    processingStage === "reading" ||
    processingStage === "organising" ||
    processingStage === "saving"
      ? processingStage
      : null;
  const processingSteps = ["Read", "Understand", "File"];
  const processingIndex = activeProcessingStage
    ? activeProcessingStage === "preparing" || activeProcessingStage === "reading"
      ? 0
      : activeProcessingStage === "organising"
        ? 1
        : 2
    : 0;
  const filingRoom = (draft?.suggestedRoom ?? preferredRoom?.name ?? "Office") as SuggestedRoom;
  const filingTarget = filingRouteTargets[filingRoom] ?? filingRouteTargets.Office;
  const filingTargetX = Math.round(filingTarget.left * 3.4);
  const filingRoutePath = `M170 24 C170 72 ${filingTargetX} 76 ${filingTargetX} 140`;

  return (
    <div className="relative -mx-4 -mt-5 min-h-[100svh] overflow-hidden bg-[linear-gradient(180deg,#dcecf7_0%,#f7fbfc_48%,#edf5ee_100%)] pb-28 text-slate-900 sm:-mx-6">
      <img
        src="/images/estate-dashboard-country.png"
        alt=""
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-center transition duration-700 ${
          activeProcessingStage || (draft && processingStage === "complete") ? "opacity-72" : "scale-105 opacity-32 blur-[2px]"
        }`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(235,246,253,0.78)_0%,rgba(247,251,252,0.46)_40%,rgba(239,247,241,0.9)_100%)]" />

      <div className="relative mx-auto flex min-h-[calc(100svh-7rem)] w-full max-w-md flex-col px-5 pt-5">
        <header className="flex items-center justify-between">
          <Link
            href="/files"
            aria-label="Back to All Files"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/85 bg-white/72 text-slate-700 shadow-[0_14px_28px_-20px_rgba(30,64,73,0.45)] backdrop-blur-xl"
          >
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </Link>
          <div className="text-center">
            <h1 className="text-[18px] font-semibold tracking-[-0.025em] text-slate-900">
              {activeProcessingStage ? "Organising" : draft && processingStage === "complete" ? (savedDocumentId ? "Saved" : "Ready") : "Add document"}
            </h1>
            {!activeProcessingStage && !(draft && processingStage === "complete") ? (
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Add every page in reading order</p>
            ) : null}
          </div>
          <span className="flex min-w-10 items-center justify-center rounded-full border border-white/85 bg-white/72 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-xl">
            {selectedFiles.length ? `${selectedFiles.length} page${selectedFiles.length === 1 ? "s" : ""}` : <UiIcon name="shield" className="h-4 w-4" />}
          </span>
        </header>

        {processingStage === "idle" ? (
          <main className="flex flex-1 flex-col justify-center py-8">
            <section className="rounded-[32px] border border-white/90 bg-white/68 p-5 shadow-[0_28px_70px_-35px_rgba(39,72,77,0.48)] backdrop-blur-2xl">
              <div className="relative mx-auto flex h-44 w-full max-w-[260px] items-center justify-center rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,rgba(234,245,250,0.9),rgba(255,255,255,0.65))] shadow-inner">
                {previewUrls[0] ? (
                  <>
                    <span className="absolute h-28 w-20 translate-x-5 rotate-[7deg] rounded-2xl border border-slate-200 bg-white/85 shadow-lg" />
                    <span className="absolute h-28 w-20 -translate-x-4 -rotate-6 rounded-2xl border border-slate-200 bg-white/95 shadow-xl" />
                    <img src={previewUrls[0]} alt="First selected page" className="relative z-10 h-28 w-20 rounded-2xl border-4 border-white object-cover shadow-xl" />
                  </>
                ) : (
                  <img
                    src="/images/capture-document-stack.png"
                    alt="A secure stack of household documents ready to add"
                    className="relative z-10 h-40 w-40 rounded-[24px] object-contain mix-blend-multiply drop-shadow-[0_18px_18px_rgba(71,85,105,0.18)]"
                  />
                )}
              </div>

              <div className="mt-5 text-center">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  {selectedFiles.length ? `${selectedFiles.length} page${selectedFiles.length === 1 ? "" : "s"} ready` : "Add one or more pages"}
                </h2>
                <p className="mx-auto mt-1 max-w-[260px] text-sm leading-5 text-slate-500">
                  {selectedFiles.length ? "Check the order, add any missing pages, then continue." : "Photograph each page or choose several together."}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] bg-[#86a774] px-3 py-4 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_rgba(65,98,63,0.75)] transition hover:bg-[#789968]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/18">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2l1.2-1.5h4.6L15.5 6h2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
                      <circle cx="12" cy="12.5" r="3.2" />
                    </svg>
                  </span>
                  Take photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(event) => {
                      addPages(Array.from(event.target.files ?? []));
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border border-white/90 bg-white/82 px-3 py-4 text-sm font-semibold text-slate-800 shadow-[0_18px_34px_-24px_rgba(36,63,72,0.45)] transition hover:bg-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                    <UiIcon name="file" className="h-5 w-5" />
                  </span>
                  Choose pages
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      addPages(Array.from(event.target.files ?? []));
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#66815f]">
                <UiIcon name="leaf" className="h-3.5 w-3.5" />
                You can add up to 12 pages
              </p>

              {selectedFiles.length ? (
                <>
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {previewUrls.map((url, index) => (
                      <div key={`${url}-${index}`} className="relative h-24 w-[70px] shrink-0 overflow-hidden rounded-[14px] border-2 border-white bg-white p-1 shadow-md">
                        <img src={url} alt={`Document page ${index + 1}`} className="h-full w-full rounded-[10px] object-cover" />
                        <span className="absolute bottom-1.5 left-1/2 flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full bg-slate-800 px-1 text-[9px] font-bold text-white">{index + 1}</span>
                        <button type="button" aria-label={`Remove page ${index + 1}`} onClick={() => removePage(index)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-700 shadow">
                          <UiIcon name="plus" className="h-3 w-3 rotate-45" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void analyzePages(selectedFiles)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-[20px] bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_rgba(15,23,42,0.75)]"
                  >
                    Continue
                    <UiIcon name="chevron-right" className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </section>
          </main>
        ) : null}

        {activeProcessingStage ? (
          <main className="flex flex-1 flex-col justify-center py-6">
            <div className="relative mx-auto h-36 w-28">
              <span className="absolute inset-0 translate-x-4 rotate-6 rounded-[18px] border border-slate-200 bg-white/78 shadow-lg" />
              <span className="absolute inset-0 -translate-x-3 -rotate-6 rounded-[18px] border border-slate-200 bg-white/88 shadow-lg" />
              {previewUrls[0] ? (
                <img src={previewUrls[0]} alt="Document being organised" className="relative z-10 h-full w-full rounded-[18px] border-4 border-white object-cover shadow-xl" />
              ) : null}
            </div>

            <div className="relative mt-5 overflow-hidden rounded-[30px] border border-white/85 bg-white/35 shadow-[0_28px_65px_-38px_rgba(30,61,72,0.55)] backdrop-blur-sm">
              <img
                src="/images/estate-dashboard-country.png"
                alt="DiaryDock estate"
                className="h-[280px] w-full object-cover transition-[object-position] duration-700"
                style={{ objectPosition: `center ${filingTarget.imagePosition}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/45" />
              <div
                className="absolute z-10 rounded-full border border-white/75 bg-slate-950/88 px-3.5 py-2 text-[11px] font-bold tracking-wide text-white shadow-[0_0_0_4px_rgba(223,242,215,0.32),0_10px_26px_rgba(15,23,42,0.4)] backdrop-blur-xl transition-all duration-700"
                style={{ left: `${filingTarget.left}%`, top: "54%", transform: "translate(-50%, -50%)" }}
              >
                {filingRoom}
              </div>
              <svg aria-hidden="true" viewBox="0 0 340 260" className="pointer-events-none absolute inset-0 h-full w-full">
                <path d={filingRoutePath} fill="none" stroke="rgba(151,203,126,0.95)" strokeWidth="4" strokeLinecap="round" strokeDasharray="3 8" className="lifedock-route-line drop-shadow-[0_0_5px_rgba(128,190,106,0.9)]" />
                <circle cx={filingTargetX} cy="140" r="7" fill="rgba(223,242,215,0.88)" stroke="rgba(104,145,88,0.95)" strokeWidth="3" className="drop-shadow-[0_0_7px_rgba(128,190,106,0.95)]" />
              </svg>
            </div>

            <section className="relative -mt-4 rounded-[28px] border border-white/90 bg-white/82 p-5 shadow-[0_24px_55px_-30px_rgba(32,61,70,0.45)] backdrop-blur-2xl">
              <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
                {["Reading", "Organising", "Filing"].map((step, index) => (
                  <div key={step} className="contents">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full border ${index < processingIndex ? "border-[#98bd82] bg-[#86a774] text-white" : index === processingIndex ? "border-[#8eac7d] bg-white text-[#6d9060] shadow-[0_0_0_6px_rgba(134,167,116,0.13)]" : "border-slate-200 bg-white/60 text-slate-300"}`}>
                        {index < processingIndex ? <UiIcon name="check" className="h-4 w-4" /> : index === processingIndex ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                      </span>
                      <span className={`text-[10px] font-semibold ${index <= processingIndex ? "text-slate-700" : "text-slate-400"}`}>{step}</span>
                    </div>
                    {index < 2 ? <span className={`mb-5 h-0.5 rounded-full ${index < processingIndex ? "bg-[#86a774]" : "bg-slate-200"}`} /> : null}
                  </div>
                ))}
              </div>
            </section>
          </main>
        ) : null}

        {draft && processingStage === "complete" ? (
          <main className="flex flex-1 flex-col justify-end pb-2 pt-6">
            <div className="pointer-events-none absolute inset-x-0 top-20 h-[52%] overflow-hidden">
              <img src="/images/estate-dashboard-country.png" alt="" className="h-full w-full object-cover object-[center_32%]" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/85" />
            </div>
            <section className="relative rounded-[30px] border border-white/90 bg-white/84 p-5 shadow-[0_28px_65px_-34px_rgba(31,61,69,0.55)] backdrop-blur-2xl">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dfeeda] text-[#5d8350]">
                  <UiIcon name="check" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-xl font-semibold tracking-tight text-slate-900">{draft.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">{selectedFiles.length} page{selectedFiles.length === 1 ? "" : "s"} filed automatically</p>
                </div>
              </div>

              <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-[20px] border border-slate-100 bg-white/68">
                <div className="flex items-center gap-3 px-4 py-3">
                  <UiIcon name="home" className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-800">{draft.suggestedRoom}</span>
                  <span className="ml-auto text-xs font-semibold text-[#66875c]">Room</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <UiIcon name="shield" className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-800">{draft.category}</span>
                  <span className="ml-auto text-xs font-semibold text-[#66875c]">Category</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <UiIcon name="calendar" className="h-4 w-4 text-slate-500" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {createReminder ? `Reminder: ${reminderTimeLabel}` : "No reminder needed"}
                  </span>
                </div>
              </div>

              <Link href={savedDocumentId ? `/document/${savedDocumentId}` : "/files"} className="mt-4 flex w-full items-center justify-center gap-2 rounded-[19px] bg-[#86a774] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_30px_-20px_rgba(67,102,63,0.7)]">
                <UiIcon name="file" className="h-4 w-4" />
                View in DiaryDock
              </Link>

              <button type="button" onClick={() => { setSelectedFiles([]); resetResults(); }} className="mt-3 w-full text-center text-sm font-semibold text-[#5f8155]">
                Scan another
              </button>
            </section>
          </main>
        ) : null}

        {processingStage === "error" ? (
          <main className="flex flex-1 items-center justify-center py-8">
            <section className="w-full rounded-[30px] border border-white/90 bg-white/84 p-6 text-center shadow-[0_28px_65px_-34px_rgba(31,61,69,0.55)] backdrop-blur-2xl">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600"><UiIcon name="alert" className="h-5 w-5" /></span>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">That document did not finish</h2>
              <p className="mt-2 text-sm leading-5 text-rose-600">{errorMessage || "Please check the pages and try again."}</p>
              <button type="button" onClick={() => { setProcessingStage("idle"); setErrorMessage(null); }} className="mt-5 rounded-full bg-[#86a774] px-5 py-3 text-sm font-semibold text-white">Review pages</button>
            </section>
          </main>
        ) : null}
      </div>
    </div>
  );
}
