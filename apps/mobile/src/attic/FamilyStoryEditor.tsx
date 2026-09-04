import { useEffect, useMemo, useState } from "react";

import type { FamilyStory, FamilyStoryImage } from "@diarydock/attic";
import type { DocumentSummary } from "@diarydock/documents";

import { ProgressiveRecordList } from "@mobile/components/ProgressiveRecordList";

type Draft = {
  title: string;
  storyText: string;
  people: string;
  place: string;
  dateLabel: string;
  tags: string;
};

const emptyDraft: Draft = {
  title: "",
  storyText: "",
  people: "",
  place: "",
  dateLabel: "",
  tags: "",
};

type Props = {
  busy: boolean;
  imageDocuments: DocumentSummary[];
  online: boolean;
  open: boolean;
  onClose: () => void;
  onSave: (story: FamilyStory) => Promise<boolean>;
};

function toImage(document: DocumentSummary): FamilyStoryImage {
  return {
    documentId: document.id,
    fileName: document.title,
  };
}

export function FamilyStoryEditor(props: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const valid = draft.title.trim().length > 1 && draft.storyText.trim().length > 8;
  const selectedImages = useMemo(
    () => props.imageDocuments.filter((item) => selected.includes(item.syncId)),
    [props.imageDocuments, selected],
  );

  useEffect(() => {
    if (!props.open) return;
    setDraft(emptyDraft);
    setSelected([]);
    setError(null);
  }, [props.open]);

  if (!props.open) return null;

  function change(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggle(document: DocumentSummary) {
    setSelected((current) =>
      current.includes(document.syncId)
        ? current.filter((id) => id !== document.syncId)
        : [...current, document.syncId].slice(0, 8),
    );
  }

  async function save() {
    if (!valid || props.busy || !props.online) return;
    const now = new Date().toISOString();
    const saved = await props.onSave({
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      storyText: draft.storyText.trim(),
      people: draft.people.trim(),
      place: draft.place.trim(),
      dateLabel: draft.dateLabel.trim(),
      tags: draft.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8),
      images: selectedImages.map(toImage),
      createdAt: now,
      updatedAt: now,
    });
    if (saved) props.onClose();
    else setError("Review the message in the Attic and try again.");
  }

  return (
    <div className="attic-editor-backdrop" role="presentation">
      <section className="attic-editor" role="dialog" aria-modal="true" aria-labelledby="story-editor-title">
        <header>
          <div>
            <p>Family History</p>
            <h2 id="story-editor-title">Create a family story</h2>
          </div>
          <button type="button" onClick={props.onClose} aria-label="Close family story editor">×</button>
        </header>
        <div className="attic-editor-fields">
          <label>
            <span>Story title</span>
            <input autoFocus maxLength={160} value={draft.title} onChange={(event) => change("title", event.target.value)} placeholder="Sunday afternoons at Nana’s" />
          </label>
          <label className="attic-wide-field">
            <span>The story</span>
            <textarea maxLength={20_000} rows={6} value={draft.storyText} onChange={(event) => change("storyText", event.target.value)} placeholder="Write the details your family should remember…" />
          </label>
          <label><span>People</span><input maxLength={500} value={draft.people} onChange={(event) => change("people", event.target.value)} /></label>
          <label><span>Place</span><input maxLength={300} value={draft.place} onChange={(event) => change("place", event.target.value)} /></label>
          <label><span>Date or period</span><input maxLength={120} value={draft.dateLabel} onChange={(event) => change("dateLabel", event.target.value)} placeholder="Summer 1978" /></label>
          <label><span>Tags, separated by commas</span><input maxLength={480} value={draft.tags} onChange={(event) => change("tags", event.target.value)} /></label>
        </div>
        <section className="attic-image-choice">
          <header><strong>Link Attic photos</strong><small>{selected.length}/8 selected</small></header>
          {props.imageDocuments.length ? (
            <div>
              <ProgressiveRecordList
                initialCount={24}
                items={props.imageDocuments}
                noun="Attic photos"
                renderItem={(document) => (
                <label key={document.syncId}>
                  <input type="checkbox" checked={selected.includes(document.syncId)} onChange={() => toggle(document)} />
                  <span>{document.title}</span>
                </label>
                )}
              />
            </div>
          ) : <p>Scan photos into the Attic first if you want to link them to this story.</p>}
        </section>
        {!props.online ? <p className="form-message">Connect to save a new family story. Your encrypted archive remains available offline.</p> : null}
        {error ? <p className="form-message form-error">{error}</p> : null}
        <footer>
          <button type="button" onClick={props.onClose}>Cancel</button>
          <button type="button" disabled={!valid || props.busy || !props.online} onClick={() => void save()}>{props.busy ? "Saving…" : "Save story"}</button>
        </footer>
      </section>
    </div>
  );
}
