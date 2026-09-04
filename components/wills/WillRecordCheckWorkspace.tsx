"use client";

import Link from "next/link";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  WillCard,
  WillLegalNotice,
  WillPageHeader,
  WillSectionHeading,
} from "@/components/wills/WillUi";
import { getCurrentWillVersion, hydrateWillRecord } from "@/lib/will-records";

export function WillRecordCheckWorkspace() {
  const { state, hydrated } = useDiaryDockData();
  const record = hydrateWillRecord(state.willsWishes.myWill);
  const current = getCurrentWillVersion(record);
  const document = current
    ? state.vaultDocuments.find((item) => item.id === current.documentId)
    : null;
  const recentCutoff = new Date();
  recentCutoff.setFullYear(recentCutoff.getFullYear() - 2);
  const checks = [
    {
      label: "A signed copy is stored",
      done: Boolean(current?.status === "signed" && document?.storagePath),
    },
    {
      label: "The physical original location is recorded",
      done: Boolean(
        record.originalLocationType && record.originalLocationDetails.trim(),
      ),
    },
    {
      label: "A primary executor is recorded",
      done: Boolean(record.primaryExecutor.name.trim()),
    },
    {
      label: "A backup executor is recorded",
      done: Boolean(record.backupExecutor.name.trim()),
    },
    {
      label: "Solicitor details are recorded",
      done: Boolean(record.solicitorName.trim() || record.solicitorFirm.trim()),
    },
    {
      label: "The records have been reviewed in the last two years",
      done: Boolean(
        record.lastReviewedAt &&
        new Date(record.lastReviewedAt) >= recentCutoff,
      ),
    },
    {
      label: "A trusted person knows where the original is stored",
      done: record.trustedPersonInformed,
    },
    {
      label: "The latest version is confirmed",
      done: Boolean(current?.currentConfirmed),
    },
  ];
  const complete = checks.filter((item) => item.done).length;

  if (!hydrated)
    return (
      <div className="mx-auto w-full max-w-[760px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068] sm:max-w-[680px] xl:max-w-[760px]">
        Checking your records…
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader
        title="Will record check"
        subtitle="Review a few practical details connected to your will."
        backHref="/wills/my-will"
      />
      <WillCard>
        <WillSectionHeading
          icon="check"
          title={`${complete} of ${checks.length} practical details recorded`}
          description="This is an organisational check only. It does not assess legal validity."
        />
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e6e9df]">
          <div
            className="h-full rounded-full bg-[#6f8e72]"
            style={{ width: `${(complete / checks.length) * 100}%` }}
          />
        </div>
      </WillCard>
      <WillCard className="p-3 sm:p-4">
        <ul className="divide-y divide-[#20352a]/[0.06]">
          {checks.map((check) => (
            <li
              key={check.label}
              className="flex min-h-[58px] items-center gap-3 px-2 py-2"
            >
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${check.done ? "bg-[#dde6d8] text-[#45604d]" : "bg-[#f1eee5] text-[#8a744d]"}`}
              >
                <UiIcon
                  name={check.done ? "check" : "alert"}
                  className="h-4 w-4"
                />
              </span>
              <span className="flex-1 text-sm text-[#20352a]">
                {check.label}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#667068]">
                {check.done ? "Recorded" : "Check"}
              </span>
            </li>
          ))}
        </ul>
      </WillCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/wills/my-will/details"
          className="inline-flex min-h-12 items-center justify-center rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
        >
          Update will details
        </Link>
        <Link
          href="/wills/my-will"
          className="inline-flex min-h-12 items-center justify-center rounded-[15px] border border-[#6f8e72]/30 bg-white px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
        >
          Back to dashboard
        </Link>
      </div>
      <WillLegalNotice />
    </div>
  );
}
