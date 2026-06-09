"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileText, TimerReset } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { getReminders, updateReminder } from "@/lib/supabase/reminders";
import type { StoredReminder } from "@/lib/storage";

const defaultMilestones: StoredReminder[] = [
  { id: "default-1", title: "Home Insurance Renewal", roomId: "family-room", roomName: "Family Room", dueDate: "2026-08-14", priority: "medium", linkedDocumentId: "", completed: false },
  { id: "default-2", title: "MOT Due", roomId: "garage", roomName: "Garage", dueDate: "2026-10-18", priority: "high", linkedDocumentId: "", completed: false },
  { id: "default-3", title: "Boiler Service", roomId: "family-room", roomName: "Family Room", dueDate: "2027-01-10", priority: "medium", linkedDocumentId: "", completed: false },
  { id: "default-4", title: "Passport Expiry", roomId: "bedroom", roomName: "Bedroom", dueDate: "2031-02-14", priority: "low", linkedDocumentId: "", completed: false },
];

export default function RemindersPage() {
  const [reminders, setReminders] = useState<StoredReminder[]>([]);

  useEffect(() => {
    async function refresh() {
      setReminders(await getReminders());
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("simplyLoggedStorage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("simplyLoggedStorage", refresh);
    };
  }, []);

  const milestones = reminders.length ? reminders : defaultMilestones;

  const grouped = useMemo(() => {
    const today = startOfDay(new Date());
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 45);
    return {
      overdue: milestones.filter((item) => !item.completed && item.dueDate && startOfDay(new Date(`${item.dueDate}T00:00:00`)) < today),
      soon: milestones.filter((item) => !item.completed && item.dueDate && startOfDay(new Date(`${item.dueDate}T00:00:00`)) >= today && startOfDay(new Date(`${item.dueDate}T00:00:00`)) <= soon),
      future: milestones.filter((item) => !item.completed && (!item.dueDate || startOfDay(new Date(`${item.dueDate}T00:00:00`)) > soon)),
    };
  }, [milestones]);

  async function completeReminder(reminder: StoredReminder) {
    if (reminder.id.startsWith("default-")) return;
    await updateReminder({ ...reminder, completed: true });
    setReminders(await getReminders());
  }

  async function snoozeReminder(reminder: StoredReminder) {
    if (reminder.id.startsWith("default-")) return;
    const nextDate = new Date(`${reminder.dueDate || new Date().toISOString().slice(0, 10)}T00:00:00`);
    nextDate.setDate(nextDate.getDate() + 7);
    await updateReminder({ ...reminder, dueDate: nextDate.toISOString().slice(0, 10), completed: false });
    setReminders(await getReminders());
  }

  return (
    <main className="min-h-svh bg-[#f5efe6] pb-28 text-[#261c14]">
      <section className="relative min-h-[21rem] overflow-hidden rounded-b-[2rem] bg-[radial-gradient(circle_at_50%_22%,rgba(190,242,100,0.14),transparent_18%),linear-gradient(135deg,#162015,#354528_48%,#11100b)] px-5 pb-20 pt-5 text-white shadow-2xl shadow-stone-400/40">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.64))]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute bottom-6 left-1/2 h-56 w-20 -translate-x-1/2 rounded-t-full bg-white/12 blur-sm" />
        <div className="relative z-10">
          <p className="text-sm font-semibold text-white/82">Your important dates</p>
          <h1 className="mt-2 text-4xl font-bold">Reminders</h1>
        </div>
      </section>

      <div className="relative z-20 mx-auto -mt-12 max-w-md px-4">
        <section className="rounded-[1.35rem] bg-white p-4 shadow-xl shadow-stone-300/50">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Overdue" value={String(grouped.overdue.length)} tone="red" />
            <Stat label="Due Soon" value={String(grouped.soon.length)} tone="amber" />
            <Stat label="Future" value={String(grouped.future.length)} tone="green" />
          </div>
        </section>

        <ReminderGroup title="Overdue" reminders={grouped.overdue} tone="red" onComplete={completeReminder} onSnooze={snoozeReminder} />
        <ReminderGroup title="Due Soon" reminders={grouped.soon} tone="amber" onComplete={completeReminder} onSnooze={snoozeReminder} />
        <ReminderGroup title="Future" reminders={grouped.future} tone="green" onComplete={completeReminder} onSnooze={snoozeReminder} />
      </div>
      <BottomNav />
    </main>
  );
}

function ReminderGroup({
  title,
  reminders,
  tone,
  onComplete,
  onSnooze,
}: {
  title: string;
  reminders: StoredReminder[];
  tone: "red" | "amber" | "green";
  onComplete: (reminder: StoredReminder) => void;
  onSnooze: (reminder: StoredReminder) => void;
}) {
  return (
    <section className="mt-5">
      <h2 className={`text-sm font-bold uppercase tracking-[0.12em] ${tone === "red" ? "text-rose-600" : tone === "amber" ? "text-amber-700" : "text-emerald-700"}`}>{title}</h2>
      <div className="mt-3 space-y-3">
        {reminders.length ? reminders.map((reminder) => (
          <article key={reminder.id} className="rounded-[1.35rem] bg-white p-4 shadow-sm shadow-stone-200">
            <div className="flex items-center gap-3">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${toneClass(tone)}`}>
                <Clock3 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold">{reminder.title}</h3>
                <p className="text-sm text-stone-500">{reminder.roomName} · {formatDate(reminder.dueDate)}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={() => onComplete(reminder)} className="min-h-11 rounded-xl bg-[#fbf7ef] text-sm font-bold">
                <CheckCircle2 className="mx-auto h-5 w-5" />
              </button>
              <button onClick={() => onSnooze(reminder)} className="min-h-11 rounded-xl bg-[#fbf7ef] text-sm font-bold">
                <TimerReset className="mx-auto h-5 w-5" />
              </button>
              <Link href={reminder.roomId === "vault" ? "/vault" : `/room/${reminder.roomId}`} className="grid min-h-11 place-items-center rounded-xl bg-[#fbf7ef]">
                <FileText className="h-5 w-5" />
              </Link>
            </div>
          </article>
        )) : <p className="rounded-[1.2rem] bg-white p-4 text-sm font-semibold text-stone-500 shadow-sm shadow-stone-200">Nothing here.</p>}
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "red" | "amber" | "green" }) {
  return (
    <div className="rounded-2xl bg-[#fbf7ef] p-3">
      <p className={`text-2xl font-bold ${tone === "red" ? "text-rose-600" : tone === "amber" ? "text-amber-700" : "text-emerald-700"}`}>{value}</p>
      <p className="text-sm font-bold text-stone-500">{label}</p>
    </div>
  );
}

function toneClass(tone: "red" | "amber" | "green") {
  if (tone === "red") return "bg-rose-100 text-rose-700";
  if (tone === "amber") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(value: string) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
