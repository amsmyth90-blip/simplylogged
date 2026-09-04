import { useMemo, useState } from "react";

import {
  atticItemMatches,
  belongsInAttic,
  getAtticSection,
  type AtticSectionId,
  type AtticSnapshot,
  type FamilyStory,
} from "@diarydock/attic";
import type { OfflineStore } from "@diarydock/offline-store";
import type { EditableReminder } from "@diarydock/reminders";

import atticImage from "../../../../public/images/pages/attic-hero.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { DocumentViewer } from "@mobile/files/DocumentViewer";
import { useDocuments } from "@mobile/files/use-documents";
import { ReminderEditor } from "@mobile/reminders/ReminderEditor";
import { useReminders } from "@mobile/reminders/use-reminders";
import { AtticRecords } from "./AtticRecords";
import { AtticSectionPicker } from "./AtticSectionPicker";
import { FamilyStoryEditor } from "./FamilyStoryEditor";
import { useAttic } from "./use-attic";

type Props = {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: AtticSnapshot;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onScan: (roomName: string) => void;
};

const reminderDefaults: Partial<EditableReminder> = {
  roomId: "attic",
  roomName: "Attic",
  group: "week",
  timeLabel: "This week",
  priority: "normal",
};

export function AtticScreen(props: Props) {
  const attic = useAttic({
    accessToken: props.accessToken,
    disableOnline: props.disableOnline,
    initialSnapshot: props.initialSnapshot,
    store: props.store,
    syncStatus: props.syncStatus,
  });
  const files = useDocuments(props.store, props.syncStatus, props.synchronize);
  const reminders = useReminders(props.store, props.syncStatus, props.synchronize);
  const [sectionId, setSectionId] = useState<AtticSectionId>("family-history");
  const [addingReminder, setAddingReminder] = useState(false);
  const [addingStory, setAddingStory] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const section = getAtticSection(sectionId);
  const atticDocuments = useMemo(
    () => files.documents.filter(belongsInAttic),
    [files.documents],
  );
  const atticReminders = useMemo(
    () => reminders.reminders.filter((item) => item.group !== "done" && belongsInAttic(item)),
    [reminders.reminders],
  );
  const sectionDocuments = useMemo(
    () => atticDocuments.filter((item) => atticItemMatches(item, sectionId)),
    [atticDocuments, sectionId],
  );
  const sectionReminders = useMemo(
    () => atticReminders.filter((item) => atticItemMatches(item, sectionId)),
    [atticReminders, sectionId],
  );
  const imageDocuments = useMemo(
    () => atticDocuments.filter((item) => item.kind === "Image"),
    [atticDocuments],
  );
  const viewing = atticDocuments.find((item) => item.syncId === viewingId) ?? null;
  const stories = attic.snapshot?.stories ?? [];

  async function saveStory(story: FamilyStory) {
    return attic.mutate({ operation: "ADD_STORY", story });
  }

  return (
    <main className="attic-screen">
      <header className="attic-header">
        <button type="button" onClick={props.onBack} aria-label="Back to the estate map">‹</button>
        <div><strong>Attic</strong><small>Memories, stories & legacy</small></div>
        <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>{props.syncStatus.toLowerCase().replaceAll("_", " ")}</span>
      </header>

      <section className="attic-hero" style={{ backgroundImage: `url(${atticImage})` }}>
        <div />
        <article><p>Your family archive</p><h1>Attic</h1><span>Family memories, meaningful objects and the stories behind them — preserved with care.</span></article>
      </section>

      <section className="attic-sheet">
        <section className="attic-summary" aria-label="Attic summary">
          <article><strong>{attic.snapshot?.totalStoryCount ?? 0}</strong><small>family stories</small></article>
          <article><strong>{atticDocuments.length}</strong><small>archive files</small></article>
          <article><strong>{atticReminders.length}</strong><small>gentle prompts</small></article>
          <button type="button" onClick={() => props.onScan("Attic")}>＋ Scan into Attic</button>
        </section>
        <AtticSectionPicker selected={sectionId} onSelect={setSectionId} />
        <section className="attic-section-intro">
          <p>{section.scope.join(" · ")}</p><h2>{section.title}</h2><span>{section.description}</span>
        </section>
        {attic.message ? <p className="attic-status-message">{attic.message}</p> : null}
        {attic.loading && !attic.snapshot ? <p className="attic-status-message">Opening your encrypted family archive…</p> : null}
        <AtticRecords
          documents={sectionDocuments}
          reminders={sectionReminders}
          section={section}
          stories={stories}
          onAddReminder={() => setAddingReminder(true)}
          onAddStory={() => setAddingStory(true)}
          onOpenDocument={(item) => setViewingId(item.syncId)}
          onScan={() => props.onScan("Attic")}
          onToggleReminder={(item) => void reminders.toggle(item)}
        />
        {sectionId === "family-history" && attic.snapshot?.nextCursor ? (
          <button
            type="button"
            className="attic-load-more"
            disabled={attic.loadingMore}
            onClick={() => void attic.loadMore()}
          >
            {attic.loadingMore
              ? "Opening older stories…"
              : `Load older stories · ${stories.length} of ${attic.snapshot.totalStoryCount}`}
          </button>
        ) : null}
        {files.error || reminders.error ? <p className="form-message form-error">{files.error ?? reminders.error}</p> : null}
        <p className="attic-boundary-note">Attic is for memories and family story. Formal legal, health and financial records stay in their protected rooms.</p>
      </section>

      <ReminderEditor defaults={reminderDefaults} open={addingReminder} reminder={null} onClose={() => setAddingReminder(false)} onSave={reminders.create} />
      <FamilyStoryEditor busy={attic.busy} imageDocuments={imageDocuments} online={attic.online} open={addingStory} onClose={() => setAddingStory(false)} onSave={saveStory} />
      {viewing ? <DocumentViewer accessToken={props.accessToken} document={viewing} store={props.store} onClose={() => setViewingId(null)} /> : null}
      <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
    </main>
  );
}
