"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarCheck, CheckCircle2, Clock3 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { getReminders, updateReminder } from "@/lib/supabase/reminders";
import type { StoredReminder } from "@/lib/storage";

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

  const grouped = useMemo(() => {
    const today = startOfDay(new Date());
    return {
      overdue: reminders.filter(
        (reminder) =>
          !reminder.completed &&
          reminder.dueDate &&
          startOfDay(new Date(`${reminder.dueDate}T00:00:00`)) < today,
      ),
      upcoming: reminders.filter(
        (reminder) =>
          !reminder.completed &&
          (!reminder.dueDate ||
            startOfDay(new Date(`${reminder.dueDate}T00:00:00`)) >= today),
      ),
      completed: reminders.filter((reminder) => reminder.completed),
    };
  }, [reminders]);

  async function toggleReminder(reminder: StoredReminder) {
    await updateReminder({ ...reminder, completed: !reminder.completed });
    setReminders(await getReminders());
  }

  return (
    <main className="min-h-svh bg-slate-100 px-4 pb-28 pt-5 text-zinc-950">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-bold text-violet-700">Simply Logged</p>
        <h1 className="text-3xl font-bold">Reminders</h1>
        <section className="mt-5 rounded-[1.75rem] bg-white p-4 shadow-lg shadow-slate-300/40">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-violet-700" />
            <div>
              <h2 className="font-bold">{reminders.length} saved reminders</h2>
              <p className="text-sm text-zinc-600">
                {grouped.overdue.length} overdue · {grouped.upcoming.length} upcoming
              </p>
            </div>
          </div>
        </section>

        <ReminderSection
          title="Overdue"
          icon={Clock3}
          reminders={grouped.overdue}
          tone="red"
          onToggle={toggleReminder}
        />
        <ReminderSection
          title="Upcoming"
          icon={CalendarCheck}
          reminders={grouped.upcoming}
          tone="violet"
          onToggle={toggleReminder}
        />
        <ReminderSection
          title="Completed"
          icon={CheckCircle2}
          reminders={grouped.completed}
          tone="green"
          onToggle={toggleReminder}
        />
      </div>
      <BottomNav />
    </main>
  );
}

function ReminderSection({
  title,
  icon: Icon,
  reminders,
  tone,
  onToggle,
}: {
  title: string;
  icon: typeof Bell;
  reminders: StoredReminder[];
  tone: "red" | "violet" | "green";
  onToggle: (reminder: StoredReminder) => void;
}) {
  const color =
    tone === "red" ? "text-rose-600" : tone === "green" ? "text-emerald-600" : "text-violet-700";

  return (
    <section className="mt-4 rounded-[1.5rem] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      <div className="space-y-2">
        {reminders.length ? (
          reminders.map((reminder) => (
            <button
              key={reminder.id}
              onClick={() => onToggle(reminder)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{reminder.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {reminder.roomName} · {formatDate(reminder.dueDate)}
                </p>
              </div>
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                  reminder.completed ? "bg-emerald-500 text-white" : "bg-white text-zinc-400"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-500">
            Nothing here yet.
          </p>
        )}
      </div>
    </section>
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(value: string) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
