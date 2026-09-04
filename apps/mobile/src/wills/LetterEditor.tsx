import { useEffect, useState } from "react";

import type { DocumentSummary } from "@diarydock/documents";
import {
  createLetterDraft,
  letterPurposeOptions,
  letterRecipientOptions,
  type LetterDraft,
  type MobileLetterOfWishes,
} from "@diarydock/wills";

import type { WillsDraftMutation } from "./wills-client";
import { LetterAttachments } from "./LetterAttachments";
import { LetterDeliveryFields } from "./LetterDeliveryFields";
import { LetterVersionHistory } from "./LetterVersionHistory";

type Props = {
  busy: boolean;
  documents: DocumentSummary[];
  letter: MobileLetterOfWishes | null;
  online: boolean;
  open: boolean;
  onClose: () => void;
  onRestore: (
    letterId: string,
    versionId: string,
    newVersionId: string,
    createdAt: string,
  ) => Promise<boolean>;
  onSave: (mutation: WillsDraftMutation) => Promise<boolean>;
};

function initialDraft(letter: MobileLetterOfWishes | null): MobileLetterOfWishes {
  return letter ?? createLetterDraft();
}

export function LetterEditor(props: Props) {
  const [draft, setDraft] = useState<MobileLetterOfWishes>(
    () => initialDraft(props.letter),
  );

  useEffect(() => {
    if (props.open) setDraft(initialDraft(props.letter));
  }, [props.letter, props.open]);

  if (!props.open) return null;

  function change<K extends keyof MobileLetterOfWishes>(
    key: K,
    value: MobileLetterOfWishes[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!draft.title.trim() || !draft.content.trim() || props.busy || !props.online) {
      return;
    }
    const now = new Date().toISOString();
    const id = draft.id || crypto.randomUUID();
    const letter: LetterDraft = {
      id,
      title: draft.title.trim(),
      recipientType: draft.recipientType,
      recipientName: draft.recipientName.trim(),
      purpose: draft.purpose,
      content: draft.content.trim(),
      envelopeTitle: draft.envelopeTitle.trim(),
      envelopeMessage: draft.envelopeMessage.trim(),
      memoryNotes: draft.memoryNotes.trim(),
      attachmentDocumentIds: draft.attachmentDocumentIds,
      delivery: draft.delivery,
      deliveryActivation: draft.deliveryActivation,
      status: draft.status,
    };
    const versionNumber = Math.max(
      0,
      ...draft.versions.map((entry) => entry.versionNumber),
    ) + 1;
    const version = {
      id: crypto.randomUUID(),
      versionNumber,
      createdAt: now,
      title: letter.title,
      content: letter.content,
      envelopeTitle: letter.envelopeTitle,
      envelopeMessage: letter.envelopeMessage,
    };
    if (await props.onSave({ operation: "UPSERT_LETTER", letter, version })) {
      props.onClose();
    }
  }

  return (
    <div className="wills-editor-backdrop" role="presentation">
      <section
        className="wills-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-editor-title"
      >
        <header>
          <div>
            <p>Private personal message</p>
            <h2 id="letter-editor-title">
              {draft.id ? "Edit Letter of Wishes" : "Write a Letter of Wishes"}
            </h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close Letter of Wishes editor"
          >
            ×
          </button>
        </header>
        <p>
          This is personal guidance, not a legal will. Saving creates a private
          version; nothing is delivered automatically.
        </p>
        <label>
          <span>Letter title</span>
          <input
            autoFocus
            maxLength={240}
            value={draft.title}
            onChange={(event) => change("title", event.target.value)}
          />
        </label>
        <div className="wills-editor-row">
          <label>
            <span>For</span>
            <select
              value={draft.recipientType}
              onChange={(event) => {
                change(
                  "recipientType",
                  event.target.value as MobileLetterOfWishes["recipientType"],
                );
              }}
            >
              {letterRecipientOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Name or relationship</span>
            <input
              maxLength={160}
              value={draft.recipientName}
              onChange={(event) => change("recipientName", event.target.value)}
            />
          </label>
        </div>
        <label>
          <span>Purpose</span>
          <select
            value={draft.purpose}
            onChange={(event) => {
              change(
                "purpose",
                event.target.value as MobileLetterOfWishes["purpose"],
              );
            }}
          >
            {letterPurposeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Your words</span>
          <textarea
            rows={10}
            maxLength={50_000}
            value={draft.content}
            onChange={(event) => change("content", event.target.value)}
          />
        </label>
        <div className="wills-editor-section">
          <h3>Envelope</h3>
          <label>
            <span>Envelope title</span>
            <input
              maxLength={240}
              value={draft.envelopeTitle}
              onChange={(event) => change("envelopeTitle", event.target.value)}
            />
          </label>
          <label>
            <span>Short message</span>
            <textarea
              rows={3}
              maxLength={2_000}
              value={draft.envelopeMessage}
              onChange={(event) => change("envelopeMessage", event.target.value)}
            />
          </label>
        </div>
        <label>
          <span>Private memory notes</span>
          <textarea
            rows={4}
            maxLength={10_000}
            value={draft.memoryNotes}
            onChange={(event) => change("memoryNotes", event.target.value)}
          />
        </label>
        <LetterDeliveryFields
          delivery={draft.delivery}
          onChange={(delivery) => change("delivery", delivery)}
        />
        <LetterAttachments
          documents={props.documents}
          selectedIds={draft.attachmentDocumentIds}
          onChange={(ids) => change("attachmentDocumentIds", ids)}
        />
        {draft.id ? (
          <LetterVersionHistory
            busy={props.busy}
            letterId={draft.id}
            online={props.online}
            versions={draft.versions}
            onRestore={async (...values) => {
              const restored = await props.onRestore(...values);
              if (restored) props.onClose();
              return restored;
            }}
          />
        ) : null}
        {!props.online ? (
          <p>
            Connect to save a new legal-planning record. Your encrypted copy remains
            available offline.
          </p>
        ) : null}
        <footer>
          <button type="button" onClick={props.onClose}>Cancel</button>
          <button
            type="button"
            disabled={
              !draft.title.trim()
              || !draft.content.trim()
              || props.busy
              || !props.online
            }
            onClick={() => void save()}
          >
            {props.busy ? "Saving…" : `Save version ${draft.versions.length + 1}`}
          </button>
        </footer>
      </section>
    </div>
  );
}
