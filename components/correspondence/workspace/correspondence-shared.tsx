"use client";

import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import {
  type CorrespondenceFolder,
  type CorrespondenceRecord,
} from "@/lib/correspondence-records";
import type { DocumentExtractionResult } from "@/lib/document-extraction";
import { daysUntil, formatDate } from "@/lib/presentation";

export type CorrespondenceView =
  | "dashboard"
  | "folders"
  | "new"
  | "detail"
  | "summary";

export function isCorrespondenceDueSoon(item: CorrespondenceRecord) {
  const days = daysUntil(item.deadline);
  return item.status !== "completed" && days >= 0 && days <= 14;
}

export function folderFromExtraction(
  extraction: DocumentExtractionResult,
): CorrespondenceFolder {
  const text =
    `${extraction.issuer} ${extraction.title} ${extraction.detectedDocumentType}`.toLowerCase();
  if (/hmrc|dwp|government|council|tax/.test(text)) return "Government & HMRC";
  if (/insurance|policy|insurer/.test(text)) return "Insurance";
  if (/electric|gas|water|utility|broadband|mobile|energy/.test(text))
    return "Utilities";
  if (/school|college|nursery|family/.test(text)) return "School & family";
  if (/employer|pension|payroll/.test(text)) return "Employers & pensions";
  if (extraction.category === "Home & Property") return "Property";
  if (extraction.category === "Finance") return "Banks & financial";
  return "Other";
}

export function safeWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export function CorrespondenceNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock helps you organise correspondence and track actions and
      deadlines. It does not provide legal, tax or financial advice. Check
      summaries, dates and required actions against the original letter and seek
      qualified advice where appropriate.
    </p>
  );
}

export function CorrespondenceRow({ item }: { item: CorrespondenceRecord }) {
  const status =
    item.reviewStatus === "needs-review"
      ? "Check details"
      : item.status === "completed"
        ? "Completed"
        : isCorrespondenceDueSoon(item)
          ? "Due soon"
          : item.status === "action-needed"
            ? "Action needed"
            : "Unread";
  const statusClass =
    item.reviewStatus === "needs-review"
      ? "bg-[#f2ead6] text-[#80683d]"
      : item.status === "completed"
        ? "bg-[#e6efe1] text-[#45604d]"
        : isCorrespondenceDueSoon(item) || item.status === "action-needed"
          ? "bg-[#f7e4df] text-[#924a40]"
          : "bg-[#e9edf5] text-[#536a8c]";
  const icon =
    item.folder === "Government & HMRC"
      ? "briefcase"
      : item.folder === "Insurance"
        ? "shield"
        : item.folder === "Property"
          ? "home"
          : "mail";
  return (
    <Link
      href={`/office/correspondence/${item.id}`}
      className="flex min-h-[82px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#20352a]">
          {item.title || "Letter awaiting review"}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[#667068]">
          {item.sender || "Sender not confirmed"} ·{" "}
          {item.receivedDate
            ? `Received ${formatDate(item.receivedDate)}`
            : "Date not recorded"}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold ${statusClass}`}
      >
        {status}
      </span>
    </Link>
  );
}
