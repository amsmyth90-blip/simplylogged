import { useEffect, useState, type FormEvent } from "react";

import type { DocumentSummary, EditableDocument } from "@diarydock/documents";

type DocumentEditorProps = {
  document: DocumentSummary | null;
  open: boolean;
  onClose: () => void;
  onSave: (draft: EditableDocument) => Promise<boolean>;
};

function draftFor(document: DocumentSummary | null): EditableDocument {
  return {
    title: document?.title ?? "",
    category: document?.category ?? "",
    roomId: document?.roomId,
    roomName: document?.roomName,
    issuer: document?.issuer,
    dueDate: document?.dueDate,
    reviewStatus: document?.reviewStatus ?? "reviewed",
    emergencyVisible: document?.emergencyVisible ?? false,
  };
}

export function DocumentEditor(props: DocumentEditorProps) {
  const [draft, setDraft] = useState(() => draftFor(props.document));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (props.open) setDraft(draftFor(props.document));
  }, [props.document, props.open]);

  if (!props.open || !props.document) return null;

  function update<K extends keyof EditableDocument>(key: K, value: EditableDocument[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.category.trim()) return;
    setSaving(true);
    const saved = await props.onSave(draft);
    setSaving(false);
    if (saved) props.onClose();
  }

  return (
    <div className="file-editor-backdrop" role="presentation">
      <section className="file-editor" role="dialog" aria-modal="true" aria-labelledby="file-editor-title">
        <header>
          <div><p className="eyebrow">File details</p><h2 id="file-editor-title">Edit document</h2></div>
          <button type="button" className="quiet-button" onClick={props.onClose}>Close</button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <label>Title<input required maxLength={240} value={draft.title} onChange={(event) => update("title", event.target.value)} /></label>
          <label>Category<input required maxLength={160} value={draft.category} onChange={(event) => update("category", event.target.value)} /></label>
          <div className="file-editor-grid">
            <label>Area<input maxLength={160} value={draft.roomName ?? ""} onChange={(event) => update("roomName", event.target.value || undefined)} /></label>
            <label>Issuer<input maxLength={240} value={draft.issuer ?? ""} onChange={(event) => update("issuer", event.target.value || undefined)} /></label>
          </div>
          <label>Due or renewal date<input type="date" value={draft.dueDate ?? ""} onChange={(event) => update("dueDate", event.target.value || undefined)} /></label>
          <label className="file-check"><input type="checkbox" checked={draft.reviewStatus === "reviewed"} onChange={(event) => update("reviewStatus", event.target.checked ? "reviewed" : "needs-review")} /><span>Details reviewed</span></label>
          <label className="file-check"><input type="checkbox" checked={draft.emergencyVisible} onChange={(event) => update("emergencyVisible", event.target.checked)} /><span>Include in my emergency panel</span></label>
          <footer><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save details"}</button></footer>
        </form>
      </section>
    </div>
  );
}
