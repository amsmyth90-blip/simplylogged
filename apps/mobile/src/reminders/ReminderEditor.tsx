import { useEffect, useState, type FormEvent } from "react";

import type {
  EditableReminder,
  Reminder,
  ReminderGroup,
  ReminderPriority,
} from "@diarydock/reminders";

type ReminderEditorProps = {
  defaults?: Partial<EditableReminder>;
  open: boolean;
  reminder: Reminder | null;
  onClose: () => void;
  onSave: (draft: EditableReminder) => Promise<boolean>;
};

function localTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
}

function draftFor(
  reminder: Reminder | null,
  defaults: Partial<EditableReminder> = {},
): EditableReminder {
  return reminder
    ? {
        title: reminder.title,
        note: reminder.note,
        roomId: reminder.roomId,
        roomName: reminder.roomName,
        group: reminder.group,
        timeLabel: reminder.timeLabel,
        priority: reminder.priority,
        repeat: reminder.repeat,
        documentId: reminder.documentId,
        documentTitle: reminder.documentTitle,
        assignedTo: reminder.assignedTo,
        dueAt: reminder.dueAt,
        timeZone: reminder.timeZone,
      }
    : {
        title: "",
        group: "today",
        timeLabel: "Today",
        priority: "normal",
        timeZone: localTimeZone(),
        ...defaults,
      };
}

export function ReminderEditor(props: ReminderEditorProps) {
  const [draft, setDraft] = useState<EditableReminder>(() =>
    draftFor(props.reminder, props.defaults),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (props.open) setDraft(draftFor(props.reminder, props.defaults));
  }, [props.defaults, props.open, props.reminder]);

  if (!props.open) return null;

  function set<K extends keyof EditableReminder>(
    key: K,
    value: EditableReminder[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const saved = await props.onSave({
      ...draft,
      title: draft.title.trim(),
      note: draft.note?.trim() || undefined,
      roomName: draft.roomName?.trim() || undefined,
      timeLabel: draft.timeLabel.trim(),
      repeat: draft.repeat?.trim() || undefined,
      assignedTo: draft.assignedTo?.trim() || undefined,
    });
    setSaving(false);
    if (saved) props.onClose();
  }

  return (
    <div className="editor-backdrop" role="presentation">
      <section
        className="reminder-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <header>
          <div>
            <p className="eyebrow">Reminders</p>
            <h2 id="editor-title">
              {props.reminder ? "Edit reminder" : "New reminder"}
            </h2>
          </div>
          <button
            type="button"
            className="editor-close"
            aria-label="Close"
            onClick={props.onClose}
          >
            ×
          </button>
        </header>
        <form onSubmit={save}>
          <label className="wide-field">
            <span>Title</span>
            <input
              required
              maxLength={240}
              value={draft.title}
              onChange={(event) => set("title", event.target.value)}
            />
          </label>
          <label className="wide-field">
            <span>Note</span>
            <textarea
              rows={3}
              maxLength={1000}
              value={draft.note ?? ""}
              onChange={(event) => set("note", event.target.value)}
            />
          </label>
          <div className="editor-grid">
            <label>
              <span>Room</span>
              <input
                maxLength={160}
                placeholder="No room yet"
                value={draft.roomName ?? ""}
                onChange={(event) => set("roomName", event.target.value)}
              />
            </label>
            <label>
              <span>Due</span>
              <input
                required
                maxLength={120}
                placeholder="This Friday"
                value={draft.timeLabel}
                onChange={(event) => set("timeLabel", event.target.value)}
              />
            </label>
            <label>
              <span>For</span>
              <input
                maxLength={160}
                placeholder="Everyone"
                value={draft.assignedTo ?? ""}
                onChange={(event) => set("assignedTo", event.target.value)}
              />
            </label>
            <label>
              <span>Stage</span>
              <select
                value={draft.group}
                onChange={(event) =>
                  set("group", event.target.value as ReminderGroup)
                }
              >
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="later">Later</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label>
              <span>Priority</span>
              <select
                value={draft.priority}
                onChange={(event) =>
                  set("priority", event.target.value as ReminderPriority)
                }
              >
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>
              <span>Repeat</span>
              <input
                maxLength={120}
                placeholder="Weekly"
                value={draft.repeat ?? ""}
                onChange={(event) => set("repeat", event.target.value)}
              />
            </label>
          </div>
          <footer>
            <button
              type="button"
              className="editor-cancel"
              onClick={props.onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="editor-save"
              disabled={
                saving || !draft.title.trim() || !draft.timeLabel.trim()
              }
            >
              {saving ? "Saving…" : "Save reminder"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
