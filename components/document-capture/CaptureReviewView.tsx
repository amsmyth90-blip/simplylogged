import type { Dispatch, SetStateAction } from "react";

import { UiIcon } from "@/components/UiIcon";
import { reviewMessageForConfidence } from "@/lib/brain/extraction/confidence";
import {
  canConfirmCapture,
  getCaptureReviewReasons,
} from "@/lib/capture-review";
import {
  documentCategoryOptions,
  suggestedRoomOptions,
  type DocumentExtractionResult,
} from "@/lib/document-extraction";

type CaptureReviewViewProps = {
  createReminder: boolean;
  draft: DocumentExtractionResult;
  hasPendingFiles: boolean;
  onBack: () => void;
  onSave: () => void;
  reminderTimeLabel: string;
  setCreateReminder: (value: boolean) => void;
  setDraft: Dispatch<SetStateAction<DocumentExtractionResult | null>>;
  setReminderTimeLabel: (value: string) => void;
};

export function CaptureReviewView({
  createReminder,
  draft,
  hasPendingFiles,
  onBack,
  onSave,
  reminderTimeLabel,
  setCreateReminder,
  setDraft,
  setReminderTimeLabel,
}: CaptureReviewViewProps) {
  const update = <Key extends keyof DocumentExtractionResult>(
    key: Key,
    value: DocumentExtractionResult[Key],
  ) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  const reasons = getCaptureReviewReasons(draft);
  return (
    <main className="flex flex-1 flex-col py-6">
      <section className="rounded-[30px] border border-white/90 bg-white/88 p-5 shadow-[0_28px_65px_-34px_rgba(31,61,69,0.55)] backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f0e4] text-[#5d8350]">
            <UiIcon name="search" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#66815f]">
              We found these details
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              Please check before saving
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {reviewMessageForConfidence(draft.confidence)}
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Document name
            </span>
            <input
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-[#86a774]"
            />
          </label>
          {draft.extractedFields?.length ? (
            <fieldset className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
              <legend className="px-1 text-xs font-semibold text-slate-700">
                Details found in the document
              </legend>
              <div className="mt-2 space-y-3">
                {draft.extractedFields.map((field, index) => (
                  <label key={`${field.key}-${index}`} className="block">
                    <span className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700">
                      {field.label}
                      <span className="text-[10px] font-medium text-slate-400">
                        {Math.round(field.confidence * 100)}% match
                      </span>
                    </span>
                    <input
                      value={field.value}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                extractedFields: (
                                  current.extractedFields ?? []
                                ).map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, value: event.target.value }
                                    : item,
                                ),
                              }
                            : current,
                        )
                      }
                      className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-[#86a774]"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Who issued it
            </span>
            <input
              value={draft.issuer}
              onChange={(event) => update("issuer", event.target.value)}
              placeholder="Leave blank if it is not shown"
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-[#86a774]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Area</span>
              <select
                value={draft.suggestedRoom}
                onChange={(event) =>
                  update(
                    "suggestedRoom",
                    event.target
                      .value as DocumentExtractionResult["suggestedRoom"],
                  )
                }
                className="mt-1.5 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#86a774]"
              >
                {suggestedRoomOptions.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">
                Category
              </span>
              <select
                value={draft.category}
                onChange={(event) =>
                  update(
                    "category",
                    event.target.value as DocumentExtractionResult["category"],
                  )
                }
                className="mt-1.5 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#86a774]"
              >
                {documentCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Useful date
            </span>
            <input
              type="date"
              value={draft.dueDate}
              onChange={(event) => update("dueDate", event.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#86a774]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              Summary
            </span>
            <textarea
              value={draft.summary}
              onChange={(event) => update("summary", event.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-[#86a774]"
            />
          </label>
        </div>
        <div className="mt-5 rounded-[20px] border border-[#dce8d7] bg-[#f2f7ef] p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={createReminder}
              onChange={(event) => setCreateReminder(event.target.checked)}
              className="mt-0.5 h-5 w-5 accent-[#6f9462]"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-800">
                Create a reminder
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                This is optional and will be linked to this document.
              </span>
            </span>
          </label>
          {createReminder ? (
            <input
              value={reminderTimeLabel}
              onChange={(event) => setReminderTimeLabel(event.target.value)}
              aria-label="When to remind me"
              className="mt-3 w-full rounded-2xl border border-[#d4e2cf] bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-[#86a774]"
            />
          ) : null}
        </div>
        {reasons.length ? (
          <ul className="mt-4 space-y-1.5 rounded-[18px] bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            {reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          disabled={!canConfirmCapture(draft) || !hasPendingFiles}
          onClick={onSave}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[19px] bg-[#86a774] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_30px_-20px_rgba(67,102,63,0.7)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <UiIcon name="check" className="h-4 w-4" />
          Confirm and save
        </button>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 w-full text-center text-sm font-semibold text-slate-500"
        >
          Go back without saving
        </button>
      </section>
    </main>
  );
}
