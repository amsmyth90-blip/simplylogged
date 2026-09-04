import { useMemo, useState } from "react";

import type { MobileLetterOfWishes, WillsSnapshot } from "@diarydock/wills";
import type { OfflineStore } from "@diarydock/offline-store";

import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { ProgressiveRecordList } from "@mobile/components/ProgressiveRecordList";
import { DocumentViewer } from "@mobile/files/DocumentViewer";
import { useDocuments } from "@mobile/files/use-documents";
import { useReminders } from "@mobile/reminders/use-reminders";
import { LetterEditor } from "./LetterEditor";
import { LettersList } from "./LettersList";
import { PreparationBoard } from "./PreparationBoard";
import { SafeRoomHeader } from "./SafeRoomHeader";
import { WillDetailsEditor } from "./WillDetailsEditor";
import { WillRecords } from "./WillRecords";
import { WillReviewEditor } from "./WillReviewEditor";
import { WillSummaryReview } from "./WillSummaryReview";
import { WillVersionEditor } from "./WillVersionEditor";
import { WillsOverview } from "./WillsOverview";
import { WishesEditor } from "./WishesEditor";
import { WishesPanel } from "./WishesPanel";
import { safeRoomItem, type WillsView } from "./wills-model";
import { useWills } from "./use-wills";

type Props = {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: WillsSnapshot;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onScan: (roomName: string) => void;
};

const views: Array<{ id: WillsView; label: string; icon: string }> = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "will", label: "My Will", icon: "W" },
  { id: "wishes", label: "Wishes", icon: "❧" },
  { id: "letters", label: "Letters", icon: "✉" },
  { id: "planning", label: "Planning", icon: "✓" },
];

