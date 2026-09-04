import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { WillCard, formatWillDate } from "@/components/wills/WillUi";
import type {
  getWillDashboardStatus,
  WillRecord,
  WillVersion,
} from "@/lib/will-records";

type WillStatusCardProps = {
  currentVersion: WillVersion | null;
  fileMessage: string;
  onOpenUpload: () => void;
  onViewCurrent: () => void;
  record: WillRecord;
  status: ReturnType<typeof getWillDashboardStatus>;
};

export function WillStatusCard({
  currentVersion,
  fileMessage,
  onOpenUpload,
  onViewCurrent,
  record,
  status,
}: WillStatusCardProps) {
  const iconTone =
    status.tone === "complete"
      ? "bg-[#dde6d8] text-[#45604d]"
      : status.tone === "attention"
        ? "bg-[#f3ead7] text-[#816b42]"
        : "bg-[#eef0e9] text-[#667068]";
  return (
    <WillCard>
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] ${iconTone}`}
        >
          <UiIcon name={currentVersion ? "lock" : "file"} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-semibold text-[#20352a]">
              {currentVersion ? "Your will is stored securely" : status.label}
            </h2>
            {currentVersion ? (
              <span className="rounded-full bg-[#dde6d8] px-2.5 py-1 text-[10px] font-semibold text-[#45604d]">
                {status.label}
              </span>
            ) : null}
          </div>
          {currentVersion ? (
            <dl className="mt-3 grid gap-2 text-[12px] text-[#667068] sm:grid-cols-3">
              <div>
                <dt className="font-semibold text-[#20352a]/70">Uploaded</dt>
                <dd className="mt-0.5">
                  {formatWillDate(currentVersion.uploadedAt)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20352a]/70">Signed</dt>
                <dd className="mt-0.5">
                  {formatWillDate(currentVersion.signedDate)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20352a]/70">
                  Last reviewed
                </dt>
                <dd className="mt-0.5">
                  {formatWillDate(record.lastReviewedAt)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-1 text-[13px] leading-5 text-[#667068]">
              Add an existing will, or begin organising information for a future
              solicitor appointment.
            </p>
          )}
        </div>
      </div>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {currentVersion ? (
          <>
            <button
              type="button"
              onClick={onViewCurrent}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#203f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <UiIcon name="file" className="h-4 w-4" />
              View current will
            </button>
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] border border-[#6f8e72]/30 bg-white px-4 py-3 text-sm font-semibold text-[#294436] transition hover:bg-[#f3f6ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <UiIcon name="plus" className="h-4 w-4" />
              Update or replace
            </button>
            <Link
              href="/wills/my-will/details"
              className="sm:col-span-2 inline-flex min-h-11 items-center justify-center rounded-[15px] bg-[#eef2e9] px-4 py-2.5 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
            >
              Review will details
            </Link>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#203f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <UiIcon name="plus" className="h-4 w-4" />
              Upload an existing will
            </button>
            <Link
              href="/wills/my-will/preparation"
              className="inline-flex min-h-12 items-center justify-center rounded-[15px] border border-[#6f8e72]/30 bg-white px-4 py-3 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
            >
              Start organising my information
            </Link>
          </>
        )}
      </div>
      {fileMessage ? (
        <p
          role="status"
          className="mt-3 rounded-xl bg-[#f3f4ed] px-3 py-2.5 text-[12px] leading-5 text-[#59655d]"
        >
          {fileMessage}
        </p>
      ) : null}
    </WillCard>
  );
}
