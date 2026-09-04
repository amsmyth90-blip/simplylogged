import type { DocumentSummary } from "@diarydock/documents";
import type { ConflictResolution, SyncConflict } from "@diarydock/offline-store";

function readableDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Recently updated";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

type DocumentRowProps = {
  conflict?: SyncConflict;
  document: DocumentSummary;
  onEdit: () => void;
  onOpen: () => void;
  onResolve: (resolution: ConflictResolution) => void;
};

export function DocumentRow({ conflict, document, onEdit, onOpen, onResolve }: DocumentRowProps) {
  return (
    <article className="file-row">
      <div className={`file-kind file-kind-${document.kind.toLowerCase()}`} aria-hidden="true">
        {document.kind === "PDF" ? "PDF" : document.kind.slice(0, 1)}
      </div>
      <div className="file-copy">
        <h2>{document.title}</h2>
        <p>{document.category} · {document.kind} · {document.size}</p>
        <small>
          Updated {readableDate(document.updatedAt)}
          {document.dueDate ? ` · Due ${readableDate(document.dueDate)}` : ""}
        </small>
      </div>
      <div className="file-badges">
        {document.reviewStatus === "needs-review" ? <span className="review-badge">Review</span> : null}
        {document.emergencyVisible ? <span>Emergency</span> : null}
        {document.syncState !== "CLEAN" ? <span>Offline</span> : null}
        {document.hasStoredFile ? <button type="button" onClick={onOpen}>Open</button> : null}
        <button type="button" onClick={onEdit}>Edit</button>
      </div>
      {conflict ? (
        <div className="file-conflict" role="group" aria-label={`Resolve ${document.title}`}>
          <p>This file changed here and on another device. Choose which details to keep.</p>
          <button type="button" onClick={() => onResolve("KEEP_LOCAL")}>Keep this device</button>
          <button type="button" onClick={() => onResolve("USE_SERVER")}>Use synced version</button>
        </div>
      ) : null}
    </article>
  );
}
