import type { Dispatch, SetStateAction } from "react";

import { ModalShell } from "@/components/ModalShell";
import type {
  EmergencyContactDraft,
  EmergencyModalMode,
  EmergencyNoteDraft,
  EmergencyPlanDraft,
} from "@/components/emergency/emergency-model";

type EmergencyEditorModalProps = {
  contactDraft: EmergencyContactDraft;
  mode: EmergencyModalMode;
  noteDraft: EmergencyNoteDraft;
  onClose: () => void;
  onSave: () => void;
  planDraft: EmergencyPlanDraft;
  setContactDraft: Dispatch<SetStateAction<EmergencyContactDraft>>;
  setNoteDraft: Dispatch<SetStateAction<EmergencyNoteDraft>>;
  setPlanDraft: Dispatch<SetStateAction<EmergencyPlanDraft>>;
};

const fieldClass =
  "w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss";

export function EmergencyEditorModal(props: EmergencyEditorModalProps) {
  const title =
    props.mode === "contact"
      ? "Add emergency contact"
      : props.mode === "plan"
        ? "Add household plan"
        : "Add home note";
  return (
    <ModalShell
      open={props.mode !== null}
      title={title}
      subtitle="Shared across the app through the DiaryDock data layer."
      onClose={props.onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={props.onSave}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
          >
            Save
          </button>
        </div>
      }
    >
      {props.mode === "contact" ? (
        <div className="space-y-4">
          <TextField
            label="Name"
            value={props.contactDraft.name}
            placeholder="Jane Smith"
            onChange={(name) =>
              props.setContactDraft((current) => ({ ...current, name }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Relationship"
              value={props.contactDraft.relation}
              placeholder="Neighbour"
              onChange={(relation) =>
                props.setContactDraft((current) => ({ ...current, relation }))
              }
            />
            <TextField
              label="Phone"
              value={props.contactDraft.phone}
              placeholder="07700 123456"
              onChange={(phone) =>
                props.setContactDraft((current) => ({ ...current, phone }))
              }
            />
          </div>
          <TextField
            label="Note"
            value={props.contactDraft.note}
            placeholder="Holds a spare key"
            onChange={(note) =>
              props.setContactDraft((current) => ({ ...current, note }))
            }
          />
        </div>
      ) : null}
      {props.mode === "plan" ? (
        <div className="space-y-4">
          <TextField
            label="Title"
            value={props.planDraft.title}
            placeholder="Flood response"
            onChange={(title) =>
              props.setPlanDraft((current) => ({ ...current, title }))
            }
          />
          <TextField
            label="Summary"
            value={props.planDraft.summary}
            placeholder="What to do and who to call"
            onChange={(summary) =>
              props.setPlanDraft((current) => ({ ...current, summary }))
            }
          />
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Steps</span>
            <textarea
              value={props.planDraft.steps}
              onChange={(event) =>
                props.setPlanDraft((current) => ({
                  ...current,
                  steps: event.target.value,
                }))
              }
              rows={5}
              placeholder={
                "Call the insurer\nMove key documents upstairs\nAlert the neighbour"
              }
              className={fieldClass}
            />
          </label>
        </div>
      ) : null}
      {props.mode === "note" ? (
        <div className="space-y-4">
          <TextField
            label="Label"
            value={props.noteDraft.label}
            placeholder="Water stopcock"
            onChange={(label) =>
              props.setNoteDraft((current) => ({ ...current, label }))
            }
          />
          <TextField
            label="Value"
            value={props.noteDraft.value}
            placeholder="Utility cupboard beside the hall"
            onChange={(value) =>
              props.setNoteDraft((current) => ({ ...current, value }))
            }
          />
        </div>
      ) : null}
    </ModalShell>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
    </label>
  );
}
