import { useEffect, useState } from "react";

import type { EditableReminder } from "@diarydock/reminders";

import type { HealthDraftMutation } from "./health-client";
import {
  createHealthMutation,
  type HealthEditorType,
  type HealthRecordDraft,
} from "./health-record-mutation";

export type { HealthEditorType } from "./health-record-mutation";

const emptyDraft: HealthRecordDraft = {
  title: "",
  secondary: "",
  detail: "",
  date: "",
  time: "",
  notes: "",
};

const labels: Record<HealthEditorType, { title: string; secondary: string; detail: string }> = {
  medication: { title: "Medication name", secondary: "Dose", detail: "Frequency" },
  appointment: { title: "Appointment title", secondary: "Provider", detail: "Location" },
  allergy: { title: "Allergen", secondary: "Reaction", detail: "Severity" },
  condition: { title: "Condition name", secondary: "", detail: "Status" },
  test: { title: "Test or result title", secondary: "Provider", detail: "" },
  vaccination: { title: "Vaccination name", secondary: "Provider", detail: "Next date" },
  "dental-optical": { title: "Visit title", secondary: "Provider", detail: "Type" },
  wellbeing: { title: "Wellbeing note", secondary: "Sleep hours", detail: "" },
  timeline: { title: "Event title", secondary: "Event type", detail: "" },
};

type Props = {
  busy: boolean;
  initialType: HealthEditorType;
  online: boolean;
  open: boolean;
  onClose: () => void;
  onCreateReminder: (recordId: string, reminder: EditableReminder) => Promise<boolean>;
  onSave: (mutation: HealthDraftMutation) => Promise<boolean>;
};

export function HealthRecordEditor(props: Props) {
  const [type, setType] = useState<HealthEditorType>(props.initialType);
  const [draft, setDraft] = useState(emptyDraft);
  const [makeReminder, setMakeReminder] = useState(false);
  const fieldLabels = labels[type];
  const valid = draft.title.trim().length > 1;

  useEffect(() => {
    if (!props.open) return;
    setType(props.initialType);
    setDraft(emptyDraft);
    setMakeReminder(false);
  }, [props.initialType, props.open]);

  if (!props.open) return null;

  function change(field: keyof HealthRecordDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    if (!valid || props.busy || !props.online) return;
    const reminderId = type === "appointment" && makeReminder && draft.date
      ? crypto.randomUUID()
      : undefined;
    if (!(await props.onSave(createHealthMutation(type, draft, reminderId)))) return;
    if (reminderId) {
      await props.onCreateReminder(reminderId, appointmentReminder(draft));
    }
    props.onClose();
  }

  return (
    <div className="health-editor-backdrop" role="presentation">
      <section
        className="health-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="health-editor-title"
      >
        <header>
          <div>
            <p>Private health area</p>
            <h2 id="health-editor-title">Add health record</h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close health record editor"
          >
            ×
          </button>
        </header>
        <label>
          <span>Record type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as HealthEditorType)}
          >
            <option value="medication">Medication</option>
            <option value="appointment">Appointment</option>
            <option value="allergy">Allergy</option>
            <option value="condition">Condition</option>
            <option value="test">Test or result</option>
            <option value="vaccination">Vaccination</option>
            <option value="dental-optical">Dental or optical</option>
            <option value="wellbeing">Wellbeing note</option>
            <option value="timeline">Timeline event</option>
          </select>
        </label>
        <label>
          <span>{fieldLabels.title}</span>
          <input
            autoFocus
            maxLength={200}
            value={draft.title}
            onChange={(event) => change("title", event.target.value)}
          />
        </label>
        {fieldLabels.secondary ? (
          <label>
            <span>{fieldLabels.secondary}</span>
            <input
              maxLength={500}
              value={draft.secondary}
              onChange={(event) => change("secondary", event.target.value)}
            />
          </label>
        ) : null}
        <HealthDetailField type={type} draft={draft} label={fieldLabels.detail} onChange={change} />
        <div className="health-editor-row">
          <label>
            <span>Date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) => change("date", event.target.value)}
            />
          </label>
          {type === "appointment" ? (
            <label>
              <span>Time</span>
              <input
                type="time"
                value={draft.time}
                onChange={(event) => change("time", event.target.value)}
              />
            </label>
          ) : null}
        </div>
        {type === "appointment" ? (
          <label className="health-reminder-option">
            <input
              type="checkbox"
              checked={makeReminder}
              onChange={(event) => setMakeReminder(event.target.checked)}
            />
            <span>Create a reminder after saving this appointment</span>
          </label>
        ) : null}
        <label>
          <span>Notes</span>
          <textarea
            rows={4}
            maxLength={4_000}
            value={draft.notes}
            onChange={(event) => change("notes", event.target.value)}
          />
        </label>
        {!props.online ? (
          <p>
            Connect to add a health record. Your encrypted health archive remains
            available offline.
          </p>
        ) : null}
        <footer>
          <button type="button" onClick={props.onClose}>Cancel</button>
          <button
            type="button"
            disabled={!valid || props.busy || !props.online}
            onClick={() => void save()}
          >
            {props.busy ? "Saving…" : "Save securely"}
          </button>
        </footer>
      </section>
    </div>
  );
}

type DetailFieldProps = {
  draft: HealthRecordDraft;
  label: string;
  type: HealthEditorType;
  onChange: (field: keyof HealthRecordDraft, value: string) => void;
};

function HealthDetailField(props: DetailFieldProps) {
  if (props.type === "allergy") {
    return (
      <label>
        <span>Severity — user recorded</span>
        <select
          value={props.draft.detail}
          onChange={(event) => props.onChange("detail", event.target.value)}
        >
          <option value="">Not recorded</option>
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe-user-recorded">Severe — user recorded</option>
        </select>
      </label>
    );
  }
  if (props.type === "dental-optical") {
    return (
      <label>
        <span>Type</span>
        <select
          value={props.draft.detail}
          onChange={(event) => props.onChange("detail", event.target.value)}
        >
          <option value="dental">Dental</option>
          <option value="optical">Optical</option>
        </select>
      </label>
    );
  }
  if (!props.label) return null;
  return (
    <label>
      <span>{props.label}</span>
      <input
        type={props.type === "vaccination" ? "date" : "text"}
        maxLength={300}
        value={props.draft.detail}
        onChange={(event) => props.onChange("detail", event.target.value)}
      />
    </label>
  );
}

function appointmentReminder(draft: HealthRecordDraft): EditableReminder {
  const dueAt = `${draft.date}T${draft.time || "09:00"}:00`;
  return {
    title: draft.title.trim(),
    note: draft.notes.trim() || "Healthcare appointment added from My Health.",
    roomId: "bedroom",
    roomName: "Bedroom",
    group: "later",
    timeLabel: draft.time ? `${draft.date}, ${draft.time}` : draft.date,
    priority: "normal",
    dueAt,
    timeZone: "Europe/London",
  };
}
