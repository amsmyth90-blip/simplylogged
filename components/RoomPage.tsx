"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  FileText,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import {
  type StoredDocument,
  type StoredReminder,
} from "@/lib/storage";
import { getDocumentsByRoom } from "@/lib/supabase/documents";
import { getRemindersByRoom } from "@/lib/supabase/reminders";

type RoomPageProps = {
  roomId: string;
  room: {
    title: string;
    description: string;
    documents: readonly string[];
    reminders: readonly string[];
    actions: readonly string[];
  };
};

export function RoomPage({ roomId, room }: RoomPageProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [reminders, setReminders] = useState<StoredReminder[]>([]);

  useEffect(() => {
    async function refresh() {
      setDocuments(await getDocumentsByRoom(roomId));
      setReminders(await getRemindersByRoom(roomId));
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("simplyLoggedStorage", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("simplyLoggedStorage", refresh);
    };
  }, [roomId]);

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,#f5f3ff_0,#f8fafc_34%,#e7eef9_100%)] px-4 pb-28 pt-4 text-zinc-950">
      <div className="mx-auto max-w-md">
        <header className="glass sticky top-4 z-20 flex items-center gap-3 rounded-[1.5rem] px-3 py-3">
          <Link
            href="/dashboard"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/70"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-violet-700">Digital Estate</p>
            <h1 className="truncate text-xl font-bold">{room.title}</h1>
          </div>
        </header>

        <section className="mt-5 rounded-[1.75rem] bg-white/78 p-5 shadow-xl shadow-slate-300/40 ring-1 ring-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-normal">{room.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{room.description}</p>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/25">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
        </section>

        <StoredDocumentsSection fallbackItems={room.documents} documents={documents} />
        <StoredRemindersSection fallbackItems={room.reminders} reminders={reminders} />

        <section className="mt-4 rounded-[1.5rem] bg-white/82 p-4 shadow-lg shadow-slate-300/30 ring-1 ring-white">
          <div className="mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4 text-violet-700" />
            <h3 className="text-sm font-bold">Actions</h3>
          </div>
          <Link
            href="/add"
            className="flex items-center justify-between rounded-2xl bg-violet-600 px-3 py-3 text-sm font-bold text-white"
          >
            Add document to this room
            <Plus className="h-4 w-4" />
          </Link>
          <div className="mt-2 space-y-2">
            {room.actions.slice(1).map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-2xl bg-zinc-50 px-3 py-3 text-sm font-medium"
              >
                <span>{item}</span>
                <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700">
                  Start
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function StoredDocumentsSection({
  fallbackItems,
  documents,
}: {
  fallbackItems: readonly string[];
  documents: StoredDocument[];
}) {
  return (
    <section className="mt-4 rounded-[1.5rem] bg-white/82 p-4 shadow-lg shadow-slate-300/30 ring-1 ring-white">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-violet-700" />
        <h3 className="text-sm font-bold">Documents</h3>
      </div>
      <div className="space-y-2">
        {documents.length ? (
          documents.map((document) => (
            <div
              key={document.id}
              className="rounded-2xl bg-zinc-50 px-3 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-bold">{document.title}</span>
                {document.status === "new" ? (
                  <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-600">
                    New
                  </span>
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
              </div>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                {document.category} · {document.provider}
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">
                {document.summary}
              </p>
            </div>
          ))
        ) : (
          fallbackItems.map((item) => (
            <div
              key={item}
              className="flex items-center justify-between rounded-2xl bg-zinc-50 px-3 py-3 text-sm font-medium"
            >
              <span>{item}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function StoredRemindersSection({
  fallbackItems,
  reminders,
}: {
  fallbackItems: readonly string[];
  reminders: StoredReminder[];
}) {
  return (
    <section className="mt-4 rounded-[1.5rem] bg-white/82 p-4 shadow-lg shadow-slate-300/30 ring-1 ring-white">
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-4 w-4 text-violet-700" />
        <h3 className="text-sm font-bold">Reminders</h3>
      </div>
      <div className="space-y-2">
        {reminders.length ? (
          reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-bold">{reminder.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatDate(reminder.dueDate)}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                  reminder.completed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {reminder.completed ? "Done" : "Due"}
              </span>
            </div>
          ))
        ) : (
          fallbackItems.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-2xl bg-zinc-50 px-3 py-3 text-sm font-medium"
          >
            <span>{item}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          ))
        )}
      </div>
    </section>
  );
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
