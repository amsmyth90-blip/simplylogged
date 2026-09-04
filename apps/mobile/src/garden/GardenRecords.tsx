import type { DocumentSummary } from "@diarydock/documents";
import type { GardenSection } from "@diarydock/garden";
import type { Reminder } from "@diarydock/reminders";

import { ProgressiveRecordList } from "@mobile/components/ProgressiveRecordList";

type Props = {
  documents: DocumentSummary[];
  reminders: Reminder[];
  section: GardenSection;
  onAddReminder: () => void;
  onOpenDocument: (document: DocumentSummary) => void;
  onScan: () => void;
  onToggleReminder: (reminder: Reminder) => void;
};

export function GardenRecords(props: Props) {
  return (
    <div className="garden-record-columns">
      <section className="garden-card">
        <header>
          <div>
            <p>Things to do</p>
            <h2>{props.section.title}</h2>
          </div>
          <button type="button" onClick={props.onAddReminder}>
            ＋ Add
          </button>
        </header>
        <div className="garden-reminder-list">
          <ProgressiveRecordList
            key={`reminders-${props.section.id}`}
            initialCount={8}
            items={props.reminders}
            noun="reminders"
            renderItem={(reminder) => (
            <label key={reminder.id}>
              <input
                type="checkbox"
                checked={reminder.group === "done"}
                onChange={() => props.onToggleReminder(reminder)}
              />
              <span>
                <strong>{reminder.title}</strong>
                <small>
                  {[reminder.timeLabel, reminder.repeat, reminder.note]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </span>
            </label>
            )}
          />
          {!props.reminders.length ? (
            <div className="garden-empty">
              <span>✓</span>
              <strong>Nothing waiting here</strong>
              <p>{props.section.description}</p>
              <button type="button" onClick={props.onAddReminder}>
                Add first reminder
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="garden-card">
        <header>
          <div>
            <p>Secure records</p>
            <h2>Files & photos</h2>
          </div>
          <button type="button" onClick={props.onScan}>
            ＋ Scan
          </button>
        </header>
        <div className="garden-document-list">
          <ProgressiveRecordList
            key={`documents-${props.section.id}`}
            initialCount={8}
            items={props.documents}
            noun="files"
            renderItem={(document) => (
            <button
              type="button"
              onClick={() => props.onOpenDocument(document)}
              key={document.syncId}
            >
              <span
                className={
                  document.reviewStatus === "needs-review" ? "needs-review" : ""
                }
              >
                {document.kind === "Image"
                  ? "IMG"
                  : document.kind === "PDF"
                    ? "PDF"
                    : "DOC"}
              </span>
              <div>
                <strong>{document.title}</strong>
                <small>
                  {document.category} · {document.size}
                </small>
              </div>
              <b aria-hidden="true">›</b>
            </button>
            )}
          />
          {!props.documents.length ? (
            <div className="garden-empty">
              <span>▱</span>
              <strong>No files linked yet</strong>
              <p>
                Scan a document or photo into the Garden when you have something
                real to keep.
              </p>
              <button type="button" onClick={props.onScan}>
                Scan into Garden
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
