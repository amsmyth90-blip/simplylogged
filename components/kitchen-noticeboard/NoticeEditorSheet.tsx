import { useRef, type Dispatch, type SetStateAction } from "react";

import { UiIcon } from "@/components/UiIcon";
import type { NoticeCategory } from "@/lib/diarydock-data";
import {
  noticeCategories,
  resolveNoticeDate,
  type NoticeDraft,
} from "./noticeboard-rules";
import type { NoticeCaptureMode } from "./use-noticeboard-controller";
import { NoticeCaptureActions } from "./NoticeCaptureActions";

type NoticeEditorSheetProps = {
  assignees: string[];
  captureError: string;
  draft: NoticeDraft;
  editing: boolean;
  linkCalendar: boolean;
  linkReminder: boolean;
  processing: NoticeCaptureMode | null;
  recording: boolean;
  whenOptions: string[];
  onArchive: () => void;
  onCapture: (file: File, mode: NoticeCaptureMode) => Promise<void>;
  onClose: () => void;
  onSave: () => void;
  onSetDraft: Dispatch<SetStateAction<NoticeDraft>>;
  onSetLinkCalendar: Dispatch<SetStateAction<boolean>>;
  onSetLinkReminder: Dispatch<SetStateAction<boolean>>;
  onStartVoice: () => Promise<void>;
  onStopVoice: () => void;
};

