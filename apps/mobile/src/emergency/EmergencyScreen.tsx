import { useState } from "react";

import type { DocumentSummary } from "@diarydock/documents";
import type { EmergencySnapshot } from "@diarydock/emergency";
import type { OfflineStore } from "@diarydock/offline-store";

import { BrandMark } from "@mobile/components/BrandMark";
import { DocumentViewer } from "@mobile/files/DocumentViewer";
import { EmergencyEditor, type EmergencyEditorMode } from "./EmergencyEditor";
import {
  EmergencyContacts,
  EmergencyDocuments,
  EmergencyHome,
  EmergencyPlans,
} from "./EmergencySections";
import { useEmergency } from "./use-emergency";

export function EmergencyScreen(props: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: EmergencySnapshot;
  store: OfflineStore;
  syncStatus: string;
  onBack: () => void;
  onTrustedAccess: () => void;
}) {
  const model = useEmergency(props);
  const [editor, setEditor] = useState<EmergencyEditorMode | null>(null);
  const [viewer, setViewer] = useState<DocumentSummary | null>(null);
  const snapshot = model.snapshot;
  return (
    <main className="emergency-screen">
      <header className="emergency-header">
        <button type="button" onClick={props.onBack} aria-label="Back">‹</button>
        <div><BrandMark /><span><strong>Emergency</strong><small>Private owner view</small></span></div>
        <span className={model.source === "NETWORK" ? "emergency-live" : "emergency-cached"}>{model.source === "NETWORK" ? "Live" : "Offline"}</span>
      </header>
      <section className="emergency-hero">
        <p className="emergency-kicker">When it matters most</p>
        <h1>Everything important, close at hand.</h1>
        <p>Contacts, household plans, key home details and approved documents remain available from this encrypted device.</p>
        <div><span><strong>{snapshot?.contacts.length ?? 0}</strong> contacts</span><span><strong>{snapshot?.plans.length ?? 0}</strong> plans</span><span><strong>{model.documents.length}</strong> documents</span></div>
      </section>
      <section className="emergency-actions" aria-label="Add Emergency information">
        <button type="button" disabled={!model.online || !snapshot} onClick={() => setEditor("CONTACT")}><span>＋</span>Add contact</button>
        <button type="button" disabled={!model.online || !snapshot} onClick={() => setEditor("PLAN")}><span>＋</span>Add plan</button>
        <button type="button" disabled={!model.online || !snapshot} onClick={() => setEditor("HOME")}><span>＋</span>Add home note</button>
      </section>
      {model.message ? <p className="emergency-message" role="status">{model.message}</p> : null}
      {model.loading && !snapshot ? <p className="emergency-message">Opening your Emergency information securely…</p> : null}
      {snapshot ? <div className="emergency-content" aria-live="polite">
        <EmergencyContacts contacts={snapshot.contacts} careContacts={snapshot.careContacts} />
        <EmergencyPlans plans={snapshot.plans} />
        <EmergencyHome entries={snapshot.homeInfo} />
        <EmergencyDocuments documents={model.documents} onOpen={setViewer} />
      </div> : null}
      {!model.loading && !snapshot ? <section className="emergency-unavailable"><h2>Emergency is not available yet</h2><p>{model.message ?? "Connect and try again."}</p><button type="button" onClick={() => void model.refresh()}>Try again</button></section> : null}
      <button type="button" className="emergency-trusted" onClick={props.onTrustedAccess}><span>♢</span><div><strong>Manage trusted emergency access</strong><small>Choose a person and share only specific approved items.</small></div><b>›</b></button>
      <footer className="emergency-footer"><span>⌾</span><p><strong>Encrypted on this device</strong><br />Only information you approve appears here. In a life-threatening emergency, contact the appropriate emergency service.</p></footer>
      {editor ? <EmergencyEditor busy={model.busy} mode={editor} onCancel={() => setEditor(null)} onSave={model.mutate} /> : null}
      {viewer ? <DocumentViewer accessToken={props.accessToken} document={viewer} store={props.store} onClose={() => setViewer(null)} /> : null}
    </main>
  );
}
