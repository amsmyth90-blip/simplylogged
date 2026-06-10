"use client";

import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  FileText,
  Plus,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Toast } from "@/components/Toast";
import type { StoredDocument, StoredReminder } from "@/lib/storage";
import { saveReminder, updateReminder } from "@/lib/supabase/reminders";

type RoomLayoutProps = {
  roomId: string;
  room: {
    title: string;
    description: string;
    documents: readonly string[];
    reminders: readonly string[];
  };
  icon: LucideIcon;
  readiness: number;
  summaries: {
    label: string;
    value: string;
    tone: "green" | "amber" | "stone";
  }[];
  coverage: {
    label: string;
    status: string;
    tone: "ok" | "warn" | "neutral";
  }[];
  documents: StoredDocument[];
  reminders: StoredReminder[];
};

const toneClasses = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
  stone: "bg-stone-100 text-stone-700 ring-stone-200",
};

const coverageToneClasses = {
  ok: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-800",
  neutral: "bg-stone-100 text-stone-600",
};

export function RoomLayout({
  roomId,
  room,
  icon: RoomIcon,
  readiness,
  summaries,
  coverage,
  documents,
  reminders,
}: RoomLayoutProps) {
  const [selectedDocument, setSelectedDocument] = useState<StoredDocument | null>(null);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [isCompletingReminderId, setIsCompletingReminderId] = useState("");
  const openReminders = reminders.filter((reminder) => !reminder.completed);

  async function createReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReminderMessage("");

    if (!reminderTitle.trim()) {
      setReminderMessage("Add a reminder title first.");
      return;
    }

    try {
      setIsSavingReminder(true);
      await saveReminder({
        id: createId(),
        title: reminderTitle.trim(),
        roomId,
        roomName: room.title,
        dueDate: reminderDate,
        priority: "medium",
        linkedDocumentId: "",
        completed: false,
        createdAt: new Date().toISOString(),
      });

      setReminderTitle("");
      setReminderDate("");
      setShowReminderForm(false);
      setReminderMessage("Reminder saved.");
    } catch {
      setReminderMessage("Could not save reminder. Please try again.");
    } finally {
      setIsSavingReminder(false);
    }
  }

  async function completeReminder(reminder: StoredReminder) {
    try {
      setIsCompletingReminderId(reminder.id);
      await updateReminder({ ...reminder, completed: true });
      setReminderMessage("Reminder completed.");
    } catch {
      setReminderMessage("Could not complete reminder. Please try again.");
    } finally {
      setIsCompletingReminderId("");
    }
  }

  return (
    <main className="min-h-svh bg-[#f6efe5] text-[#241a12]">
      <div className="mx-auto flex min-h-svh max-w-md flex-col px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="rounded-[1.75rem] bg-white/88 p-4 shadow-[0_18px_45px_rgba(64,45,26,0.10)] ring-1 ring-white/70 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Back to estate"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f7f0e7] text-stone-800 shadow-inner shadow-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f4e5cf] text-violet-700 ring-1 ring-amber-100">
              <RoomIcon className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                Estate room
              </p>
              <h1 className="truncate text-2xl font-black tracking-normal">{room.title}</h1>
            </div>

            <div className="rounded-full bg-[#f7f0e7] px-3 py-2 text-center ring-1 ring-stone-200">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-stone-500">
                Ready
              </p>
              <p className="text-sm font-black text-emerald-700">{readiness}%</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-stone-600">{room.description}</p>
        </header>

        <div className="mt-4 space-y-4">
          <section className="rounded-[1.5rem] bg-white p-4 shadow-[0_14px_34px_rgba(64,45,26,0.08)] ring-1 ring-stone-100">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">What&apos;s in this room?</h2>
              <Sparkles className="h-5 w-5 text-violet-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {summaries.map((summary) => (
                <div
                  key={summary.label}
                  className={`min-h-24 rounded-3xl p-3 ring-1 ${toneClasses[summary.tone]}`}
                >
                  <p className="text-2xl font-black">{summary.value}</p>
                  <p className="mt-1 text-sm font-bold leading-tight">{summary.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {coverage.map((item) => (
                <div
                  key={item.label}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-[#fbf7ef] px-3 py-2"
                >
                  <span className="text-sm font-bold text-stone-800">{item.label}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${coverageToneClasses[item.tone]}`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-white p-4 shadow-[0_14px_34px_rgba(64,45,26,0.08)] ring-1 ring-stone-100">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">Documents</h2>
              <FileText className="h-5 w-5 text-stone-500" />
            </div>
            <div className="space-y-2">
              {documents.length
                ? documents.map((document) => (
                    <DocumentCard
                      key={document.id}
                      document={document}
                      onOpen={() => setSelectedDocument(document)}
                    />
                  ))
                : room.documents.map((document) => (
                    <div
                      key={document}
                      className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#fbf7ef] px-3 py-2"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{document}</p>
                        <p className="text-xs font-semibold text-stone-500">Suggested shelf</p>
                      </div>
                    </div>
                  ))}
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-white p-4 shadow-[0_14px_34px_rgba(64,45,26,0.08)] ring-1 ring-stone-100">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">Reminders</h2>
              <CalendarClock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="space-y-2">
              {openReminders.length
                ? openReminders.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onComplete={() => completeReminder(reminder)}
                      isCompleting={isCompletingReminderId === reminder.id}
                    />
                  ))
                : room.reminders.map((reminder) => (
                    <div
                      key={reminder}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[#fbf7ef] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{reminder}</p>
                        <p className="text-xs font-semibold text-stone-500">Estate prompt</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    </div>
                  ))}
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-white p-4 shadow-[0_14px_34px_rgba(64,45,26,0.08)] ring-1 ring-stone-100">
            <h2 className="mb-3 text-lg font-black">Quick actions</h2>
            <div className="grid gap-2">
              <ActionLink href={`/add?roomId=${roomId}`} icon={Plus} label="Add document" />
              <ActionLink href={`/add?roomId=${roomId}`} icon={ScanLine} label="Scan document" />
              <button
                type="button"
                onClick={() => setShowReminderForm((current) => !current)}
                className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#fbf7ef] px-3 py-2 text-sm font-black text-stone-800 transition hover:bg-[#f3eadf]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
                  <Bell className="h-5 w-5" />
                </span>
                Create reminder
              </button>
            </div>
            {showReminderForm ? (
              <form onSubmit={createReminder} className="mt-3 grid gap-2 rounded-2xl bg-[#fbf7ef] p-3">
                <input
                  value={reminderTitle}
                  onChange={(event) => setReminderTitle(event.target.value)}
                  placeholder="Reminder title"
                  className="min-h-11 rounded-xl bg-white px-3 text-sm font-semibold outline-none ring-1 ring-stone-200"
                />
                <input
                  value={reminderDate}
                  onChange={(event) => setReminderDate(event.target.value)}
                  type="date"
                  className="min-h-11 rounded-xl bg-white px-3 text-sm font-semibold outline-none ring-1 ring-stone-200"
                />
                <button
                  disabled={isSavingReminder}
                  className="min-h-11 rounded-xl bg-stone-950 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  {isSavingReminder ? "Saving..." : "Save reminder"}
                </button>
              </form>
            ) : null}
            {reminderMessage ? (
              <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                {reminderMessage}
              </p>
            ) : null}
          </section>
        </div>
      </div>

      {selectedDocument ? (
        <DocumentDetailsModal document={selectedDocument} onClose={() => setSelectedDocument(null)} />
      ) : null}
      <Toast message={reminderMessage} tone={reminderMessage.startsWith("Could") ? "error" : "success"} />
      <BottomNav />
    </main>
  );
}

function DocumentCard({ document, onOpen }: { document: StoredDocument; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-[#fbf7ef] px-3 py-2 text-left"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{document.title}</p>
        <p className="truncate text-xs font-semibold text-stone-500">
          {[document.category, document.provider].filter(Boolean).join(" - ") || "Filed document"}
        </p>
      </div>
      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-stone-600">
        {document.status === "new" ? "New" : "Filed"}
      </span>
    </button>
  );
}

function ReminderCard({
  reminder,
  onComplete,
  isCompleting,
}: {
  reminder: StoredReminder;
  onComplete: () => void;
  isCompleting: boolean;
}) {
  return (
    <article className="flex min-h-16 items-center gap-3 rounded-2xl bg-[#fbf7ef] px-3 py-2">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-amber-700 shadow-sm">
        <CalendarClock className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{reminder.title}</p>
        <p className="text-xs font-semibold text-stone-500">{formatDate(reminder.dueDate)}</p>
      </div>
      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black capitalize text-stone-600">
        {reminder.priority}
      </span>
      <button
        type="button"
        onClick={onComplete}
        disabled={isCompleting}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white disabled:bg-stone-300"
        aria-label={`Complete ${reminder.title}`}
      >
        <CheckCircle2 className="h-5 w-5" />
      </button>
    </article>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#fbf7ef] px-3 py-2 text-sm font-black text-stone-800 transition hover:bg-[#f3eadf]"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </Link>
  );
}

function formatDate(value: string) {
  if (!value) return "No date set";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function DocumentDetailsModal({
  document,
  onClose,
}: {
  document: StoredDocument;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-black/35 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
      <section className="max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-700">
              Document details
            </p>
            <h2 className="mt-1 truncate text-xl font-black">{document.title}</h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">{document.roomName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full bg-stone-100 px-4 text-sm font-black"
          >
            Close
          </button>
        </div>
        <dl className="mt-4 grid gap-2 text-sm">
          <Detail label="Category" value={document.category || "Uncategorised"} />
          <Detail label="Provider" value={document.provider || "Not set"} />
          <Detail label="Expiry" value={document.expiryDate || "Not set"} />
          <Detail label="Status" value={document.status} />
        </dl>
        <p className="mt-4 rounded-2xl bg-[#fbf7ef] p-3 text-sm leading-6 text-stone-600">
          {document.summary || "No summary saved yet."}
        </p>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-[#fbf7ef] px-3">
      <dt className="font-bold text-stone-500">{label}</dt>
      <dd className="min-w-0 truncate font-black text-stone-900">{value}</dd>
    </div>
  );
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `reminder-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
