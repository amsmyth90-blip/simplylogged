import { useMemo } from "react";

import { ReminderBoard } from "@mobile/reminders/ReminderBoard";
import { PreviewStore } from "./PreviewStore";

export { PreviewStore } from "./PreviewStore";

export function MobilePreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return (
    <ReminderBoard
      store={store}
      syncStatus="READY"
      synchronize={async () => true}
      onSignOut={async () => undefined}
      onNavigate={() => undefined}
    />
  );
}
