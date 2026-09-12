import { useCallback } from "react";
import { RecapsPanel } from "../../../../components/recaps/RecapsPanel";
import type { RecapPreferences, RecapResponse } from "../../../../lib/recaps/model";
import { appointmentRequest } from "../../../../lib/appointments/client";
import { getSecureRuntime } from "@mobile/platform/runtime-security";
import { getMobileSupabase } from "@mobile/auth/supabase-client";
import { enableAppointmentPush } from "@mobile/appointments/phone-notifications";
import type { MobileDestination } from "@mobile/components/MobileBottomNav";
export function RecapsScreen(props: { initialKind?: "daily" | "weekly"; accessToken: string; onNavigate: (destination: MobileDestination) => void; onAppointments: () => void }) {
  const request = useCallback(async (method: "GET" | "POST", body?: RecapPreferences) => {
    const result = await appointmentRequest({ accessToken: props.accessToken,
      apiOrigin: getSecureRuntime().apiOrigin, supabase: getMobileSupabase() },
      "/api/recaps?timeZone=" + encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone), body, method);
    return result as unknown as RecapResponse;
  }, [props.accessToken]);
  return <main style={{ padding: "max(18px, env(safe-area-inset-top)) 16px 32px", minHeight: "100svh", background: "#f4f7f3" }}>
    <button type="button" onClick={() => props.onNavigate("HOME")} style={{ marginBottom:16 }}>← Home</button>
    <RecapsPanel initialKind={props.initialKind} request={request} onOpen={(target) => target === "appointments" ? props.onAppointments() : props.onNavigate("REMINDERS")}
      enablePush={() => enableAppointmentPush({ accessToken: props.accessToken,
        apiOrigin: getSecureRuntime().apiOrigin, supabase: getMobileSupabase() })} />
  </main>;
}
