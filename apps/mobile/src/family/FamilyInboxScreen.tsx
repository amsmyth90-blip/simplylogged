import type { OfflineStore } from "@diarydock/offline-store";

import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { MobileIcon } from "@mobile/components/MobileIcon";
import { FamilyRecords } from "./FamilyRecords";

export function FamilyInboxScreen(props: {
  accessToken: string;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onScan: () => void;
}) {
  return <main className="family-screen family-inbox-screen"><header className="family-inbox-header">
    <button type="button" onClick={props.onBack} aria-label="Back to Family Room">
      <MobileIcon name="arrow-left" /></button><div><small>Family Room</small><h1>Family inbox</h1></div>
  </header><section className="family-card family-inbox-intro"><span><MobileIcon name="check" /></span>
    <div><h2>Shared household items</h2><p>Forms, family reminders and secure shortcuts collect here.
      Original documents remain in their proper DiaryDock room.</p></div></section>
    <FamilyRecords accessToken={props.accessToken} store={props.store} syncStatus={props.syncStatus}
      synchronize={props.synchronize} onScan={props.onScan}
      onAllFiles={() => props.onNavigate("FILES")}
      onAllReminders={() => props.onNavigate("REMINDERS")} />
    <MobileBottomNav active="FAMILY" onNavigate={props.onNavigate} />
  </main>;
}
