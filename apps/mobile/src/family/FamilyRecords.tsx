import { useMemo, useState } from "react";

import type { OfflineStore } from "@diarydock/offline-store";

import { DocumentViewer } from "@mobile/files/DocumentViewer";
import { useDocuments } from "@mobile/files/use-documents";
import { useReminders } from "@mobile/reminders/use-reminders";

type Props = {
  accessToken: string;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onAllFiles: () => void;
  onAllReminders: () => void;
  onScan: () => void;
};

function inFamilyRoom(item: { roomId?: string; roomName?: string }) {
  return item.roomId === "family-room" || item.roomName?.toLowerCase() === "family room";
}

export function FamilyRecords(props: Props) {
  const files = useDocuments(props.store, props.syncStatus, props.synchronize);
  const reminders = useReminders(props.store, props.syncStatus, props.synchronize);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const documents = useMemo(() => files.documents.filter(inFamilyRoom), [files.documents]);
  const roomReminders = useMemo(() => reminders.reminders.filter(inFamilyRoom), [reminders.reminders]);
  const viewing = documents.find((item) => item.syncId === viewingId) ?? null;

  return (
    <>
      <section className="family-card family-record-summary">
        <div><span><strong>{documents.length}</strong> documents</span><span><strong>{roomReminders.filter((item) => item.group !== "done").length}</strong> open reminders</span></div>
        <button type="button" className="family-primary" onClick={props.onScan}>＋ Scan into Family Room</button>
      </section>
      <section className="family-card">
        <div className="family-section-title"><div><p>Secure records</p><h2>Family documents</h2></div><button type="button" onClick={props.onAllFiles}>All Files</button></div>
        {documents.length ? documents.slice(0, 4).map((document) => (
          <button className="family-record" type="button" key={document.syncId} onClick={() => setViewingId(document.syncId)}>
            <span>{document.kind === "PDF" ? "PDF" : "DOC"}</span><div><strong>{document.title}</strong><small>{document.category} · {document.size}</small></div><b>›</b>
          </button>
        )) : <p className="family-empty">No documents have been filed here yet.</p>}
      </section>
      <section className="family-card">
        <div className="family-section-title"><div><p>Shared next steps</p><h2>Family reminders</h2></div><button type="button" onClick={props.onAllReminders}>See all</button></div>
        {roomReminders.length ? roomReminders.slice(0, 4).map((reminder) => (
          <label className="family-reminder" key={reminder.id}>
            <input type="checkbox" checked={reminder.group === "done"} onChange={() => void reminders.toggle(reminder)} />
            <span><strong>{reminder.title}</strong><small>{reminder.timeLabel}</small></span>
          </label>
        )) : <p className="family-empty">Nothing needs your attention here.</p>}
      </section>
      {files.error || reminders.error ? <p className="form-message form-error">{files.error ?? reminders.error}</p> : null}
      {viewing ? <DocumentViewer accessToken={props.accessToken} document={viewing} store={props.store} onClose={() => setViewingId(null)} /> : null}
    </>
  );
}
