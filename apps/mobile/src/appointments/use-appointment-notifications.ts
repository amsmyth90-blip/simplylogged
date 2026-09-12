import { useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { getMobileSupabase } from "@mobile/auth/supabase-client";
import { getSecureRuntime } from "@mobile/platform/runtime-security";
import { enableAppointmentPush, disableAppointmentPush } from "./phone-notifications";

export function useAppointmentNotifications(accessToken: string, onOpen: () => void) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handles: PluginListenerHandle[] = [];
    let disposed = false;
    const add = async (promise: Promise<PluginListenerHandle>) => {
      const handle = await promise;
      if (disposed) await handle.remove(); else handles.push(handle);
    };
    void Promise.all([
      add(PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        if (action.notification.data?.route === "appointments") onOpen();
      })),
      add(LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
        if (action.notification.extra?.route === "appointments") onOpen();
      })),
      enableAppointmentPush({ accessToken, apiOrigin: getSecureRuntime().apiOrigin, supabase: getMobileSupabase() }, false),
    ]).catch(() => undefined);
    return () => { disposed = true; void Promise.all(handles.map((handle) => handle.remove())); };
  }, [accessToken, onOpen]);
}

export async function disconnectAppointmentNotifications(accessToken: string) {
  await disableAppointmentPush({ accessToken, apiOrigin: getSecureRuntime().apiOrigin, supabase: getMobileSupabase() });
}