export function NoticeEditorSheet(props: NoticeEditorSheetProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const unavailable = Boolean(props.processing) || props.recording;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/25 p-2 backdrop-blur-[2px]"
      onClick={props.onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={props.editing ? "Edit notice" : "Add notice"}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[calc(100svh-12px)] w-full max-w-lg overflow-y-auto rounded-[30px] border border-white/90 bg-[#fbfcf9]/98 p-4 pb-[max(18px,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#66805c]">
              {props.editing ? "Update pin" : "New pin"}
            </p>
            <h2 className="text-lg font-semibold">
              {props.editing ? "Edit family note" : "Add to the board"}
            </h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500"
            aria-label="Close"
          >
            x
          </button>
        </div>

        {!props.editing ? (
          <NoticeCaptureActions
            photoRef={photoRef}
            titleRef={titleRef}
            unavailable={unavailable}
            processing={props.processing}
            recording={props.recording}
            onCapture={props.onCapture}
            onStartVoice={props.onStartVoice}
            onStopVoice={props.onStopVoice}
          />
        ) : null}

        {props.processing ? (
          <div className="mt-3 overflow-hidden rounded-[20px] border border-[#dce5d8] bg-[linear-gradient(110deg,#edf4e9,#f9fbf7,#e7f0e2)] p-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#607b55] shadow-sm">
                <span className="absolute inset-0 animate-ping rounded-full border border-[#91aa85]/50" />
                <UiIcon
                  name={props.processing === "photo" ? "camera" : "microphone"}
                  className="h-4 w-4"
                />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  {props.processing === "photo"
                    ? "Reading your photo"
                    : "Preparing your voice note"}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Finding the useful details for you...
                </p>
              </div>
            </div>
            <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white">
              <span className="block h-full w-1/2 animate-pulse rounded-full bg-[#78936d]" />
            </span>
          </div>
        ) : null}
        {props.captureError ? (
          <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-[10px] font-medium text-red-600">
            {props.captureError}
          </p>
        ) : null}

        <input
          ref={titleRef}
          value={props.draft.title}
          onChange={(event) =>
            props.onSetDraft((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
          placeholder="What should everyone know?"
          maxLength={54}
          disabled={unavailable}
          className="mt-3 h-12 w-full rounded-2xl border border-[#dce5d8] bg-white px-4 text-sm font-semibold outline-none focus:border-[#829d76] disabled:opacity-45"
        />
        <textarea
          value={props.draft.detail}
          onChange={(event) =>
            props.onSetDraft((current) => ({
              ...current,
              detail: event.target.value,
            }))
          }
          placeholder="Add a short detail"
          maxLength={120}
          disabled={unavailable}
          className="mt-2 h-16 w-full resize-none rounded-2xl border border-[#dce5d8] bg-white px-4 py-3 text-xs leading-5 outline-none focus:border-[#829d76] disabled:opacity-45"
        />

        <div className="mt-3 grid grid-cols-3 gap-2">
          <label className="rounded-2xl bg-[#f1f4ee] px-3 py-2">
            <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">
              Category
            </span>
            <select
              value={props.draft.category}
              onChange={(event) =>
                props.onSetDraft((current) => ({
                  ...current,
                  category: event.target.value as NoticeCategory,
                }))
              }
              className="mt-0.5 w-full bg-transparent text-[11px] font-semibold outline-none"
            >
              {noticeCategories.slice(1).map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="rounded-2xl bg-[#f1f4ee] px-3 py-2">
            <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">
              For
            </span>
            <select
              value={props.draft.assignedTo}
              onChange={(event) =>
                props.onSetDraft((current) => ({
                  ...current,
                  assignedTo: event.target.value,
                }))
              }
              className="mt-0.5 w-full bg-transparent text-[11px] font-semibold outline-none"
            >
              {!props.assignees.includes(props.draft.assignedTo) ? (
                <option value={props.draft.assignedTo}>
                  {props.draft.assignedTo}
                </option>
              ) : null}
              {props.assignees.map((assignee) => (
                <option key={assignee}>{assignee}</option>
              ))}
            </select>
          </label>
          <label className="rounded-2xl bg-[#f1f4ee] px-3 py-2">
            <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">
              When
            </span>
            <select
              value={props.draft.due}
              onChange={(event) => {
                const due = event.target.value;
                props.onSetDraft((current) => ({ ...current, due }));
                props.onSetLinkReminder(Boolean(due));
                props.onSetLinkCalendar(Boolean(resolveNoticeDate(due)));
              }}
              className="mt-0.5 w-full bg-transparent text-[11px] font-semibold outline-none"
            >
              {props.whenOptions.map((when) => (
                <option key={when || "no-date"} value={when}>
                  {when || "No date"}
                </option>
              ))}
            </select>
          </label>
        </div>

        {props.draft.due ? (
          <div className="mt-3 rounded-[20px] border border-[#dce5d8] bg-white p-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#66805c]">
                Suggested actions
              </span>
              <span className="text-[8px] text-slate-400">
                Confirm before saving
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => props.onSetLinkReminder((current) => !current)}
                className={`flex h-10 items-center justify-center gap-2 rounded-2xl text-[10px] font-semibold ${props.linkReminder ? "bg-[#e8f0df] text-[#4f6947] ring-1 ring-[#b9caad]" : "bg-slate-100 text-slate-500"}`}
              >
                <UiIcon name="bell" className="h-3.5 w-3.5" />
                {props.linkReminder ? "Reminder on" : "Add reminder"}
              </button>
              <button
                type="button"
                disabled={!resolveNoticeDate(props.draft.due)}
                onClick={() => props.onSetLinkCalendar((current) => !current)}
                className={`flex h-10 items-center justify-center gap-2 rounded-2xl text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${props.linkCalendar ? "bg-[#e8edf3] text-[#526d80] ring-1 ring-[#c5d3de]" : "bg-slate-100 text-slate-500"}`}
              >
                <UiIcon name="calendar" className="h-3.5 w-3.5" />
                {props.linkCalendar ? "Calendar on" : "Add to calendar"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() =>
              props.onSetDraft((current) => ({
                ...current,
                completed: !current.completed,
                completedAt: current.completed
                  ? undefined
                  : current.completedAt,
              }))
            }
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[10px] font-semibold ${props.draft.completed ? "bg-[#607b55] text-white" : "bg-[#edf2ea] text-[#58704f]"}`}
          >
            <UiIcon name="check" className="h-3.5 w-3.5" />
            {props.draft.completed ? "Completed" : "Complete"}
          </button>
          <button
            type="button"
            onClick={() =>
              props.onSetDraft((current) => ({
                ...current,
                pinned: !current.pinned,
              }))
            }
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[10px] font-semibold ${props.draft.pinned ? "bg-[#f0e5ca] text-[#8a6c32]" : "bg-slate-100 text-slate-600"}`}
          >
            <UiIcon name="star" className="h-3.5 w-3.5" />
            {props.draft.pinned ? "Pinned" : "Pin note"}
          </button>
          {props.editing ? (
            <button
              type="button"
              onClick={props.onArchive}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 text-[10px] font-semibold text-slate-600"
            >
              <UiIcon name="archive" className="h-3.5 w-3.5" />
              Archive
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={props.onSave}
          disabled={!props.draft.title.trim() || unavailable}
          className="mt-3 h-12 w-full rounded-2xl bg-[#263b35] text-sm font-semibold text-white shadow-lg disabled:opacity-40"
        >
          {props.editing ? "Save changes" : "Pin to noticeboard"}
        </button>
      </section>
    </div>
  );
}
