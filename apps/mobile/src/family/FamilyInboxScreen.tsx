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
      <MobileIcon name="arrow-left" /></button><div><h1>Files</h1></div>
  </header>
    <FamilyRecords accessToken={props.accessToken} store={props.store} syncStatus={props.syncStatus}
      synchronize={props.synchronize} onScan={props.onScan}
      onAllFiles={() => props.onNavigate("FILES")}
      onAllReminders={() => props.onNavigate("REMINDERS")} />
    <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
  </main>;
}
