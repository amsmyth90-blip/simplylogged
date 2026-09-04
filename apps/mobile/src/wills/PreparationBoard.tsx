import { useEffect, useState } from "react";

import {
  willPreparationSections,
  type MobileWillRecord,
  type WillPreparationItem,
  type WillPreparationKey,
} from "@diarydock/wills";

import type { WillsDraftMutation } from "./wills-client";

type Props = {
  busy: boolean;
  online: boolean;
  will: MobileWillRecord;
  onSave: (mutation: WillsDraftMutation) => Promise<boolean>;
};

export function PreparationBoard(props: Props) {
  const [editing, setEditing] = useState<WillPreparationKey | null>(null);
  return (
    <section className="wills-card wills-record-card">
      <header>
        <div>
          <p>Practical checklist</p>
          <h2>Will preparation</h2>
        </div>
        <strong>
          {willPreparationSections.filter(
            ({ key }) => props.will.preparation[key].status === "complete",
          ).length}
          /{willPreparationSections.length}
        </strong>
      </header>
      <p className="wills-boundary-note">
        These notes help you prepare for a conversation with a qualified solicitor.
        They do not create a will.
      </p>
      <div className="wills-preparation-list">
        {willPreparationSections.map((section) => {
          const item = props.will.preparation[section.key];
          const marker = item.status === "complete"
            ? "✓"
            : item.status === "in-progress" ? "•" : "○";
          return (
            <button
              type="button"
              key={section.key}
              onClick={() => setEditing(section.key)}
            >
              <span className={`is-${item.status}`}>{marker}</span>
              <div>
                <strong>{section.label}</strong>
                <small>{item.status.replaceAll("-", " ")}</small>
                {item.confirmedData ? <p>{item.confirmedData}</p> : null}
              </div>
              <b>›</b>
            </button>
          );
        })}
      </div>
      {editing ? (
        <PreparationEditor
          busy={props.busy}
          item={props.will.preparation[editing]}
          itemKey={editing}
          online={props.online}
          onClose={() => setEditing(null)}
          onSave={props.onSave}
        />
      ) : null}
    </section>
  );
}

function PreparationEditor(props: {
  busy: boolean;
  item: WillPreparationItem;
  itemKey: WillPreparationKey;
  online: boolean;
  onClose: () => void;
  onSave: (mutation: WillsDraftMutation) => Promise<boolean>;
}) {
  const [status, setStatus] = useState(props.item.status);
  const [notes, setNotes] = useState(props.item.confirmedData);
  const label = willPreparationSections.find(
    (section) => section.key === props.itemKey,
  )?.label ?? "Preparation";

  useEffect(() => {
    setStatus(props.item.status);
    setNotes(props.item.confirmedData);
  }, [props.item]);

  async function save() {
    if (props.busy || !props.online) return;
    const saved = await props.onSave({
      operation: "UPDATE_PREPARATION",
      key: props.itemKey,
      item: {
        status,
        confirmedData: notes.trim(),
        updatedAt: new Date().toISOString(),
      },
    });
    if (saved) props.onClose();
  }

  return (
    <div className="wills-editor-backdrop" role="presentation">
      <section
        className="wills-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preparation-editor-title"
      >
        <header>
          <div>
            <p>Preparation note</p>
            <h2 id="preparation-editor-title">{label}</h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close preparation editor"
          >
            ×
          </button>
        </header>
        <label>
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as WillPreparationItem["status"]);
            }}
          >
            <option value="not-started">Not started</option>
            <option value="in-progress">In progress</option>
            <option value="complete">Complete</option>
          </select>
        </label>
        <label>
          <span>Confirmed information or questions</span>
          <textarea
            autoFocus
            rows={8}
            maxLength={10_000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <p>
          Only mark information complete after checking it. Seek legal advice for
          decisions about your will.
        </p>
        {!props.online ? <p>Connect to change preparation notes.</p> : null}
        <footer>
          <button type="button" onClick={props.onClose}>Cancel</button>
          <button
            type="button"
            disabled={props.busy || !props.online}
            onClick={() => void save()}
          >
            {props.busy ? "Saving…" : "Save note"}
          </button>
        </footer>
      </section>
    </div>
  );
}
