import { useMemo, useState } from "react";

import type { HealthSnapshot } from "@diarydock/health";
import type { OfflineStore } from "@diarydock/offline-store";

import healthImage from "../../../../public/images/pages/bedroom-health-room-clean.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { ProgressiveRecordList } from "@mobile/components/ProgressiveRecordList";
import { DocumentViewer } from "@mobile/files/DocumentViewer";
import { useDocuments } from "@mobile/files/use-documents";
import { HealthOverview, HealthRecordList, type HealthView } from "./HealthRecords";
import { HealthConnections } from "./HealthConnections";
import { HealthFamilyEditor } from "./HealthFamilyEditor";
import { HealthRecordEditor, type HealthEditorType } from "./HealthRecordEditor";
import { HealthOverviewEditor } from "./HealthOverviewEditor";
import { useHealth } from "./use-health";
import { useReminders } from "@mobile/reminders/use-reminders";

type Props = {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: HealthSnapshot;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onScan: (roomName: string) => void;
};

const views: Array<{ id: HealthView; label: string; icon: string }> = [
  { id: "overview", label: "My Health", icon: "♥" },
  { id: "medications", label: "Medicines", icon: "Rx" },
  { id: "appointments", label: "Visits", icon: "◷" },
  { id: "allergies", label: "Alerts", icon: "!" },
  { id: "history", label: "Timeline", icon: "•" },
];

function belongsToHealth(item: { roomId?: string; roomName?: string }) {
  return item.roomId === "bedroom" || item.roomName?.toLowerCase() === "bedroom";
}

export function HealthScreen(props: Props) {
  const health = useHealth({
    accessToken: props.accessToken,
    disableOnline: props.disableOnline,
    initialSnapshot: props.initialSnapshot,
    store: props.store,
    syncStatus: props.syncStatus,
  });
  const files = useDocuments(props.store, props.syncStatus, props.synchronize);
  const reminders = useReminders(props.store, props.syncStatus, props.synchronize);
  const [view, setView] = useState<HealthView>("overview");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingOverview, setEditingOverview] = useState(false);
  const [editingFamily, setEditingFamily] = useState(false);
  const documents = useMemo(
    () => files.documents.filter(belongsToHealth),
    [files.documents],
  );
  const viewing = documents.find((item) => item.syncId === viewingId) ?? null;
  const record = health.snapshot?.health;
  const total = health.snapshot
    ? Object.values(health.snapshot.counts).reduce((sum, count) => sum + count, 0)
    : 0;
  const editorType: HealthEditorType = view === "medications"
    ? "medication"
    : view === "appointments"
      ? "appointment"
      : view === "allergies" ? "allergy" : "timeline";

  return (
    <main className="health-screen">
      <header className="health-header">
        <button
          type="button"
          onClick={props.onBack}
          aria-label="Back to the estate map"
        >
          ‹
        </button>
        <div>
          <strong>My Health</strong>
          <small>Private health & wellbeing</small>
        </div>
        <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>
          {props.syncStatus.toLowerCase().replaceAll("_", " ")}
        </span>
      </header>
      <section
        className="health-hero"
        style={{ backgroundImage: `url(${healthImage})` }}
      >
        <div />
        <article>
          <p>Private space</p>
          <h1>Health & wellbeing</h1>
          <span>
            Your health information, appointments and essential details kept calm
            and easy to find.
          </span>
        </article>
      </section>
      <section className="health-sheet">
        <section className="health-summary">
          <article><strong>{total}</strong><small>health records</small></article>
          <article><strong>{documents.length}</strong><small>health files</small></article>
          <article>
            <strong>{record?.allergies.length ?? 0}</strong>
            <small>allergy alerts</small>
          </article>
          <button type="button" onClick={() => props.onScan("Bedroom")}>
            ＋ Scan health file
          </button>
        </section>
        <div className="health-tabs" role="tablist" aria-label="Health sections">
          {views.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={view === item.id}
              className={view === item.id ? "is-active" : ""}
              onClick={() => setView(item.id)}
              key={item.id}
            >
              <span>{item.icon}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
        <button
          className="health-add-record"
          type="button"
          onClick={() => setAdding(true)}
        >
          ＋ Add health record
        </button>
        <p className="health-privacy-note">
          🔒 Private health information. Sharing is never implied by linking a
          profile or contact.
        </p>
        {health.message || reminders.error ? (
          <p className="health-status">{reminders.error ?? health.message}</p>
        ) : null}
        {health.loading && !record ? (
          <p className="health-status">Opening your encrypted health records…</p>
        ) : null}
        {record ? view === "overview" ? (
          <>
            <HealthOverview health={record} onEdit={() => setEditingOverview(true)} />
            <HealthConnections
              directory={health.snapshot!.directory}
              health={record}
              onEditFamily={() => setEditingFamily(true)}
              onEditOverview={() => setEditingOverview(true)}
            />
          </>
        ) : <HealthRecordList health={record} view={view} /> : null}
        <section className="health-card health-files-card">
          <header>
            <div><p>Secure files</p><h2>Health documents</h2></div>
            <button type="button" onClick={() => props.onScan("Bedroom")}>＋ Scan</button>
          </header>
          <div>
            <ProgressiveRecordList
              initialCount={6}
              items={documents}
              noun="health documents"
              renderItem={(document) => (
                <button
                  type="button"
                  key={document.syncId}
                  onClick={() => setViewingId(document.syncId)}
                >
                  <span>
                    {document.kind === "PDF"
                      ? "PDF" : document.kind === "Image" ? "IMG" : "DOC"}
                  </span>
                  <div>
                    <strong>{document.title}</strong>
                    <small>{document.category} · {document.size}</small>
                  </div>
                  <b>›</b>
                </button>
              )}
            />
            {!documents.length ? (
              <p>No health documents have been filed here yet.</p>
            ) : null}
          </div>
        </section>
        <p className="health-disclaimer">
          DiaryDock organises information you provide. It does not diagnose
          conditions, verify medical accuracy, provide medical advice or replace
          emergency services.
        </p>
      </section>
      {viewing ? (
        <DocumentViewer
          accessToken={props.accessToken}
          document={viewing}
          store={props.store}
          onClose={() => setViewingId(null)}
        />
      ) : null}
      <HealthRecordEditor
        busy={health.busy}
        initialType={editorType}
        online={health.online}
        open={adding}
        onClose={() => setAdding(false)}
        onCreateReminder={reminders.createWithId}
        onSave={health.mutate}
      />
      {record && health.snapshot ? (
        <HealthOverviewEditor
          busy={health.busy}
          carePreferences={record.carePreferences}
          directory={health.snapshot.directory}
          online={health.online}
          open={editingOverview}
          profile={record.profile}
          onClose={() => setEditingOverview(false)}
          onSave={health.mutate}
        />
      ) : null}
      {record && health.snapshot ? (
        <HealthFamilyEditor
          busy={health.busy}
          directory={health.snapshot.directory}
          online={health.online}
          open={editingFamily}
          selectedIds={record.familyMemberIds}
          onClose={() => setEditingFamily(false)}
          onSave={health.mutate}
        />
      ) : null}
      <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
    </main>
  );
}
