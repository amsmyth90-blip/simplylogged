import { useMemo } from "react";

import { KITCHEN_SCHEMA_VERSION, type KitchenSnapshot } from "@diarydock/kitchen";

import { KitchenScreen } from "@mobile/kitchen/KitchenScreen";
import { PreviewStore } from "./MobilePreview";

const snapshot: KitchenSnapshot = {
  schemaVersion: KITCHEN_SCHEMA_VERSION,
  revision: "2026-09-02T08:30:00.000Z",
  items: [
    { id: "kitchen-1", name: "Oat milk", checked: false, section: "Shopping" },
    { id: "kitchen-2", name: "Pasta", checked: true, section: "Shopping" },
    { id: "kitchen-3", name: "Washing-up liquid", checked: false, section: "Shopping" },
    { id: "kitchen-4", name: "Tinned tomatoes", checked: true, section: "Pantry" },
    { id: "kitchen-5", name: "Basmati rice", checked: true, section: "Pantry" },
    { id: "kitchen-6", name: "Olive oil", checked: true, section: "Pantry" },
  ],
};

export function KitchenPreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return (
    <KitchenScreen
      accessToken="preview-access-token-that-is-never-sent"
      disableOnline
      initialSnapshot={snapshot}
      store={store}
      syncStatus="READY"
      onBack={() => undefined}
      onNavigate={() => undefined}
      onOpenMealPlanner={() => undefined}
      onOpenNoticeboard={() => undefined}
      onOpenRecipes={() => undefined}
    />
  );
}
