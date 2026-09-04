import type { DocumentSummary } from "@diarydock/documents";

export function LetterAttachments(props: {
  documents: DocumentSummary[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(documentId: string) {
    props.onChange(props.selectedIds.includes(documentId)
      ? props.selectedIds.filter((id) => id !== documentId)
      : [...props.selectedIds, documentId]);
  }

  return (
    <div className="wills-editor-section">
      <h3>Safe Room attachments</h3>
      <p className="wills-inline-note">
        Linking a file does not share it or change its access permissions.
      </p>
      <div className="wills-attachment-options">
        {props.documents.map((document) => (
          <label key={document.id}>
            <input
              type="checkbox"
              checked={props.selectedIds.includes(document.id)}
              onChange={() => toggle(document.id)}
            />
            <span>{document.title}</span>
          </label>
        ))}
        {!props.documents.length ? <p>No Safe Room files are available yet.</p> : null}
      </div>
    </div>
  );
}
