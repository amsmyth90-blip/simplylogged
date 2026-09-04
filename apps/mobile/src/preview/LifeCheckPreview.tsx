import { LIFE_CHECK_SCHEMA_VERSION } from "@diarydock/life-check";

import { LifeCheckScreen } from "@mobile/life-check/LifeCheckScreen";
import { PreviewStore } from "@mobile/preview/PreviewStore";

const store = new PreviewStore([]);

export function LifeCheckPreview() {
  return <LifeCheckScreen accessToken="preview-token-not-used-123456" disableOnline store={store}
    syncStatus="READY" onBack={() => undefined} onNavigate={() => undefined}
    onOpenTarget={() => undefined} initialSnapshot={{ schemaVersion: LIFE_CHECK_SCHEMA_VERSION,
      revision: "2026-09-04T10:00:00.000Z", answers: { homeTenure: "own", vehicles: "yes",
        pets: "no", internationalTravel: "yes", householdCollaboration: "yes",
        documentStorage: "yes", reminders: "yes", completedAt: "2026-09-01T12:00:00.000Z" },
      score: 72, answered: 7, totalAnswers: 7, categories: [
        { id: "essentials", label: "Essentials", score: 67, completed: 2, total: 3 },
        { id: "home", label: "Home & money", score: 67, completed: 2, total: 3 },
        { id: "documents", label: "Documents", score: 50, completed: 1, total: 2 },
        { id: "reminders", label: "Reminders", score: 100, completed: 2, total: 2 },
      ], recommendations: [
        { id: "document-review", title: "Review captured details",
          detail: "Check any captured details before relying on them.", target: "MAILBOX" },
        { id: "home-cover", title: "Record your home cover",
          detail: "Save an active home insurance policy.", target: "OFFICE" },
      ] }} />;
}
