"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { CaptureIdleView } from "@/components/document-capture/CaptureIdleView";
import {
  activeCaptureStage,
  captureStageIndex,
} from "@/components/document-capture/capture-model";
import { CaptureProcessingView } from "@/components/document-capture/CaptureProcessingView";
import {
  CaptureCompleteView,
  CaptureErrorView,
} from "@/components/document-capture/CaptureResultViews";
import { CaptureReviewView } from "@/components/document-capture/CaptureReviewView";
import { useDocumentCapture } from "@/components/document-capture/use-document-capture";
import { UiIcon } from "@/components/UiIcon";
import type { SuggestedRoom } from "@/lib/document-extraction";
import { roomDetails } from "@/lib/mock-data";

export function DocumentCaptureWorkspace() {
  const searchParams = useSearchParams();
  const preferredRoomId = searchParams.get("room");
  const preferredRoom = preferredRoomId ? roomDetails[preferredRoomId] : null;
  const capture = useDocumentCapture(preferredRoom);
  const activeStage = activeCaptureStage(capture.stage);
  const filingRoom = (capture.draft?.suggestedRoom ??
    preferredRoom?.name ??
    "Office") as SuggestedRoom;
  const title = activeStage
    ? "Organising"
    : capture.draft && capture.stage === "review"
      ? "Check details"
      : capture.draft && capture.stage === "complete"
        ? capture.savedDocumentId
          ? "Saved"
          : "Ready"
        : "Add document";

  return (
    <div className="relative -mx-4 -mt-5 min-h-[100svh] overflow-x-hidden bg-[linear-gradient(180deg,#dcecf7_0%,#f7fbfc_48%,#edf5ee_100%)] pb-28 text-slate-900 sm:-mx-6">
      <Image
        src="/images/estate-dashboard-country.png"
        alt=""
        fill
        sizes="100vw"
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-center transition duration-700 ${activeStage || (capture.draft && capture.stage === "complete") ? "opacity-72" : "scale-105 opacity-32 blur-[2px]"}`}
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
              {title}
            </h1>
            {!activeStage &&
            !(capture.draft && capture.stage === "complete") ? (
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {capture.stage === "review"
                  ? "Nothing is saved until you confirm"
                  : "Add every page in reading order"}
              </p>
            ) : null}
          </div>
          <span className="flex min-w-10 items-center justify-center rounded-full border border-white/85 bg-white/72 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-xl">
            {capture.selectedFiles.length ? (
              `${capture.selectedFiles.length} page${capture.selectedFiles.length === 1 ? "" : "s"}`
            ) : (
              <UiIcon name="shield" className="h-4 w-4" />
            )}
          </span>
        </header>

        {capture.stage === "idle" ? (
          <CaptureIdleView
            onAddPages={capture.addPages}
            onAnalyze={() => void capture.analyzePages()}
            onRemovePage={capture.removePage}
            previewUrls={capture.previewUrls}
            selectedFiles={capture.selectedFiles}
          />
        ) : null}
        {activeStage ? (
          <CaptureProcessingView
            filingRoom={filingRoom}
            previewUrl={capture.previewUrls[0]}
            processingIndex={captureStageIndex(activeStage)}
          />
        ) : null}
        {capture.draft && capture.stage === "review" ? (
          <CaptureReviewView
            createReminder={capture.createReminder}
            draft={capture.draft}
            hasPendingFiles={capture.hasPendingFiles}
            onBack={capture.backWithoutSaving}
            onSave={() => void capture.save()}
            reminderTimeLabel={capture.reminderTimeLabel}
            setCreateReminder={capture.setCreateReminder}
            setDraft={capture.setDraft}
            setReminderTimeLabel={capture.setReminderTimeLabel}
          />
        ) : null}
        {capture.draft && capture.stage === "complete" ? (
          <CaptureCompleteView
            createReminder={capture.createReminder}
            draft={capture.draft}
            onAnother={capture.scanAnother}
            pageCount={capture.selectedFiles.length}
            proposalCount={capture.proposalCount}
            reminderTimeLabel={capture.reminderTimeLabel}
            savedDocumentId={capture.savedDocumentId}
          />
        ) : null}
        {capture.stage === "error" ? (
          <CaptureErrorView
            error={capture.errorMessage}
            onRetry={capture.retry}
          />
        ) : null}
      </div>
    </div>
  );
}
