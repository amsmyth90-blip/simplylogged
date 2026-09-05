import { useMemo, useState } from "react";

import {
  belongsInGarden,
  gardenDocumentMatches,
  gardenReminderMatches,
  gardenSections,
  getGardenSection,
  type GardenSectionId,
} from "@diarydock/garden";
import type { OfflineStore } from "@diarydock/offline-store";
import type { EditableReminder } from "@diarydock/reminders";

import gardenImage from "../../../../public/images/pages/garden-hero.webp";
import {
  MobileBottomNav,
  type MobileDestination,
} from "@mobile/components/MobileBottomNav";
import { DocumentViewer } from "@mobile/files/DocumentViewer";
import { useDocuments } from "@mobile/files/use-documents";
import { GardenRecords } from "./GardenRecords";
import { GardenSectionPicker } from "./GardenSectionPicker";
import { ReminderEditor } from "@mobile/reminders/ReminderEditor";
import { useReminders } from "@mobile/reminders/use-reminders";

type Props = {
  accessToken: string;
  initialSection?: GardenSectionId;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onScan: (roomName: string) => void;
};

const reminderDefaults: Partial<EditableReminder> = {
  roomId: "garden",
  roomName: "Garden",
  group: "week",
  timeLabel: "This week",
  priority: "normal",
};

export function GardenScreen(props: Props) {
  const files = useDocuments(props.store, props.syncStatus, props.synchronize);
  const reminders = useReminders(
    props.store,
    props.syncStatus,
    props.synchronize,
  );
  const [sectionId, setSectionId] = useState<GardenSectionId>(
    props.initialSection ?? "jobs",
  );
  const [addingReminder, setAddingReminder] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const section = getGardenSection(sectionId);
  const gardenDocuments = useMemo(
    () =>
      files.documents.filter(
        (item) =>
          belongsInGarden(item) ||
          gardenSections.some((candidate) =>
            gardenDocumentMatches(item, candidate.id),
          ),
      ),
    [files.documents],
  );
  const gardenReminders = useMemo(
    () =>
      reminders.reminders.filter(
        (item) =>
          item.group !== "done" &&
          (belongsInGarden(item) ||
            gardenSections.some((candidate) =>
              gardenReminderMatches(item, candidate.id),
            )),
      ),
    [reminders.reminders],
  );
  const sectionDocuments = useMemo(
    () =>
      gardenDocuments.filter((item) => gardenDocumentMatches(item, sectionId)),
    [gardenDocuments, sectionId],
  );
  const sectionReminders = useMemo(
    () =>
      gardenReminders.filter((item) => gardenReminderMatches(item, sectionId)),
    [gardenReminders, sectionId],
  );
  const viewing =
    files.documents.find((item) => item.syncId === viewingId) ?? null;
  const reviewCount = gardenDocuments.filter(
    (item) => item.reviewStatus === "needs-review",
  ).length;

  return (
    <main className="garden-screen">
      <header className="garden-header">
        <button
          type="button"
          onClick={props.onBack}
          aria-label="Back to the estate map"
        >
          ‹
        </button>
        <div>
          <strong>Pets & Garden</strong>
          <small>Care, outdoor spaces & jobs</small>
        </div>
        <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>
          {props.syncStatus.toLowerCase().replaceAll("_", " ")}
        </span>
      </header>

      <section
        className="garden-hero"
        style={{ backgroundImage: `url(${gardenImage})` }}
      >
        <div />
        <article>
          <p>Your outdoor picture</p>
          <h1>Pets & Garden</h1>
          <span>
            Care records, seasonal jobs and everything outdoors, kept in one
            calm place.
          </span>
        </article>
      </section>

      <section className="garden-sheet">
        <section className="garden-summary" aria-label="Garden summary">
          <article>
            <strong>{gardenReminders.length}</strong>
            <small>active reminders</small>
          </article>
          <article>
            <strong>{gardenDocuments.length}</strong>
            <small>outdoor files</small>
          </article>
          <article>
            <strong>{reviewCount}</strong>
            <small>to review</small>
          </article>
          <button type="button" onClick={() => props.onScan("Garden")}>
            ＋ Scan into Garden
          </button>
        </section>
        <GardenSectionPicker selected={sectionId} onSelect={setSectionId} />
        <section className="garden-section-intro">
          <p>{section.scope.join(" · ")}</p>
          <h2>{section.title}</h2>
          <span>{section.description}</span>
        </section>
        <GardenRecords
          documents={sectionDocuments}
          reminders={sectionReminders}
          section={section}
          onAddReminder={() => setAddingReminder(true)}
          onOpenDocument={(item) => setViewingId(item.syncId)}
          onScan={() => props.onScan("Garden")}
          onToggleReminder={(item) => void reminders.toggle(item)}
        />
        {files.error || reminders.error ? (
          <p className="form-message form-error">
            {files.error ?? reminders.error}
          </p>
        ) : null}
      </section>

      <ReminderEditor
        defaults={reminderDefaults}
        open={addingReminder}
        reminder={null}
        onClose={() => setAddingReminder(false)}
        onSave={reminders.create}
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
