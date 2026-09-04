import { useEffect, useState } from "react";

import type { MobileWillRecord, WillDetails, WillExecutor } from "@diarydock/wills";

import type { WillsDraftMutation } from "./wills-client";
import { detailsFromWill } from "./wills-model";
import { WillOriginalStorageFields } from "./WillOriginalStorageFields";

type Props = {
  busy: boolean;
  online: boolean;
  open: boolean;
  will: MobileWillRecord;
  onClose: () => void;
  onSave: (mutation: WillsDraftMutation) => Promise<boolean>;
};

export function WillDetailsEditor(props: Props) {
  const [draft, setDraft] = useState<WillDetails>(() => detailsFromWill(props.will));

  useEffect(() => {
    if (props.open) setDraft(detailsFromWill(props.will));
  }, [props.open, props.will]);

  if (!props.open) return null;

  function change<K extends keyof WillDetails>(key: K, value: WillDetails[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function executor(kind: "primaryExecutor" | "backupExecutor", value: WillExecutor) {
    change(kind, value);
  }

  async function save() {
    if (props.busy || !props.online) return;
    if (await props.onSave({ operation: "UPDATE_DETAILS", details: draft })) props.onClose();
  }

  return (
    <div className="wills-editor-backdrop" role="presentation">
      <section
        className="wills-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="will-details-title"
      >
        <header>
          <div>
            <p>Private legal planning</p>
            <h2 id="will-details-title">Will details</h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close will details editor"
          >
            ×
          </button>
        </header>
        <div className="wills-editor-section">
          <h3>Solicitor or firm</h3>
          <div className="wills-editor-row">
            <Field
              label="Name"
              value={draft.solicitorName}
              onChange={(value) => change("solicitorName", value)}
            />
            <Field
              label="Firm"
              value={draft.solicitorFirm}
              onChange={(value) => change("solicitorFirm", value)}
            />
          </div>
          <div className="wills-editor-row">
            <Field
              label="Phone"
              value={draft.solicitorPhone}
              onChange={(value) => change("solicitorPhone", value)}
            />
            <Field
              label="Email"
              type="email"
              value={draft.solicitorEmail}
              onChange={(value) => change("solicitorEmail", value)}
            />
          </div>
          <Field
            label="Reference number"
            value={draft.referenceNumber}
            onChange={(value) => change("referenceNumber", value)}
          />
        </div>
        <ExecutorFields
          label="Primary executor"
          value={draft.primaryExecutor}
          onChange={(value) => executor("primaryExecutor", value)}
        />
        <ExecutorFields
          label="Backup executor"
          value={draft.backupExecutor}
          onChange={(value) => executor("backupExecutor", value)}
        />
        <WillOriginalStorageFields value={draft} onChange={change} />
        <Field
          label="Private notes"
          multiline
          value={draft.notes}
          maximum={10_000}
          onChange={(value) => change("notes", value)}
        />
        <label className="wills-check">
          <input
            type="checkbox"
            checked={draft.trustedPersonInformed}
            onChange={(event) => {
              change("trustedPersonInformed", event.target.checked);
            }}
          />
          <span>A trusted person knows how to locate the original</span>
        </label>
        <p>DiaryDock records what you enter and does not verify legal validity.</p>
        {!props.online ? <p>Connect to change legal-planning details.</p> : null}
        <footer>
          <button type="button" onClick={props.onClose}>Cancel</button>
          <button
            type="button"
            disabled={props.busy || !props.online}
            onClick={() => void save()}
          >
            {props.busy ? "Saving…" : "Save details"}
          </button>
        </footer>
      </section>
    </div>
  );
}

type FieldProps = {
  label: string;
  maximum?: number;
  multiline?: boolean;
  type?: string;
  value: string;
  onChange: (value: string) => void;
};

function Field(props: FieldProps) {
  return (
    <label>
      <span>{props.label}</span>
      {props.multiline ? (
        <textarea
          rows={4}
          maxLength={props.maximum ?? 500}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
      ) : (
        <input
          type={props.type ?? "text"}
          maxLength={props.maximum ?? 254}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
      )}
    </label>
  );
}

type ExecutorFieldsProps = {
  label: string;
  value: WillExecutor;
  onChange: (value: WillExecutor) => void;
};

function ExecutorFields(props: ExecutorFieldsProps) {
  const change = <K extends keyof WillExecutor>(key: K, value: WillExecutor[K]) => {
    props.onChange({ ...props.value, [key]: value });
  };
  return (
    <div className="wills-editor-section">
      <h3>{props.label}</h3>
      <Field
        label="Name"
        value={props.value.name}
        onChange={(value) => change("name", value)}
      />
      <div className="wills-editor-row">
        <Field
          label="Phone"
          value={props.value.phone}
          onChange={(value) => change("phone", value)}
        />
        <Field
          label="Email"
          type="email"
          value={props.value.email}
          onChange={(value) => change("email", value)}
        />
      </div>
      <label className="wills-check">
        <input
          type="checkbox"
          checked={props.value.informed}
          onChange={(event) => change("informed", event.target.checked)}
        />
        <span>This person has been informed</span>
      </label>
    </div>
  );
}
