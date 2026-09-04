import { useMemo, useState } from "react";

import type { RoomProfile } from "@diarydock/home";
import type { OfflineStore } from "@diarydock/offline-store";

import atticImage from "../../../../public/images/pages/attic-hero.webp";
import bedroomImage from "../../../../public/images/pages/bedroom-hero.webp";
import drivewayImage from "../../../../public/images/pages/driveway-hero.webp";
import familyImage from "../../../../public/images/pages/family-room-hero.webp";
import garageImage from "../../../../public/images/pages/garage-hero.webp";
import gardenImage from "../../../../public/images/pages/garden-hero.webp";
import mailboxImage from "../../../../public/images/pages/mailbox-hero.webp";
import officeImage from "../../../../public/images/pages/office-hero.webp";
import safeRoomImage from "../../../../public/images/pages/safe-room-hero.webp";
import kitchenImage from "../../../../public/images/kitchen-command-centre.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { DocumentViewer } from "@mobile/files/DocumentViewer";
import { useDocuments } from "@mobile/files/use-documents";
import { useReminders } from "@mobile/reminders/use-reminders";

const roomImages: Record<string, string> = {
  attic: atticImage,
  bedroom: bedroomImage,
  driveway: drivewayImage,
  "family-room": familyImage,
  garage: garageImage,
  garden: gardenImage,
  kitchen: kitchenImage,
  mailbox: mailboxImage,
  office: officeImage,
  "safe-room": safeRoomImage,
};

type RoomScreenProps = {
  accessToken: string;
  profile: RoomProfile;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onOpenKitchen: () => void;
  onScan: (roomName: string) => void;
};

function belongsToRoom(roomId: string, roomName: string, item: { roomId?: string; roomName?: string }) {
  return item.roomId === roomId || item.roomName?.toLowerCase() === roomName.toLowerCase();
}

export function RoomScreen(props: RoomScreenProps) {
  const files = useDocuments(props.store, props.syncStatus, props.synchronize);
  const reminders = useReminders(props.store, props.syncStatus, props.synchronize);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const documents = useMemo(
    () => files.documents.filter((item) => belongsToRoom(props.profile.id, props.profile.name, item)),
    [files.documents, props.profile.id, props.profile.name],
  );
  const roomReminders = useMemo(
    () => reminders.reminders.filter((item) => belongsToRoom(props.profile.id, props.profile.name, item)),
    [props.profile.id, props.profile.name, reminders.reminders],
  );
  const viewing = documents.find((item) => item.syncId === viewingId) ?? null;
  const active = props.profile.id === "family-room" ? "FAMILY" : "HOME";

  return (
    <main className="room-screen">
      <header className="room-hero" style={{ backgroundImage: `url(${roomImages[props.profile.id]})` }}>
        <div className="room-hero-shade" />
        <button className="room-back" type="button" onClick={props.onBack} aria-label="Back to the estate map">‹</button>
        <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>
          {props.syncStatus.toLowerCase().replaceAll("_", " ")}
        </span>
        <div className="room-heading">
          <p>{props.profile.domain}</p>
          <h1>{props.profile.name}</h1>
          <strong>{props.profile.headline}</strong>
        </div>
      </header>

      <section className="room-sheet">
        <p className="room-description">{props.profile.description}</p>
        <div className="room-totals">
          <span><strong>{documents.length}</strong> documents</span>
          <span><strong>{roomReminders.filter((item) => item.group !== "done").length}</strong> open reminders</span>
        </div>
        <div className="room-belongs" aria-label={`What belongs in ${props.profile.name}`}>
          {props.profile.belongsHere.map((item) => <span key={item}>{item}</span>)}
        </div>
        <button className="room-scan" type="button" onClick={() => props.onScan(props.profile.name)}>
          <span>＋</span> Scan into {props.profile.name}
        </button>
      </section>

      {props.profile.id === "kitchen" ? (
        <section className="room-content-section room-feature-callout">
          <div className="room-section-heading">
            <div><p>Everyday kitchen</p><h2>Pantry & shopping</h2></div>
            <button type="button" onClick={props.onOpenKitchen}>Open</button>
          </div>
          <p className="room-empty">Keep the pantry and shopping list together, with an encrypted copy available offline.</p>
        </section>
      ) : null}

      <section className="room-content-section">
        <div className="room-section-heading"><div><p>Secure records</p><h2>Documents</h2></div><button type="button" onClick={() => props.onNavigate("FILES")}>All Files</button></div>
        {documents.length ? documents.slice(0, 6).map((document) => (
          <button className="room-document" type="button" key={document.syncId} onClick={() => setViewingId(document.syncId)}>
            <span>{document.kind === "PDF" ? "PDF" : "DOC"}</span>
            <div><strong>{document.title}</strong><small>{document.category} · {document.size}</small></div>
            <b aria-hidden="true">›</b>
          </button>
        )) : <p className="room-empty">No documents have been filed in this room yet.</p>}
      </section>

      <section className="room-content-section">
        <div className="room-section-heading"><div><p>Next steps</p><h2>Reminders</h2></div><button type="button" onClick={() => props.onNavigate("REMINDERS")}>See all</button></div>
        {roomReminders.length ? roomReminders.slice(0, 5).map((reminder) => (
          <label className="room-reminder" key={reminder.id}>
            <input type="checkbox" checked={reminder.group === "done"} onChange={() => void reminders.toggle(reminder)} />
            <span><strong>{reminder.title}</strong><small>{reminder.timeLabel}</small></span>
          </label>
        )) : <p className="room-empty">Nothing needs your attention here.</p>}
      </section>

      {files.error || reminders.error ? <p className="form-message form-error">{files.error ?? reminders.error}</p> : null}
      {viewing ? <DocumentViewer accessToken={props.accessToken} document={viewing} store={props.store} onClose={() => setViewingId(null)} /> : null}
      <MobileBottomNav active={active} onNavigate={props.onNavigate} />
    </main>
  );
}
