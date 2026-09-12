import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { AppointmentLetterDialog } from "../../../../components/appointments/AppointmentLetterDialog";
import { getMobileSupabase } from "@mobile/auth/supabase-client";
import { getSecureRuntime } from "@mobile/platform/runtime-security";
import { addPhoneAppointment } from "./phone-calendar";
import { enableAppointmentPush, schedulePhoneAppointment } from "./phone-notifications";

export function AppointmentLetterButton({ accessToken, onSaved, disabled }: {
  accessToken: string; onSaved: () => Promise<unknown>; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [enabling, setEnabling] = useState(false);
  const connection = { accessToken, apiOrigin: getSecureRuntime().apiOrigin, supabase: getMobileSupabase() };
  const native = Capacitor.isNativePlatform();
  return <>
    <button type="button" className="health-add-record" disabled={disabled} onClick={() => setOpen(true)}>＋ Appointment from a letter</button>
    {native && <button type="button" className="health-add-record" disabled={disabled || enabling} onClick={() => {
      setEnabling(true);
      void enableAppointmentPush(connection).then((enabled) => setMessage(enabled
        ? "This phone can receive appointment alerts, including appointments added on the website."
        : "Remote alerts are unavailable. Appointments added on this phone can still use device reminders."))
        .catch(() => setMessage("Phone alerts could not be connected. Check your connection and notification permission."))
        .finally(() => setEnabling(false));
    }}>{enabling ? "Connecting…" : "Enable appointment phone alerts"}</button>}
    {message && <p role="status" className="health-status">{message}</p>}
    {open && <AppointmentLetterDialog connection={connection} native={native} onClose={() => setOpen(false)} onSaved={onSaved}
      prepareNotifications={() => enableAppointmentPush(connection)} addToCalendar={addPhoneAppointment}
      notifyLocally={native ? schedulePhoneAppointment : undefined} />}
  </>;
}
