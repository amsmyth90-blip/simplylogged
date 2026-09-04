import Link from "next/link";

import { documentFilingDetails } from "@/components/document-detail/document-detail-model";
import { ReminderCard } from "@/components/ReminderCard";
import { UiIcon } from "@/components/UiIcon";
import type { Reminder, VaultDocument } from "@/lib/mock-data";

export function DocumentDetailsSidebar({
  canManage,
  document,
  linkedReminders,
  onEdit,
  onReviewed,
}: {
  canManage: boolean;
  document: VaultDocument;
  linkedReminders: Reminder[];
  onEdit: () => void;
  onReviewed: () => void;
}) {
  const needsReview = document.reviewStatus === "needs-review";
  return (
    <div className="space-y-2.5">
      {needsReview ? (
        <section className="estate-sheet border-amber-200/70 bg-amber-50/82 p-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-amber-700">
              <UiIcon name="alert" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">
                Please check this
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-ink/55">
                Check the title, room and any dates before saving.
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {(document.reviewReasons?.length
              ? document.reviewReasons
              : ["Check AI filing details"]
            ).map((reason) => (
              <div
                key={reason}
                className="flex items-start gap-2 rounded-2xl bg-white/72 px-3 py-2 text-xs leading-5 text-amber-800"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
          {canManage ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/80 px-3 text-sm font-semibold text-ink/70"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onReviewed}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-3 text-sm font-semibold text-white shadow-soft"
              >
                <UiIcon name="check" className="h-4 w-4" />
                Reviewed
              </button>
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-white/72 px-3 py-2 text-xs leading-5 text-ink/55">
              The document owner can review or correct these details.
            </p>
          )}
        </section>
      ) : (
        <section className="estate-sheet p-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sage/60 text-moss">
              <UiIcon name="check" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Reviewed</p>
              <p className="mt-0.5 text-xs text-ink/55">
                {document.reviewedAt
                  ? `Checked ${document.reviewedAt.toLowerCase()}`
                  : "No review needed"}
              </p>
            </div>
          </div>
        </section>
      )}
      <section className="estate-sheet p-3.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Details
          </h2>
          {canManage ? (
            <button
              type="button"
              onClick={onEdit}
              className="text-xs font-semibold text-moss"
            >
              Edit
            </button>
          ) : null}
        </div>
        <div className="mt-3 divide-y divide-black/5 overflow-hidden rounded-2xl bg-white/76">
          {documentFilingDetails(document).map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[82px_1fr] gap-3 px-3 py-2.5 text-sm"
            >
              <span className="text-xs font-semibold text-ink/42">
                {item.label}
              </span>
              <span className="min-w-0 truncate font-semibold text-ink/78">
                {item.value}
              </span>
            </div>
          ))}
        </div>
        {document.roomId ? (
          <Link
            href={`/room/${document.roomId}`}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/78 px-4 text-sm font-semibold text-ink/70"
          >
            Open {document.roomName}
            <UiIcon name="chevron-right" className="h-4 w-4" />
          </Link>
        ) : null}
      </section>
      {document.extractionSummary ? (
        <section className="estate-sheet p-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Summary
          </h2>
          <p className="mt-2 text-xs leading-5 text-ink/62">
            {document.extractionSummary}
          </p>
        </section>
      ) : null}
      {document.actionItems?.length ? (
        <section className="estate-sheet p-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Actions
          </h2>
          <div className="mt-2 space-y-1.5">
            {document.actionItems.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs leading-5 text-ink/64"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-moss" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {linkedReminders.length ? (
        <section className="estate-sheet p-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Linked reminders
          </h2>
          <div className="mt-2 space-y-2">
            {linkedReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                compact
                href="/reminders"
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
