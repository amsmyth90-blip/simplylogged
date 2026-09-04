import { useState } from "react";

import { DocumentService, type DocumentSummary } from "@diarydock/documents";
import type { GuardianFinding } from "@diarydock/guardian";
import type { OfflineStore } from "@diarydock/offline-store";

import { BrandMark } from "@mobile/components/BrandMark";
import type { MobileDestination } from "@mobile/components/MobileBottomNav";
import { DocumentViewer } from "@mobile/files/DocumentViewer";

import { GuardianFindingCard } from "./GuardianFindingCard";
import { useGuardian } from "./use-guardian";

export function GuardianScreen(props: {
  accessToken: string;
  disableOnline?: boolean;
  store: OfflineStore;
  syncStatus: string;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
}) {
  const guardian = useGuardian(props);
  const [viewer, setViewer] = useState<DocumentSummary | null>(null);

  async function openSource(finding: GuardianFinding) {
    if (finding.resourceType === "document") {
      const id = finding.resourceId.startsWith("document:")
        ? finding.resourceId.slice("document:".length)
        : finding.resourceId;
      const document = (await new DocumentService(props.store).list())
        .find((item) => item.id === id || item.syncId === id);
      if (document) { setViewer(document); return; }
    }
    props.onNavigate("REMINDERS");
  }

  const heading = guardian.findings.length
    ? `${guardian.findings.length} ${guardian.findings.length === 1 ? "thing needs" : "things need"} your attention`
    : "Everything looks settled";
  return (
    <main className="guardian-screen">
      <header className="guardian-header">
        <button type="button" onClick={props.onBack} aria-label="Back">‹</button>
        <div><BrandMark /><span><strong>Guardian</strong><small>A calm, private check-in</small></span></div>
        <span className={guardian.online ? "guardian-online" : "guardian-offline"}>{guardian.online ? "Live" : "Offline"}</span>
      </header>
      <section className="guardian-hero">
        <span className="guardian-shield">♢</span>
        <div><p>Your briefing</p><h1>{guardian.loading ? "Checking your saved dates…" : heading}</h1></div>
      </section>
      {guardian.error ? <p className="guardian-message" role="status">{guardian.error}</p> : null}
      {!guardian.loading && !guardian.findings.length ? (
        <section className="guardian-clear"><span>✓</span><h2>No action needed</h2><p>There is nothing recorded for the next 90 days. Guardian will check again when you return.</p></section>
      ) : null}
      <section className="guardian-grid" aria-live="polite" aria-busy={guardian.loading}>
        {guardian.findings.map((finding) => (
          <GuardianFindingCard
            finding={finding}
            key={finding.id}
            online={guardian.online}
            onOpen={() => void openSource(finding)}
            onDecide={(decision) => void guardian.decide(finding, decision)}
          />
        ))}
      </section>
      <footer className="guardian-footer">Guardian checks only dates already saved in DiaryDock. It does not make decisions or contact anyone.</footer>
      {viewer ? <DocumentViewer accessToken={props.accessToken} document={viewer} store={props.store} onClose={() => setViewer(null)} /> : null}
    </main>
  );
}
