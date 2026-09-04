import Image from "next/image";
import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import type { DocumentExtractionResult } from "@/lib/document-extraction";

export function CaptureCompleteView({
  createReminder,
  draft,
  onAnother,
  pageCount,
  proposalCount,
  reminderTimeLabel,
  savedDocumentId,
}: {
  createReminder: boolean;
  draft: DocumentExtractionResult;
  onAnother: () => void;
  pageCount: number;
  proposalCount: number;
  reminderTimeLabel: string;
  savedDocumentId: string | null;
}) {
  return (
    <main className="flex flex-1 flex-col justify-end pb-2 pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-20 h-[52%] overflow-hidden">
        <Image
          src="/images/estate-dashboard-country.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[center_32%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/85" />
      </div>
      <section className="relative rounded-[30px] border border-white/90 bg-white/84 p-5 shadow-[0_28px_65px_-34px_rgba(31,61,69,0.55)] backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dfeeda] text-[#5d8350]">
            <UiIcon name="check" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-xl font-semibold tracking-tight text-slate-900">
              {draft.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {pageCount} page{pageCount === 1 ? "" : "s"} saved after your
              review
            </p>
          </div>
        </div>
        <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-[20px] border border-slate-100 bg-white/68">
          <div className="flex items-center gap-3 px-4 py-3">
            <UiIcon name="home" className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-800">
              {draft.suggestedRoom}
            </span>
            <span className="ml-auto text-xs font-semibold text-[#66875c]">
              Room
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <UiIcon name="shield" className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-800">
              {draft.category}
            </span>
            <span className="ml-auto text-xs font-semibold text-[#66875c]">
              Category
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <UiIcon name="calendar" className="h-4 w-4 text-slate-500" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
              {createReminder
                ? `Reminder: ${reminderTimeLabel}`
                : "No reminder needed"}
            </span>
          </div>
        </div>
        {proposalCount ? (
          <Link
            href="/review-actions"
            className="mt-4 block rounded-[18px] bg-[#eef4ea] px-4 py-3 text-xs font-semibold leading-5 text-[#4f6f47]"
          >
            Review {proposalCount} optional next step
            {proposalCount === 1 ? "" : "s"}. Nothing else has been changed
            without your approval.
          </Link>
        ) : null}
        <Link
          href={savedDocumentId ? `/document/${savedDocumentId}` : "/files"}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[19px] bg-[#86a774] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_30px_-20px_rgba(67,102,63,0.7)]"
        >
          <UiIcon name="file" className="h-4 w-4" />
          View in DiaryDock
        </Link>
        <button
          type="button"
          onClick={onAnother}
          className="mt-3 w-full text-center text-sm font-semibold text-[#5f8155]"
        >
          Scan another
        </button>
      </section>
    </main>
  );
}

export function CaptureErrorView({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center py-8">
      <section className="w-full rounded-[30px] border border-white/90 bg-white/84 p-6 text-center shadow-[0_28px_65px_-34px_rgba(31,61,69,0.55)] backdrop-blur-2xl">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <UiIcon name="alert" className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-lg font-semibold text-slate-900">
          That document did not finish
        </h2>
        <p className="mt-2 text-sm leading-5 text-rose-600">
          {error || "Please check the pages and try again."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-full bg-[#86a774] px-5 py-3 text-sm font-semibold text-white"
        >
          Review pages
        </button>
      </section>
    </main>
  );
}
