"use client";
import { useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { useDiaryDockData } from "../DiaryDockDataProvider";
import { AppointmentLetterDialog } from "./AppointmentLetterDialog";

export function WebAppointmentLetterButton() {
  const [open, setOpen] = useState(false);
  const data = useDiaryDockData();
  const supabase = getSupabaseBrowserClient();
  return <div className="mt-4">
    <button type="button" disabled={!supabase} onClick={() => setOpen(true)}
      className="rounded-xl bg-[#365b42] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">＋ Appointment from a letter</button>
    {open && supabase && <AppointmentLetterDialog connection={{ supabase, apiOrigin: window.location.origin }}
      onClose={() => setOpen(false)} onSaved={() => data.refreshHousehold(true)} />}
  </div>;
}
