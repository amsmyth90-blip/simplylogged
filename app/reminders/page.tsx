"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileText, Plus, TimerReset, Trash2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Toast } from "@/components/Toast";
import { confirmDelete } from "@/lib/confirmations";
import { getDocuments } from "@/lib/supabase/documents";
import { deleteReminder, getReminders, saveReminder, updateReminder } from "@/lib/supabase/reminders";
import type { StoredDocument, StoredReminder } from "@/lib/storage";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<StoredReminder[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<StoredDocument | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [roomId, setRoomId] = useState("family-room");
  const [toast, setToast] = useState("");
  const [busyReminderId, setBusyReminderId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function refresh() {
    setReminders(await getReminders());
    setDocuments(await getDocuments());
  }

  useEffect(() => {
    queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("simplyLoggedStorage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("simplyLoggedStorage", refresh);
    };
  }, []);

  const grouped = useMemo(() => groupReminders(reminders), [reminders]);

  async function completeReminder(reminder: StoredReminder) {
    try {
      setBusyReminderId(reminder.id);
      await updateReminder({ ...reminder, completed: true });
      await refresh();
      setToast("Reminder completed.");
    } catch {
      setToast("Could not complete reminder. Please try again.");
    } finally {
      setBusyReminderId("");
    }
  }

  async function snoozeReminder(reminder: StoredReminder) {
    const nextDate = new Date(`${reminder.dueDate || new Date().toISOString().slice(0, 10)}T00:00:00`);
    nextDate.setDate(nextDate.getDate() + 7);
    try {
      setBusyReminderId(reminder.id);
      await updateReminder({ ...reminder, dueDate: nextDate.toISOString().slice(0, 10), completed: false });
      await refresh();
      setToast("Reminder snoozed for 7 days.");
    } catch {
      setToast("Could not snooze reminder. Please try again.");
    } finally {
      setBusyReminderId("");
    }
  }

  async function removeReminder(reminder: StoredReminder) {
    if (!confirmDelete(reminder.title)) return;
    try {
      setBusyReminderId(reminder.id);
      await deleteReminder(reminder.id);
      await refresh();
      setToast("Reminder deleted.");
    } catch {
      setToast("Could not delete reminder. Please try again.");
    } finally {
      setBusyReminderId("");
    }
  }

  function openLinkedDocument(reminder: StoredReminder) {
    const document = documents.find((item) => item.id === reminder.linkedDocumentId);
    if (document) {
      setSelectedDocument(document);
    }
  }

  async function createReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const roomName = roomNameFromId(roomId);
    try {
      setIsCreating(true);
      await saveReminder({
        id: createId(),
        title: title.trim(),
        roomId,
        roomName,
        dueDate,
        priority: "medium",
        linkedDocumentId: "",
        completed: false,
        createdAt: new Date().toISOString(),
      });
      setTitle("");
      setDueDate("");
      setShowForm(false);
      await refresh();
      setToast("Reminder saved.");
    } catch {
      setToast("Could not save reminder. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-svh bg-[#f5efe6] pb-[calc(8rem+env(safe-area-inset-bottom))] text-[#261c14]">
      <section className="relative min-h-[21rem] overflow-hidden rounded-b-[2rem] bg-[radial-gradient(circle_at_50%_22%,rgba(190,242,100,0.14),transparent_18%),linear-gradient(135deg,#162015,#354528_48%,#11100b)] px-5 pb-20 pt-5 text-white shadow-2xl shadow-stone-400/40">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.64))]" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-white/82">Your important dates</p>
            <h1 className="mt-2 text-4xl font-bold">Reminders</h1>
          </div>
          <button
            onClick={() => setShowForm((current) => !current)}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/24 backdrop-blur-md"
            aria-label="Create reminder"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </section>

      <div className="relative z-20 mx-auto -mt-12 max-w-md px-4">
        <section className="rounded-[1.35rem] bg-white p-4 shadow-xl shadow-stone-300/50">
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Overdue" value={String(grouped.overdue.length)} tone="red" />
            <Stat label="Soon" value={String(grouped.soon.length)} tone="amber" />
            <Stat label="Future" value={String(grouped.future.length)} tone="green" />
            <Stat label="Done" value={String(grouped.completed.length)} tone="stone" />
          </div>
        </section>

        {showForm ? (
          <form onSubmit={createReminder} className="mt-4 grid gap-2 rounded-[1.35rem] bg-white p-4 shadow-sm shadow-stone-200">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="Reminder title"
              className="min-h-12 rounded-2xl bg-[#fbf7ef] px-4 text-sm font-bold outline-none"
            />
            <input
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              className="min-h-12 rounded-2xl bg-[#fbf7ef] px-4 text-sm font-bold outline-none"
            />
            <select
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              className="min-h-12 rounded-2xl bg-[#fbf7ef] px-4 text-sm font-bold outline-none"
            >
              {["bedroom", "office", "family-room", "safe-room", "garage", "garden", "driveway", "attic"].map((id) => (
                <option key={id} value={id}>{roomNameFromId(id)}</option>
              ))}
            </select>
            <button
              disabled={isCreating}
              className="min-h-12 rounded-full bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {isCreating ? "Saving..." : "Save reminder"}
            </button>
          </form>
        ) : null}

        <ReminderGroup title="Overdue" reminders={grouped.overdue} tone="red" busyReminderId={busyReminderId} onComplete={completeReminder} onSnooze={snoozeReminder} onDelete={removeReminder} onOpenDocument={openLinkedDocument} />
        <ReminderGroup title="Due Soon" reminders={grouped.soon} tone="amber" busyReminderId={busyReminderId} onComplete={completeReminder} onSnooze={snoozeReminder} onDelete={removeReminder} onOpenDocument={openLinkedDocument} />
        <ReminderGroup title="Future" reminders={grouped.future} tone="green" busyReminderId={busyReminderId} onComplete={completeReminder} onSnooze={snoozeReminder} onDelete={removeReminder} onOpenDocument={openLinkedDocument} />
        <ReminderGroup title="Completed" reminders={grouped.completed} tone="stone" busyReminderId={busyReminderId} onComplete={completeReminder} onSnooze={snoozeReminder} onDelete={removeReminder} onOpenDocument={openLinkedDocument} />
      </div>

      {selectedDocument ? <DocumentModal document={selectedDocument} onClose={() => setSelectedDocument(null)} /> : null}
      <Toast message={toast} tone={toast.startsWith("Could") ? "error" : "success"} />
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
  onDelete,
  onOpenDocument,
  busyReminderId,
}: {
  title: string;
  reminders: StoredReminder[];
  tone: "red" | "amber" | "green" | "stone";
  onComplete: (reminder: StoredReminder) => void;
  onSnooze: (reminder: StoredReminder) => void;
  onDelete: (reminder: StoredReminder) => void;
  onOpenDocument: (reminder: StoredReminder) => void;
  busyReminderId: string;
}) {
  return (
    <section className="mt-5">
      <h2 className={`text-sm font-bold uppercase tracking-[0.12em] ${headingTone(tone)}`}>{title}</h2>
      <div className="mt-3 space-y-3">
        {reminders.length ? (
          reminders.map((reminder) => (
            <article key={reminder.id} className="rounded-[1.35rem] bg-white p-4 shadow-sm shadow-stone-200">
              <div className="flex items-center gap-3">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${toneClass(tone)}`}>
                  <Clock3 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{reminder.title}</h3>
                  <p className="text-sm text-stone-500">{reminder.roomName} - {formatDate(reminder.dueDate)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <button disabled={busyReminderId === reminder.id} onClick={() => onComplete(reminder)} className="grid min-h-11 place-items-center rounded-xl bg-[#fbf7ef] text-sm font-bold disabled:opacity-50" aria-label="Mark complete">
                  <CheckCircle2 className="h-5 w-5" />
                </button>
                <button disabled={busyReminderId === reminder.id} onClick={() => onSnooze(reminder)} className="grid min-h-11 place-items-center rounded-xl bg-[#fbf7ef] text-sm font-bold disabled:opacity-50" aria-label="Snooze 7 days">
                  <TimerReset className="h-5 w-5" />
                </button>
                {reminder.linkedDocumentId ? (
                  <button onClick={() => onOpenDocument(reminder)} className="grid min-h-11 place-items-center rounded-xl bg-[#fbf7ef]" aria-label="Open linked document">
                    <FileText className="h-5 w-5" />
                  </button>
                ) : (
                  <Link href={reminder.roomId === "vault" ? "/vault" : `/room/${reminder.roomId}`} className="grid min-h-11 place-items-center rounded-xl bg-[#fbf7ef]" aria-label="Open room">
                    <FileText className="h-5 w-5" />
                  </Link>
                )}
                <button disabled={busyReminderId === reminder.id} onClick={() => onDelete(reminder)} className="grid min-h-11 place-items-center rounded-xl bg-rose-50 text-rose-700 disabled:opacity-50" aria-label="Delete reminder">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-[1.2rem] bg-white p-4 text-sm font-semibold text-stone-500 shadow-sm shadow-stone-200">Nothing here.</p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "red" | "amber" | "green" | "stone" }) {
  return (
    <div className="rounded-2xl bg-[#fbf7ef] p-3">
      <p className={`text-2xl font-bold ${headingTone(tone)}`}>{value}</p>
      <p className="text-xs font-bold text-stone-500">{label}</p>
    </div>
  );
}

function DocumentModal({ document, onClose }: { document: StoredDocument; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-black/35 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
      <section className="max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-2xl">
        <h2 className="text-xl font-bold">{document.title}</h2>
        <p className="mt-1 text-sm text-stone-500">{document.roomName} - {document.category}</p>
        <p className="mt-4 rounded-2xl bg-[#fbf7ef] p-3 text-sm leading-6 text-stone-600">{document.summary || "No summary saved."}</p>
        <button onClick={onClose} className="mt-4 min-h-11 w-full rounded-full bg-stone-950 px-4 text-sm font-bold text-white">
          Close
        </button>
      </section>
    </div>
  );
}

function groupReminders(reminders: StoredReminder[]) {
  const today = startOfDay(new Date());
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 45);

  return {
    overdue: reminders.filter((item) => !item.completed && item.dueDate && startOfDay(new Date(`${item.dueDate}T00:00:00`)) < today),
    soon: reminders.filter((item) => !item.completed && item.dueDate && startOfDay(new Date(`${item.dueDate}T00:00:00`)) >= today && startOfDay(new Date(`${item.dueDate}T00:00:00`)) <= soon),
    future: reminders.filter((item) => !item.completed && (!item.dueDate || startOfDay(new Date(`${item.dueDate}T00:00:00`)) > soon)),
    completed: reminders.filter((item) => item.completed),
  };
}

function toneClass(tone: "red" | "amber" | "green" | "stone") {
  if (tone === "red") return "bg-rose-100 text-rose-700";
  if (tone === "amber") return "bg-amber-100 text-amber-700";
  if (tone === "green") return "bg-emerald-100 text-emerald-700";
  return "bg-stone-100 text-stone-600";
}

function headingTone(tone: "red" | "amber" | "green" | "stone") {
  if (tone === "red") return "text-rose-600";
  if (tone === "amber") return "text-amber-700";
  if (tone === "green") return "text-emerald-700";
  return "text-stone-600";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(value: string) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function roomNameFromId(roomId: string) {
  return roomId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `reminder-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
