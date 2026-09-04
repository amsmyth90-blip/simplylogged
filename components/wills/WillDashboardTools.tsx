import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import {
  WillActionLink,
  WillCard,
  WillLegalNotice,
  WillSectionHeading,
  formatWillDate,
} from "@/components/wills/WillUi";
import { willLifeEvents } from "@/components/wills/my-will-dashboard-model";
import type { WillRecord, WillVersion } from "@/lib/will-records";

type Props = {
  currentVersion: WillVersion | null;
  preparation: { complete: number; started: number; total: number };
  record: WillRecord;
  onReviewNow: () => void;
  onSetReminder: () => void;
};

function summaryDetail(currentVersion: WillVersion | null) {
  if (currentVersion?.analysisStatus === "ready") {
    return "Plain-language overview ready to check";
  }
  return currentVersion
    ? "Summary is not available yet"
    : "Available after an uploaded will is analysed";
}

export function WillDashboardTools(props: Props) {
  const { currentVersion, preparation, record } = props;
  return (
    <>
      <section aria-labelledby="will-tools-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f8e72]">
              Overview
            </p>
            <h2 id="will-tools-heading" className="mt-1 text-xl font-semibold text-[#20352a]">
              Your will tools
            </h2>
          </div>
          {record.versions.length ? (
            <span className="text-xs text-[#667068]">
              {record.versions.length} version{record.versions.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <WillActionLink
            href="/wills/my-will/summary"
            icon="leaf"
            title="Will summary"
            detail={summaryDetail(currentVersion)}
          />
          <WillActionLink
            href="/wills/my-will/history"
            icon="clock"
            title="Version history"
            detail={`${record.versions.length} stored version${record.versions.length === 1 ? "" : "s"}`}
          />
          <WillActionLink
            href="/wills/my-will/details"
            icon="users"
            title="Executor details"
            detail={record.primaryExecutor.name
              ? `Primary: ${record.primaryExecutor.name}`
              : "Primary and backup executors not recorded"}
          />
          <WillActionLink
            href="/wills/my-will/record-check"
            icon="check"
            title="Will record check"
            detail="Review practical gaps in your records"
          />
        </div>
      </section>

      <WillCard>
        <WillSectionHeading
          icon="calendar"
          title="Next review"
          description="You may wish to review your will records after a major life change."
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {willLifeEvents.map((event) => (
            <span
              key={event}
              className="rounded-full bg-[#f1f2eb] px-3 py-1.5 text-[11px] text-[#5f6b63]"
            >
              {event}
            </span>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <p className="mr-auto text-sm text-[#667068]">
            Review date:
            <span className="font-semibold text-[#20352a]">
              {` ${formatWillDate(record.nextReviewAt)}`}
            </span>
          </p>
          <button
            type="button"
            onClick={props.onReviewNow}
            className="min-h-11 rounded-[14px] border border-[#6f8e72]/30 bg-white px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            Review now
          </button>
          <button
            type="button"
            onClick={props.onSetReminder}
            className="min-h-11 rounded-[14px] bg-[#dde6d8] px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            Set reminder
          </button>
        </div>
      </WillCard>

      <WillCard>
        <WillSectionHeading
          icon="briefcase"
          title="Will preparation"
          description="Organise information a solicitor may need. This does not create a will."
        />
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e6e9df]">
            <div
              className="h-full rounded-full bg-[#6f8e72]"
              style={{ width: `${(preparation.complete / preparation.total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-[#45604d]">
            {preparation.complete}/{preparation.total}
          </span>
        </div>
        <Link
          href="/wills/my-will/preparation"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-between rounded-[15px] bg-[#f1f3ec] px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
        >
          <span>{preparation.started ? "Continue organising" : "Start organising"}</span>
          <UiIcon name="chevron-right" className="h-4 w-4" />
        </Link>
      </WillCard>

      <WillLegalNotice />
    </>
  );
}