export function SafeRoomScreen(props: Props) {
  const wills = useWills({
    accessToken: props.accessToken,
    disableOnline: props.disableOnline,
    initialSnapshot: props.initialSnapshot,
    store: props.store,
    syncStatus: props.syncStatus,
  });
  const files = useDocuments(props.store, props.syncStatus, props.synchronize);
  const reminders = useReminders(props.store, props.syncStatus, props.synchronize);
  const [view, setView] = useState<WillsView>("overview");
  const [editingDetails, setEditingDetails] = useState(false);
  const [editingWishes, setEditingWishes] = useState(false);
  const [addingVersion, setAddingVersion] = useState(false);
  const [reviewingDates, setReviewingDates] = useState(false);
  const [editingLetter, setEditingLetter] = useState<MobileLetterOfWishes | "new" | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const documents = useMemo(() => files.documents.filter(safeRoomItem), [files.documents]);
  const viewing = documents.find((document) => document.syncId === viewingId) ?? null;
  const snapshot = wills.snapshot;
  const reviewing = snapshot?.will.versions.find((version) => version.id === reviewingId) ?? null;

  return (
    <main className="wills-screen">
      <SafeRoomHeader syncStatus={props.syncStatus} onBack={props.onBack} />
      <section className="wills-sheet">
        <section className="wills-summary">
          <article>
            <strong>{snapshot?.counts.versions ?? 0}</strong>
            <small>will versions</small>
          </article>
          <article>
            <strong>{snapshot?.counts.letters ?? 0}</strong>
            <small>private letters</small>
          </article>
          <article>
            <strong>{documents.length}</strong>
            <small>Safe Room files</small>
          </article>
          <button type="button" onClick={() => props.onScan("Safe Room")}>
            ＋ Scan legal file
          </button>
        </section>
        <div className="wills-tabs" role="tablist" aria-label="Safe Room sections">
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
        <p className="wills-privacy-note">
          🔒 Private legal-planning records. Access is never granted by naming an
          executor, solicitor or recipient.
        </p>
        {reminders.error || wills.message ? (
          <p className="wills-status">{reminders.error ?? wills.message}</p>
        ) : null}
        {wills.loading && !snapshot ? (
          <p className="wills-status">Opening your encrypted Safe Room…</p>
        ) : null}
        {snapshot && view === "overview" ? (
          <WillsOverview
            snapshot={snapshot}
            documentCount={documents.length}
            onEditDetails={() => setEditingDetails(true)}
            onOpenLetters={() => setView("letters")}
            onOpenPlanning={() => setView("planning")}
            onOpenWishes={() => setView("wishes")}
            onOpenWill={() => setView("will")}
          />
        ) : null}
        {snapshot && view === "will" ? (
          <WillRecords
            will={snapshot.will}
            onAdd={() => setAddingVersion(true)}
            onEditDetails={() => setEditingDetails(true)}
            onReview={setReviewingId}
            onReviewDates={() => setReviewingDates(true)}
            onSetCurrent={(versionId) => {
              void wills.mutate({ operation: "SET_CURRENT_VERSION", versionId });
            }}
          />
        ) : null}
        {snapshot && view === "wishes" ? (
          <WishesPanel
            preferences={snapshot.wishes}
            onEdit={() => setEditingWishes(true)}
          />
        ) : null}
        {snapshot && view === "letters" ? (
          <LettersList
            letters={snapshot.letters.letters}
            onAdd={() => setEditingLetter("new")}
            onEdit={setEditingLetter}
          />
        ) : null}
        {snapshot && view === "planning" ? (
          <PreparationBoard
            busy={wills.busy}
            online={wills.online}
            will={snapshot.will}
            onSave={wills.mutate}
          />
        ) : null}
        <section className="wills-card wills-files-card">
          <header>
            <div>
              <p>Encrypted files</p>
              <h2>Safe Room documents</h2>
            </div>
            <button type="button" onClick={() => props.onScan("Safe Room")}>
              ＋ Scan
            </button>
          </header>
          <div>
            <ProgressiveRecordList
              initialCount={6}
              items={documents}
              noun="Safe Room documents"
              renderItem={(document) => (
                <button
                  type="button"
                  key={document.syncId}
                  onClick={() => setViewingId(document.syncId)}
                >
                  <span>{document.kind === "PDF" ? "PDF" : "DOC"}</span>
                  <div>
                    <strong>{document.title}</strong>
                    <small>{document.category} · {document.size}</small>
                  </div>
                  <b>›</b>
                </button>
              )}
            />
            {!documents.length ? (
              <p>No legal or estate-planning files have been stored here yet.</p>
            ) : null}
          </div>
        </section>
        {files.error ? <p className="wills-status">{files.error}</p> : null}
        <p className="wills-disclaimer">
          DiaryDock helps organise information. It does not create a will, verify
          legal validity, activate delivery after death or replace advice from a
          qualified solicitor.
        </p>
      </section>
      {snapshot ? (
        <WillDetailsEditor
          busy={wills.busy}
          online={wills.online}
          open={editingDetails}
          will={snapshot.will}
          onClose={() => setEditingDetails(false)}
          onSave={wills.mutate}
        />
      ) : null}
      {snapshot ? (
        <WishesEditor
          busy={wills.busy}
          online={wills.online}
          open={editingWishes}
          preferences={snapshot.wishes}
          onClose={() => setEditingWishes(false)}
          onSave={wills.mutate}
        />
      ) : null}
      <WillVersionEditor
        busy={wills.busy}
        documents={documents}
        online={wills.online}
        open={addingVersion}
        onClose={() => setAddingVersion(false)}
        onSave={wills.mutate}
      />
      <LetterEditor
        busy={wills.busy}
        documents={documents}
        letter={editingLetter === "new" ? null : editingLetter}
        online={wills.online}
        open={editingLetter !== null}
        onClose={() => setEditingLetter(null)}
        onRestore={(letterId, versionId, newVersionId, createdAt) => {
          return wills.mutate({
            operation: "RESTORE_LETTER_VERSION",
            letterId,
            versionId,
            newVersionId,
            createdAt,
          });
        }}
        onSave={wills.mutate}
      />
      {snapshot ? (
        <WillReviewEditor
          busy={wills.busy}
          online={wills.online}
          open={reviewingDates}
          will={snapshot.will}
          onClose={() => setReviewingDates(false)}
          onCreateReminder={reminders.createWithId}
          onSave={wills.mutate}
        />
      ) : null}
      <WillSummaryReview
        key={reviewing?.id ?? "none"}
        busy={wills.busy}
        online={wills.online}
        version={reviewing}
        onClose={() => setReviewingId(null)}
        onSave={wills.mutate}
      />
      {viewing ? (
        <DocumentViewer
          accessToken={props.accessToken}
          document={viewing}
          store={props.store}
          onClose={() => setViewingId(null)}
        />
      ) : null}
      <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
    </main>
  );
}
