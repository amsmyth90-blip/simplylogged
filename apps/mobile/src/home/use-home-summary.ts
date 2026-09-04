import { useEffect, useMemo, useState } from "react";

import { ReminderService } from "@diarydock/reminders";
import type { OfflineStore } from "@diarydock/offline-store";

export function useHomeSummary(store: OfflineStore, syncStatus: string) {
  const service = useMemo(() => new ReminderService(store), [store]);
  const [reminderCount, setReminderCount] = useState(0);

  useEffect(() => {
    let active = true;
    void service.list().then((reminders) => {
      if (active) {
        setReminderCount(reminders.filter((item) => item.group === "today").length);
      }
    }).catch(() => {
      if (active) setReminderCount(0);
    });
    return () => { active = false; };
  }, [service, syncStatus]);

  return { reminderCount };
}
