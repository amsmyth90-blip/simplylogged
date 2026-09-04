import type { Dispatch, SetStateAction } from "react";

import { ModalShell } from "@/components/ModalShell";
import {
  reminderRoomOptions,
  type ReminderDraft,
} from "@/components/reminders/reminder-workspace-model";
import type { Reminder, ReminderGroup } from "@/lib/mock-data";

type ReminderEditorModalProps = {
  assignees: string[];
  draft: ReminderDraft;
  editing: boolean;
  onClose: () => void;
  onSave: () => void;
  open: boolean;
  setDraft: Dispatch<SetStateAction<ReminderDraft>>;
};

const fieldClass =
  "w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss";

export function ReminderEditorModal({
  assignees,
  draft,
  editing,
  onClose,
  onSave,
  open,
  setDraft,
}: ReminderEditorModalProps) {
  return (
    <ModalShell
      open={open}
      title={editing ? "Edit reminder" : "New reminder"}
      subtitle="Shared across the app through the DiaryDock data layer."
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
            Save reminder
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextField
          label="Title"
          maximum={240}
          value={draft.title}
          placeholder="Home insurance renewal"
          onChange={(title) => setDraft((current) => ({ ...current, title }))}
        />
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink">Note</span>
          <textarea
            maxLength={1_000}
            value={draft.note}
            onChange={(event) =>
              setDraft((current) => ({ ...current, note: event.target.value }))
            }
            rows={3}
            placeholder="Add any context for the household."
            className={fieldClass}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Room"
            value={draft.roomId}
            onChange={(roomId) =>
              setDraft((current) => ({ ...current, roomId }))
            }
          >
            <option value="">No room yet</option>
            {reminderRoomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Due"
            maximum={120}
            value={draft.timeLabel}
            placeholder="This Friday"
            onChange={(timeLabel) =>
              setDraft((current) => ({ ...current, timeLabel }))
            }
          />
          <SelectField
            label="For"
            value={draft.assignedTo}
            onChange={(assignedTo) =>
              setDraft((current) => ({ ...current, assignedTo }))
            }
          >
            <option value="">Everyone</option>
            {draft.assignedTo && !assignees.includes(draft.assignedTo) ? (
              <option value={draft.assignedTo}>{draft.assignedTo}</option>
            ) : null}
            {assignees.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Stage"
            value={draft.group}
            onChange={(group) =>
              setDraft((current) => ({
                ...current,
                group: group as ReminderGroup,
              }))
            }
          >
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="later">Later</option>
            <option value="done">Done</option>
          </SelectField>
          <SelectField
            label="Priority"
            value={draft.priority}
            onChange={(priority) =>
              setDraft((current) => ({
                ...current,
                priority: priority as Reminder["priority"],
              }))
            }
          >
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </SelectField>
          <TextField
            label="Repeat"
            maximum={120}
            value={draft.repeat}
            placeholder="Weekly"
            onChange={(repeat) =>
              setDraft((current) => ({ ...current, repeat }))
            }
          />
        </div>
      </div>
    </ModalShell>
  );
}

function TextField({
  label,
  maximum,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  maximum: number;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        maxLength={maximum}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
    </label>
  );
}

function SelectField({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      >
        {children}
      </select>
    </label>
  );
}
