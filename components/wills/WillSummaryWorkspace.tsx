"use client";

import Link from "next/link";
import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  WillCard,
  WillLegalNotice,
  WillPageHeader,
} from "@/components/wills/WillUi";
import { WillReadySummary } from "@/components/wills/summary/WillReadySummary";
import { buildWillSummarySections } from "@/components/wills/summary/will-summary-sections";
import type { DiaryDockAppState } from "@/lib/diarydock-data";
import {
  getCurrentWillVersion,
  hydrateWillRecord,
  type WillRecord,
  type WillSummaryReview,
} from "@/lib/will-records";

function updateWill(
  state: DiaryDockAppState,
  updater: (record: WillRecord) => WillRecord,
) {
  return {
    ...state,
    willsWishes: {
      ...state.willsWishes,
      myWill: updater(hydrateWillRecord(state.willsWishes.myWill)),
    },
  };
}

export function WillSummaryWorkspace() {
  const { state, hydrated, updateState } = useDiaryDockData();
  const record = hydrateWillRecord(state.willsWishes.myWill);
  const currentVersion = getCurrentWillVersion(record);
  const document = currentVersion
    ? (state.vaultDocuments.find(
        (item) => item.id === currentVersion.documentId,
      ) ?? null)
    : null;
  const [reviewNote, setReviewNote] = useState(
    currentVersion?.summaryReviewNote ?? "",
  );
  const [message, setMessage] = useState("");
  const sections = buildWillSummarySections(
    record,
    currentVersion?.detectedSummary,
  );

  const saveReview = (review: WillSummaryReview) => {
    if (!currentVersion) return;
    updateState((current) =>
      updateWill(current, (currentRecord) => ({
        ...currentRecord,
        versions: currentRecord.versions.map((version) =>
          version.id === currentVersion.id
            ? {
                ...version,
                summaryReview: review,
                summaryReviewNote:
                  review === "incorrect" ? reviewNote.trim() : "",
              }
            : version,
        ),
        updatedAt: new Date().toISOString(),
      })),
    );
    setMessage(
      review === "incorrect"
        ? "Marked for correction. No extracted information was saved as confirmed data."
        : "Summary review recorded. Always keep the original document as your reference.",
    );
  };

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-[760px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068] sm:max-w-[680px] xl:max-w-[760px]">
        Preparing the summary…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader
        title="Will summary"
        subtitle="A plain-language overview to help you find important information."
        backHref="/wills/my-will"
      />
      {!currentVersion ? (
        <WillCard>
          <div className="py-5 text-center">
            <UiIcon name="file" className="mx-auto h-8 w-8 text-[#6f8e72]" />
            <h2 className="mt-3 font-semibold text-[#20352a]">
              No will to summarise
            </h2>
            <p className="mt-1 text-sm text-[#667068]">
              Upload an existing will from the My Will dashboard first.
            </p>
            <Link
              href="/wills/my-will"
              className="mt-4 inline-flex min-h-11 items-center rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
            >
              Back to My Will
            </Link>
          </div>
        </WillCard>
      ) : currentVersion.analysisStatus === "processing" ? (
        <WillStatusCard
          icon="clock"
          title="Summary is being prepared"
          detail="Your original file is already stored securely."
        />
      ) : currentVersion.analysisStatus !== "ready" ||
        !document?.extractionSummary ? (
        <WillStatusCard
          icon="alert"
          title="Summary unavailable"
          detail="DiaryDock could not prepare an AI summary for this version. The original file remains securely stored and available from My Will."
        />
      ) : (
        <WillReadySummary
          currentVersion={currentVersion}
          document={document}
          sections={sections}
          reviewNote={reviewNote}
          setReviewNote={setReviewNote}
          saveReview={saveReview}
          message={message}
        />
      )}
      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f5efe3] px-4 py-3.5 text-[12px] leading-5 text-[#6d624e]">
        This summary may not reflect every legal detail. Refer to the original
        document and seek professional advice where needed.
      </p>
      <WillLegalNotice />
    </div>
  );
}

function WillStatusCard({
  icon,
  title,
  detail,
}: {
  icon: "clock" | "alert";
  title: string;
  detail: string;
}) {
  return (
    <WillCard>
      <div className="flex items-start gap-3">
        <UiIcon
          name={icon}
          className="mt-0.5 h-6 w-6 shrink-0 text-[#6f8e72]"
        />
        <div>
          <h2 className="font-semibold text-[#20352a]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#667068]">{detail}</p>
        </div>
      </div>
    </WillCard>
  );
}
