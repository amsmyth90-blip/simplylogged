import { UiIcon } from "@/components/UiIcon";
import { WillCard, formatWillDate } from "@/components/wills/WillUi";
import type { VaultDocument } from "@/lib/mock-data";
import type { WillSummaryReview, WillVersion } from "@/lib/will-records";

import type { WillSummarySection } from "./will-summary-sections";

export function WillReadySummary({
  currentVersion,
  document,
  sections,
  reviewNote,
  setReviewNote,
  saveReview,
  message,
}: {
  currentVersion: WillVersion;
  document: VaultDocument;
  sections: WillSummarySection[];
  reviewNote: string;
  setReviewNote: (value: string) => void;
  saveReview: (review: WillSummaryReview) => void;
  message: string;
}) {
  const detected = currentVersion.detectedSummary;
  return (
    <>
      <WillCard className="bg-[#f1f3ec]">
        <div className="flex items-start gap-3">
          <UiIcon
            name="alert"
            className="mt-0.5 h-5 w-5 shrink-0 text-[#52705a]"
          />
          <div>
            <h2 className="text-sm font-semibold text-[#20352a]">
              Please check these details
            </h2>
            <p className="mt-1 text-[12px] leading-5 text-[#59655d]">
              This is an informational summary. Always refer to your original
              will or a qualified solicitor where wording matters.
            </p>
            {detected && detected.confidence < 0.8 ? (
              <p className="mt-2 rounded-lg bg-[#f5ead6] px-2.5 py-2 text-[11px] leading-4 text-[#765f38]">
                Extra care recommended: some wording may not have been read
                clearly.
              </p>
            ) : null}
            <p className="mt-2 text-[11px] text-[#758078]">
              Current version: {currentVersion.versionLabel} · uploaded{" "}
              {formatWillDate(currentVersion.uploadedAt)}
            </p>
          </div>
        </div>
      </WillCard>
      <WillCard>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f8e72]">
          AI document overview
        </p>
        <h2 className="mt-2 font-serif text-2xl text-[#20352a]">
          What DiaryDock identified
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#59655d]">
          {document.extractionSummary}
        </p>
      </WillCard>
      <section aria-labelledby="summary-key-points">
        <h2
          id="summary-key-points"
          className="mb-3 text-xl font-semibold text-[#20352a]"
        >
          Key points to review
        </h2>
        <div className="space-y-3">
          {sections.map((section) => (
            <WillCard key={section.title} as="article" className="p-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#52705a]">
                  <UiIcon name={section.icon} className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[#20352a]">
                    {section.title}
                  </h3>
                  <p className="mt-1 text-[12px] leading-5 text-[#667068]">
                    {section.text}
                  </p>
                </div>
              </div>
            </WillCard>
          ))}
        </div>
      </section>
      <WillCard>
        <h2 className="text-base font-semibold text-[#20352a]">
          Is anything incorrect?
        </h2>
        <p className="mt-1 text-[12px] leading-5 text-[#667068]">
          AI-detected information is not silently added to your confirmed
          details.
        </p>
        <textarea
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          rows={3}
          className="mt-3 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm text-[#20352a] outline-none focus:border-[#6f8e72]"
          placeholder="Optional note about what needs checking"
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => saveReview("confirmed")}
            className="min-h-11 rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            I have checked this
          </button>
          <button
            type="button"
            onClick={() => saveReview("incorrect")}
            className="min-h-11 rounded-[14px] border border-[#6f8e72]/30 bg-white px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            Something is incorrect
          </button>
        </div>
        {message ? (
          <p
            role="status"
            className="mt-3 rounded-[13px] bg-[#eef2e9] px-3 py-2.5 text-[12px] leading-5 text-[#45604d]"
          >
            {message}
          </p>
        ) : null}
      </WillCard>
    </>
  );
}
