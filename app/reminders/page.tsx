"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Clock3, FileText, TimerReset } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { getReminders, updateReminder } from "@/lib/supabase/reminders";
import type { StoredReminder } from "@/lib/storage";

const defaultMilestones = [
  { title: "Home Insurance Renewal", roomName: "Family Room", dueDate: "2026-08-14", priority: "medium" as const },
  { title: "MOT Due", roomName: "Garage", dueDate: "2026-10-18", priority: "high" as const },
  { title: "Boiler Service", roomName: "Family Room", dueDate: "2027-01-10", priority: "medium" as const },
  { title: "Passport Expiry", roomName: "Bedroom", dueDate: "2031-02-14", priority: "low" as const },
  { title: "Travel Insurance Renewal", roomName: "Driveway", dueDate: "2026-08-16", priority: "medium" as const },
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

  const milestones = reminders.length ? reminders : defaultMilestones.map((item, index) => ({
    id: `default-${index}`,
    title: item.title,
    roomId: "vault",
    roomName: item.roomName,
    dueDate: item.dueDate,
    priority: item.priority,
    linkedDocumentId: "",
    completed: false,
  }));

  const counts = useMemo(() => {
    const today = startOfDay(new Date());
    return {
      overdue: milestones.filter((item) => !item.completed && item.dueDate && startOfDay(new Date(`${item.dueDate}T00:00:00`)) < today).length,
      complete: milestones.filter((item) => item.completed).length,
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
    <main className="min-h-svh overflow-hidden bg-[#0d1117] px-4 pb-28 pt-5 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.22),transparent_32%),linear-gradient(180deg,#172033,#0b0f16)]" />
      <div className="relative mx-auto max-w-md">
        <header>
          <p className="text-sm font-bold text-amber-200">Estate Timeline</p>
          <h1 className="text-3xl font-bold">Reminders</h1>
        </header>

        <section className="mt-5 rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/25 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Readiness</p>
              <h2 className="mt-2 text-4xl font-bold">{Math.max(28, 92 - counts.overdue * 12)}%</h2>
            </div>
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[conic-gradient(from_180deg,#34d399,#fbbf24,#fb7185,#34d399)] p-1">
              <div className="grid h-full w-full place-items-center rounded-full bg-slate-950">
                <Bell className="h-8 w-8 text-amber-200" />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Overdue" value={String(counts.overdue)} tone="red" />
            <MiniStat label="Open" value={String(milestones.length - counts.complete)} tone="amber" />
            <MiniStat label="Done" value={String(counts.complete)} tone="green" />
          </div>
        </section>

        <section className="relative mt-6 space-y-4 pl-6">
          <div className="absolute bottom-8 left-[1.18rem] top-2 w-px bg-gradient-to-b from-amber-200 via-white/20 to-transparent" />
          {milestones.map((reminder) => (
            <TimelineMilestone
              key={reminder.id}
              reminder={reminder}
              onComplete={completeReminder}
              onSnooze={snoozeReminder}
            />
          ))}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function TimelineMilestone({
  reminder,
  onComplete,
  onSnooze,
}: {
  reminder: StoredReminder;
  onComplete: (reminder: StoredReminder) => void;
  onSnooze: (reminder: StoredReminder) => void;
}) {
  const tone = reminder.completed ? "green" : getTone(reminder.dueDate);
  const dot = tone === "red" ? "bg-rose-500" : tone === "amber" ? "bg-amber-400" : "bg-emerald-400";

  return (
    <article className="relative rounded-[1.5rem] border border-white/14 bg-white/10 p-4 backdrop-blur-2xl">
      <span className={`absolute -left-[1.57rem] top-5 h-4 w-4 rounded-full border-2 border-slate-950 ${dot}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">{reminder.title}</h2>
          <p className="mt-1 text-xs text-white/55">
            {reminder.roomName} · {formatDate(reminder.dueDate)}
          </p>
        </div>
        <Clock3 className={`h-5 w-5 ${tone === "red" ? "text-rose-300" : tone === "amber" ? "text-amber-200" : "text-emerald-300"}`} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={() => onComplete(reminder)} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-zinc-950">
          <CheckCircle2 className="mx-auto h-4 w-4" />
        </button>
        <button onClick={() => onSnooze(reminder)} className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white">
          <TimerReset className="mx-auto h-4 w-4" />
        </button>
        <Link href={reminder.roomId === "vault" ? "/vault" : `/room/${reminder.roomId}`} className="rounded-full bg-white/10 px-3 py-2 text-center text-xs font-bold text-white">
          <FileText className="mx-auto h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "red" | "amber" | "green" }) {
  const color = tone === "red" ? "text-rose-300" : tone === "amber" ? "text-amber-200" : "text-emerald-300";
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">{label}</p>
    </div>
  );
}

function getTone(value: string) {
  if (!value) return "green";
  const today = startOfDay(new Date());
  const dueDate = startOfDay(new Date(`${value}T00:00:00`));
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 30);
  if (dueDate < today) return "red";
  if (dueDate <= soon) return "amber";
  return "green";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(value: string) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
