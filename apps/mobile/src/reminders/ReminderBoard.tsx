import { useMemo, useState } from "react";

import type { EditableReminder, Reminder } from "@diarydock/reminders";
import type { OfflineStore } from "@diarydock/offline-store";

import { BrandMark } from "@mobile/components/BrandMark";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";

import { ReminderEditor } from "./ReminderEditor";
import { useReminders } from "./use-reminders";

type ReminderBoardProps = {
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<boolean>;
  onSignOut: () => Promise<void>;
  onNavigate: (destination: MobileDestination) => void;
};

function statusLabel(reminder: Reminder) {
  if (reminder.syncState === "CONFLICT") return "Needs review";
  if (reminder.syncState === "PENDING") return "Saved on this device";
  return reminder.origin === "SYSTEM_GENERATED" ? "DiaryDock reminder" : "Up to date";
}

function HighlightList({ items, empty }: { items: Reminder[]; empty: string }) {
  return items.length ? items.map((reminder) => (
    <article className="highlight-row" key={reminder.id}>
      <span className={`priority-dot priority-${reminder.priority}`} />
      <div>
        <h3>{reminder.title}</h3>
        <p>{reminder.timeLabel}{reminder.repeat ? ` · ${reminder.repeat}` : ""}</p>
      </div>
    </article>
  )) : <p className="section-empty">{empty}</p>;
}

export function ReminderBoard(props: ReminderBoardProps) {
  const reminders = useReminders(props.store, props.syncStatus, props.synchronize);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);

  const views = useMemo(() => {
    const active = reminders.reminders.filter((item) => item.group !== "done");
    return {
      focus: active.filter((item) => item.priority === "high").slice(0, 3),
      repeating: active.filter((item) => item.repeat).slice(0, 3),
      documents: active.filter((item) => item.documentId).slice(0, 4),
      today: active.filter((item) => item.group === "today").length,
      week: active.filter((item) => item.group === "week").length,
      later: active.filter((item) => item.group === "later").length,
    };
  }, [reminders.reminders]);
  const conflictsByRecord = useMemo(
    () => new Map(reminders.conflicts.map((conflict) => [conflict.recordId, conflict])),
    [reminders.conflicts],
  );

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(reminder: Reminder) {
    if (reminder.origin === "SYSTEM_GENERATED") return;
    setEditing(reminder);
    setEditorOpen(true);
  }

  async function save(draft: EditableReminder) {
    return editing ? reminders.update(editing, draft) : reminders.create(draft);
  }

  async function remove(reminder: Reminder) {
    if (!window.confirm(`Delete “${reminder.title}”?`)) return;
    await reminders.remove(reminder);
  }

  async function signOut() {
    setSigningOut(true);
    setAccountError(null);
    try {
      await props.onSignOut();
    } catch {
      setAccountError("DiaryDock could not complete sign out safely.");
      setSigningOut(false);
    }
  }

  async function resolveConflict(recordId: string, keepLocal: boolean) {
    const conflict = conflictsByRecord.get(recordId);
    if (!conflict) return;
    const message = keepLocal
      ? "Keep the version on this device and replace the synced version?"
      : "Use the synced version and discard this device’s unsynced changes?";
    if (!window.confirm(message)) return;
    await reminders.resolveConflict(conflict, keepLocal ? "KEEP_LOCAL" : "USE_SERVER");
  }

  return (
    <main className="app-screen">
      <header className="app-header">
        <div className="app-brand">
          <BrandMark />
          <div><strong>DiaryDock</strong><span>Your digital home</span></div>
        </div>
        <button type="button" className="quiet-button" disabled={signingOut} onClick={() => void signOut()}>
          {signingOut ? "Please wait…" : "Sign out"}
        </button>
      </header>

      <section className="reminder-hero">
        <p className="eyebrow">Reminders</p>
        <h1>What Matters, When It Matters</h1>
        <p>Gentle reminders to keep your life in order.</p>
        <div className="hero-actions">
          <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>
            {props.syncStatus.toLowerCase().replaceAll("_", " ")}
          </span>
          <button type="button" onClick={openCreate}>New reminder</button>
        </div>
      </section>

      <section className="highlight-grid">
        <article className="reminder-panel">
          <h2>Today’s focus</h2>
          <p>The next things to move forward</p>
          <HighlightList items={views.focus} empty="No high-priority reminders waiting." />
        </article>
        <article className="reminder-panel">
          <h2>Steady rhythms</h2>
          <p>Repeating jobs that keep DiaryDock current</p>
          <HighlightList items={views.repeating} empty="No repeating reminders yet." />
        </article>
      </section>

      <section className="document-panel reminder-panel">
        <h2>Document follow-ups</h2>
        <p>Renewals and dates linked to saved files</p>
        <HighlightList items={views.documents} empty="Linked document reminders will appear here." />
      </section>

      <section className="reminder-counts" aria-label="Reminder totals">
        {[{ label: "Today", value: views.today }, { label: "This week", value: views.week }, { label: "Later", value: views.later }]
          .map((item) => <article key={item.label}><strong>{item.value}</strong><span>{item.label}</span></article>)}
      </section>

      {reminders.error ? <p className="form-message form-error">{reminders.error}</p> : null}
      {accountError ? <p className="form-message form-error">{accountError}</p> : null}
      <section className="reminder-list" aria-live="polite" aria-label="All reminders">
        {reminders.reminders.length ? reminders.reminders.map((reminder) => (
          <article className={`reminder-row ${reminder.group === "done" ? "is-done" : ""}`} key={reminder.id}>
            <button
              className="completion-button"
              type="button"
              aria-label={reminder.group === "done" ? "Mark as not completed" : "Mark as completed"}
              onClick={() => void reminders.toggle(reminder)}
            >
              {reminder.group === "done" ? "✓" : ""}
            </button>
            <div className="reminder-copy">
              <h2>{reminder.title}</h2>
              <p>{reminder.timeLabel} · {statusLabel(reminder)}</p>
            </div>
            {reminder.origin === "USER_CREATED" ? (
              <div className="reminder-actions">
                <button type="button" onClick={() => openEdit(reminder)}>Edit</button>
                <button type="button" className="delete-button" onClick={() => void remove(reminder)}>Delete</button>
              </div>
            ) : null}
            {conflictsByRecord.has(reminder.id) ? (
              <div className="conflict-actions" role="group" aria-label={`Resolve ${reminder.title}`}>
                <p>This reminder changed here and on another device. Choose which version to keep.</p>
                <button type="button" onClick={() => void resolveConflict(reminder.id, true)}>
                  Keep this device
                </button>
                <button type="button" onClick={() => void resolveConflict(reminder.id, false)}>
                  Use synced version
                </button>
              </div>
            ) : null}
          </article>
        )) : (
          <div className="empty-reminders"><h2>Nothing waiting</h2><p>Add a reminder and it will remain available offline.</p></div>
        )}
      </section>

      <ReminderEditor
        open={editorOpen}
        reminder={editing}
        onClose={() => setEditorOpen(false)}
        onSave={save}
      />
      <MobileBottomNav active="REMINDERS" onNavigate={props.onNavigate} />
    </main>
  );
}
