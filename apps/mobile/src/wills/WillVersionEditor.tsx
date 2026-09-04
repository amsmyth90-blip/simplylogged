import { useEffect, useState } from "react";

import type { DocumentSummary } from "@diarydock/documents";
import type { MobileWillVersion } from "@diarydock/wills";

import type { WillsDraftMutation } from "./wills-client";

type Props = {
  busy: boolean;
  documents: DocumentSummary[];
  online: boolean;
  open: boolean;
  onClose: () => void;
  onSave: (mutation: WillsDraftMutation) => Promise<boolean>;
};

export function WillVersionEditor(props: Props) {
  const [documentId, setDocumentId] = useState("");
  const [label, setLabel] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [status, setStatus] = useState<MobileWillVersion["status"]>("signed");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!props.open) return;
    setDocumentId(props.documents[0]?.id ?? "");
    setLabel("");
    setSignedDate("");
    setStatus("signed");
    setNotes("");
  }, [props.documents, props.open]);

  if (!props.open) return null;

  async function save() {
    if (!documentId || !label.trim() || props.busy || !props.online) return;
    const version: MobileWillVersion = {
      id: crypto.randomUUID(),
      documentId,
      versionLabel: label.trim(),
      uploadedAt: new Date().toISOString(),
      signedDate,
      status,
      isCurrent: true,
      currentConfirmed: true,
      notes: notes.trim(),
      analysisStatus: "not-requested",
      summaryReview: "unreviewed",
      summaryReviewNote: "",
    };
    if (await props.onSave({ operation: "ADD_WILL_VERSION", version })) {
      props.onClose();
    }
  }

  return (
    <div className="wills-editor-backdrop" role="presentation">
      <section
        className="wills-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="will-version-title"
      >
        <header>
          <div><p>Checked file link</p><h2 id="will-version-title">Link a will version</h2></div>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close will version editor"
          >
            ×
          </button>
        </header>
        <p>
          Select only the will file you have personally checked. DiaryDock will not
          treat a scan as legally valid.
        </p>
        <label>
          <span>Safe Room file</span>
          <select value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
            <option value="">Select a file</option>
            {props.documents.map((document) => (
              <option key={document.id} value={document.id}>{document.title}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Version label</span>
          <input
            autoFocus
            maxLength={160}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="For example, signed will — August 2026"
          />
        </label>
        <div className="wills-editor-row">
          <label>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as MobileWillVersion["status"]);
              }}
            >
              <option value="signed">Signed</option>
              <option value="draft">Draft</option>
              <option value="superseded">Superseded</option>
            </select>
          </label>
          <label>
            <span>Signed date</span>
            <input
              type="date"
              value={signedDate}
              onChange={(event) => setSignedDate(event.target.value)}
            />
          </label>
        </div>
        <label>
          <span>Notes</span>
          <textarea
            rows={4}
            maxLength={4_000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        {!props.documents.length ? <p>Scan a will file into the Safe Room first.</p> : null}
        {!props.online ? <p>Connect to link a will version.</p> : null}
        <footer>
          <button type="button" onClick={props.onClose}>Cancel</button>
          <button
            type="button"
            disabled={!documentId || !label.trim() || props.busy || !props.online}
            onClick={() => void save()}
          >
            {props.busy ? "Saving…" : "Link checked file"}
          </button>
        </footer>
      </section>
    </div>
  );
}
