import type { Dispatch, SetStateAction } from "react";

import { ModalShell } from "@/components/ModalShell";
import type {
  ActivityDraft,
  DocumentDraft,
  RoomModal,
  TaskDraft,
} from "@/components/room-page/room-page-model";
import type { RoomDocument } from "@/lib/mock-data";

type RoomEditorModalProps = {
  activityDraft: ActivityDraft;
  documentDraft: DocumentDraft;
  modal: RoomModal;
  onClose: () => void;
  onSave: () => void;
  roomName: string;
  setActivityDraft: Dispatch<SetStateAction<ActivityDraft>>;
  setDocumentDraft: Dispatch<SetStateAction<DocumentDraft>>;
  setTaskDraft: Dispatch<SetStateAction<TaskDraft>>;
  taskDraft: TaskDraft;
};

export function RoomEditorModal({
  activityDraft,
  documentDraft,
  modal,
  onClose,
  onSave,
  roomName,
  setActivityDraft,
  setDocumentDraft,
  setTaskDraft,
  taskDraft,
}: RoomEditorModalProps) {
  return (
    <ModalShell
      open={modal !== null}
      title={
        modal === "task"
          ? `Add a task to ${roomName}`
          : modal === "document"
            ? `Add a document to ${roomName}`
            : `Log an update in ${roomName}`
      }
      subtitle="Shared with the rest of DiaryDock through the app data layer."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
          >
            Save
          </button>
        </div>
      }
    >
      {modal === "task" ? (
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Task</span>
            <input
              type="text"
              value={taskDraft.label}
              onChange={(event) =>
                setTaskDraft((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
              placeholder="Review insurance renewal"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Due</span>
            <input
              type="text"
              value={taskDraft.due}
              onChange={(event) =>
                setTaskDraft((current) => ({
                  ...current,
                  due: event.target.value,
                }))
              }
              placeholder="This week"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
        </div>
      ) : null}
      {modal === "document" ? (
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Title</span>
            <input
              type="text"
              value={documentDraft.title}
              onChange={(event) =>
                setDocumentDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="New household record"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Type</span>
              <select
                value={documentDraft.kind}
                onChange={(event) =>
                  setDocumentDraft((current) => ({
                    ...current,
                    kind: event.target.value as RoomDocument["kind"],
                  }))
                }
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              >
                <option value="PDF">PDF</option>
                <option value="Scan">Scan</option>
                <option value="Note">Note</option>
                <option value="Image">Image</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Size</span>
              <input
                type="text"
                value={documentDraft.size}
                onChange={(event) =>
                  setDocumentDraft((current) => ({
                    ...current,
                    size: event.target.value,
                  }))
                }
                placeholder="420 KB"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
          </div>
        </div>
      ) : null}
      {modal === "activity" ? (
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Update</span>
            <textarea
              value={activityDraft.text}
              onChange={(event) =>
                setActivityDraft((current) => ({
                  ...current,
                  text: event.target.value,
                }))
              }
              rows={3}
              placeholder="Added a note about the latest change."
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">By</span>
            <input
              type="text"
              value={activityDraft.by}
              onChange={(event) =>
                setActivityDraft((current) => ({
                  ...current,
                  by: event.target.value,
                }))
              }
              placeholder="You"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
        </div>
      ) : null}
    </ModalShell>
  );
}
