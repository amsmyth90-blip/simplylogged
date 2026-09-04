import type { ReactNode } from "react";

export function TravelRecordModal({ busy, children, label, onClose, onDelete, onSubmit,
  title }: {
  busy: boolean;
  children: ReactNode;
  label: string;
  onClose: () => void;
  onDelete?: () => void;
  onSubmit: (event: React.FormEvent) => void;
  title: string;
}) {
  return <div className="travel-modal" role="dialog" aria-modal="true" aria-label={title}>
    <form className="travel-editor" onSubmit={onSubmit}>
      <header><div><p>{label}</p><h2>{title}</h2></div>
        <button type="button" onClick={onClose} aria-label={`Close ${label.toLowerCase()}`}>×</button></header>
      {children}
      <footer>{onDelete ? <button type="button" className="is-delete" disabled={busy}
        onClick={onDelete}>Delete</button> : <span />}
        <button type="submit" className="is-save" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </footer>
    </form>
  </div>;
}
