import { useMemo, useState } from "react";

import type { EditableDocument } from "@diarydock/documents";
import type { ConflictResolution, OfflineStore } from "@diarydock/offline-store";

import { BrandMark } from "@mobile/components/BrandMark";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";

import { DocumentRow } from "./DocumentRow";
import { DocumentEditor } from "./DocumentEditor";
import { DocumentViewer } from "./DocumentViewer";
import { useDocuments } from "./use-documents";

type FileFilter = "all" | "emergency" | "needs-review";

type FilesScreenProps = {
  accessToken: string;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onNavigate: (destination: MobileDestination) => void;
};

export function FilesScreen(props: FilesScreenProps) {
  const files = useDocuments(props.store, props.syncStatus, props.synchronize);
  const { documents, error, loading } = files;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [filter, setFilter] = useState<FileFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const categories = useMemo(
    () => [...new Set(documents.map((item) => item.category))].sort(),
    [documents],
  );
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesSearch = !search || [document.title, document.category, document.kind,
        document.roomName, document.issuer].filter(Boolean).join(" ").toLowerCase().includes(search);
      const matchesCategory = category === "all" || document.category === category;
      const matchesFilter = filter === "all"
        || (filter === "emergency" && document.emergencyVisible)
        || (filter === "needs-review" && document.reviewStatus === "needs-review");
      return matchesSearch && matchesCategory && matchesFilter;
    });
  }, [category, documents, filter, query]);
  const conflicts = useMemo(
    () => new Map(files.conflicts.map((item) => [item.recordId, item])),
    [files.conflicts],
  );
  const editing = documents.find((item) => item.syncId === editingId) ?? null;
  const viewing = documents.find((item) => item.syncId === viewingId) ?? null;

  async function save(draft: EditableDocument) {
    return editing ? files.update(editing, draft) : false;
  }

  async function resolve(syncId: string, resolution: ConflictResolution) {
    const conflict = conflicts.get(syncId);
    if (!conflict) return;
    const message = resolution === "KEEP_LOCAL"
      ? "Keep this device’s details and replace the synced version?"
      : "Use the synced details and discard this device’s unsynced changes?";
    if (window.confirm(message)) await files.resolveConflict(conflict, resolution);
  }

  return (
    <main className="files-screen">
      <header className="files-header">
        <div className="app-brand">
          <BrandMark />
          <div><strong>DiaryDock</strong><span>Your digital home</span></div>
        </div>
        <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>
          {props.syncStatus.toLowerCase().replaceAll("_", " ")}
        </span>
      </header>

      <section className="files-hero">
        <p className="eyebrow">All Files</p>
        <h1>Everything, safely organised</h1>
        <p>Browse the secure document index even when this device is offline.</p>
        <div className="file-summary" aria-label="File totals">
          <span><strong>{documents.length}</strong> files</span>
          <span><strong>{documents.filter((item) => item.reviewStatus === "needs-review").length}</strong> to review</span>
          <span><strong>{documents.filter((item) => item.emergencyVisible).length}</strong> emergency</span>
        </div>
      </section>

      <section className="file-controls" aria-label="Filter files">
        <label>
          <span>Search</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your files" />
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
      </section>

      <div className="file-filter-tabs" role="group" aria-label="File status">
        {(["all", "needs-review", "emergency"] as const).map((item) => (
          <button type="button" key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>
            {item === "all" ? "All" : item === "needs-review" ? "Needs review" : "Emergency"}
          </button>
        ))}
      </div>

      {error ? <p className="form-message form-error">{error}</p> : null}
      <section className="file-list" aria-live="polite" aria-busy={loading}>
        {visible.map((document) => (
          <DocumentRow
            conflict={conflicts.get(document.syncId)}
            document={document}
            key={document.syncId}
            onEdit={() => setEditingId(document.syncId)}
            onOpen={() => setViewingId(document.syncId)}
            onResolve={(resolution) => void resolve(document.syncId, resolution)}
          />
        ))}
        {!loading && !visible.length ? (
          <div className="empty-files"><h2>No files here yet</h2><p>Files added on the web will appear after a secure sync.</p></div>
        ) : null}
      </section>
      <DocumentEditor
        document={editing}
        open={Boolean(editing)}
        onClose={() => setEditingId(null)}
        onSave={save}
      />
      {viewing ? (
        <DocumentViewer
          accessToken={props.accessToken}
          document={viewing}
          store={props.store}
          onClose={() => setViewingId(null)}
        />
      ) : null}
      <MobileBottomNav active="FILES" onNavigate={props.onNavigate} />
    </main>
  );
}
