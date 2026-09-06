import { useMemo } from "react";

import type { MailboxSnapshot } from "@diarydock/mailbox";

import { MailboxScreen } from "@mobile/mailbox/MailboxScreen";
import { PreviewStore } from "@mobile/preview/PreviewStore";

const snapshot: MailboxSnapshot = {
  schemaVersion: 1,
  revision: "2026-09-04T10:00:00.000Z",
  items: [
    { id: "7ec0c301-c5bb-43d1-9e67-7140aaf52211", title: "Home insurance renewal",
      source: "Aviva", kind: "Letter", suggestedRoom: "Office", routeStatus: "new",
      documentId: "doc-insurance", receivedAt: "2026-09-04T08:00:00.000Z",
      updatedAt: "2026-09-04T10:00:00.000Z" },
    { id: "2c14d75e-7e8a-44b8-a078-ad7de74cb221", title: "School consent form",
      source: "St Mary’s Primary", kind: "Form", suggestedRoom: "Family Room",
      routeStatus: "new", documentId: "doc-school",
      receivedAt: "2026-09-03T08:00:00.000Z", updatedAt: "2026-09-03T10:00:00.000Z" },
    { id: "612291a1-639f-4899-8982-3a62dbed1177", title: "Energy statement",
      source: "Octopus Energy", kind: "Statement", suggestedRoom: "Office",
      routeStatus: "vault", documentId: "doc-energy",
      receivedAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-02T10:00:00.000Z" },
  ],
};

export function MailboxPreview() {
  const store = useMemo(() => new PreviewStore(), []);
  const initialFilter = new URLSearchParams(window.location.search).get("filter") === "all"
    ? "all" : "new";
  return <MailboxScreen accessToken="preview-access-token-that-is-long-enough" disableOnline
    initialSnapshot={snapshot} initialFilter={initialFilter} store={store} syncStatus="READY" synchronize={async () => true}
    onBack={() => undefined} onNavigate={() => undefined} onScan={() => undefined} />;
}
