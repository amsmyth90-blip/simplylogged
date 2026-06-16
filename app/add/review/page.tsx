"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, FileText, Sparkles } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { BottomNav } from "@/components/BottomNav";
import { Toast } from "@/components/Toast";
import type { DocumentAnalysis } from "@/lib/mock-ai";
import { roomOptions } from "@/lib/mock-data";
import { saveDocument } from "@/lib/supabase/documents";
import { saveReminder } from "@/lib/supabase/reminders";
import type { StoredDocument } from "@/lib/storage";

type PendingAnalysis = {
  documentId?: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  filePath?: string;
  fileUrl?: string;
  preferredRoomId?: string;
  analysedAt: string;
  source?: "real-ai" | "mock-fallback";
  analysis: DocumentAnalysis;
};

export default function AddReviewPage() {
  return (
    <AuthGate>
      <AddReviewContent />
    </AuthGate>
  );
}

function AddReviewContent() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAnalysis | null>(null);
  const [roomId, setRoomId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const raw = window.sessionStorage.getItem("simplyLoggedPendingAnalysis");
    if (!raw) {
      router.replace("/add");
      return;
    }

    queueMicrotask(() => {
      const parsed = normalizePendingAnalysis(JSON.parse(raw) as PendingAnalysis);
      setPending(parsed);
      setRoomId(parsed.preferredRoomId || parsed.analysis.suggestedRoomId);
    });
  }, [router]);

  const selectedRoom =
    roomOptions.find((room) => room.id === roomId) ??
    roomOptions.find((room) => room.id === pending?.analysis.suggestedRoomId);

  if (!pending) {
    return (
      <main className="grid min-h-svh place-items-center bg-slate-100 px-4 text-zinc-950">
        <p className="text-sm font-semibold text-zinc-600">Loading analysis...</p>
      </main>
    );
  }

  const { analysis } = pending;
  const roomName = selectedRoom?.name ?? analysis.suggestedRoomName;

  async function save(addReminders: boolean) {
    if (!pending) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const documentId = pending.documentId ?? createId("doc");
      const document: StoredDocument = {
        id: documentId,
        title: analysis.title,
        roomId,
        roomName,
        category: analysis.category,
        provider: analysis.provider,
        documentType: analysis.documentType,
        policyNumber: analysis.policyNumber,
        issueDate: analysis.issueDate,
        expiryDate: analysis.expiryDate,
        fileUrl: pending.fileUrl ?? "",
        filePath: pending.filePath ?? "",
        fileName: pending.fileName,
        mimeType: pending.fileType,
        fileSize: pending.fileSize ?? 0,
        analysisSource: pending.source === "real-ai" ? "openai" : "mock",
        analysisConfidence: analysis.confidence,
        uploadedAt: new Date().toISOString(),
        status: "new",
        summary: analysis.extractedSummary,
      };

      await saveDocument(document);

      if (addReminders && analysis.reminderDate) {
        await Promise.all(
          analysis.suggestedReminders.map((title, index) =>
            saveReminder({
            id: createId(`rem-${index}`),
            title: title.title,
            roomId,
            roomName,
            dueDate: title.dueDate || analysis.reminderDate,
            priority: title.priority,
            linkedDocumentId: documentId,
            completed: false,
            createdAt: new Date().toISOString(),
          }),
          ),
        );
      }

      window.sessionStorage.removeItem("simplyLoggedPendingAnalysis");
      setMessage(addReminders ? "Document and reminder saved." : "Document saved.");
      router.push(roomId === "vault" ? "/vault" : `/room/${roomId}`);
    } catch {
      setMessage("Could not save this document. Please try again.");
      setIsSaving(false);
    }
  }

  function analyseAnother() {
    window.sessionStorage.removeItem("simplyLoggedPendingAnalysis");
    router.push("/add");
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,#f5f3ff_0,#f8fafc_34%,#e7eef9_100%)] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-4 text-zinc-950">
      <div className="mx-auto max-w-md">
        <header className="glass sticky top-4 z-20 flex items-center gap-3 rounded-[1.5rem] px-3 py-3">
          <Link
            href="/add"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/70"
            aria-label="Back to add"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold text-violet-700">
              {pending.source === "real-ai" ? "OpenAI analysis" : "Mock fallback analysis"}
            </p>
            <h1 className="text-lg font-bold">AI has reviewed your document</h1>
          </div>
        </header>

        <section className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-xl shadow-slate-300/40">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold">{analysis.title}</h2>
              <p className="mt-1 text-sm text-zinc-600">{pending.fileName}</p>
              <span
                className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                  pending.source === "real-ai"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {pending.source === "real-ai" ? "Real AI result" : "Mock fallback result"}
              </span>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{analysis.extractedSummary}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[1.5rem] bg-white/88 p-4 shadow-lg shadow-slate-300/30 ring-1 ring-white">
          <h3 className="text-sm font-bold">Detected document details</h3>
          <dl className="mt-3 grid gap-2 text-sm">
            <Detail label="Type" value={analysis.documentType} />
            <Detail label="Category" value={analysis.category} />
            <Detail label="Provider" value={analysis.provider} />
            <Detail label="Policy number" value={analysis.policyNumber} />
            <Detail label="Confidence" value={`${Math.round(analysis.confidence * 100)}%`} />
          </dl>
        </section>

        <section className="mt-4 rounded-[1.5rem] bg-white/88 p-4 shadow-lg shadow-slate-300/30 ring-1 ring-white">
          <label className="text-sm font-bold" htmlFor="room-select">
            Suggested room
          </label>
          <div className="mt-3 flex items-center gap-3 rounded-[1.25rem] bg-violet-50 p-3">
            {selectedRoom ? <selectedRoom.icon className="h-5 w-5 text-violet-700" /> : <FileText className="h-5 w-5" />}
            <select
              id="room-select"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
            >
              {roomOptions.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-4 rounded-[1.5rem] bg-white/88 p-4 shadow-lg shadow-slate-300/30 ring-1 ring-white">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-violet-700" />
            <h3 className="text-sm font-bold">Extracted key dates</h3>
          </div>
          <dl className="grid gap-2 text-sm">
            <Detail label="Issue date" value={analysis.issueDate || "Not detected"} />
            <Detail label="Expiry date" value={analysis.expiryDate || "Not detected"} />
            <Detail label="Reminder date" value={analysis.reminderDate || "Not detected"} />
          </dl>
        </section>

        <section className="mt-4 rounded-[1.5rem] bg-white/88 p-4 shadow-lg shadow-slate-300/30 ring-1 ring-white">
          <h3 className="text-sm font-bold">Suggested reminders</h3>
          <div className="mt-3 space-y-2">
            {analysis.suggestedReminders.length ? (
              analysis.suggestedReminders.map((reminder) => (
                <div key={`${reminder.title}-${reminder.dueDate}`} className="flex items-center gap-2 rounded-2xl bg-zinc-50 p-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="min-w-0 flex-1">{reminder.title}</span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-zinc-500">
                    {reminder.dueDate || "No date"}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-600">
                No date-based reminders were detected.
              </p>
            )}
          </div>
        </section>

        <div className="mt-5 grid gap-3">
          <button
            onClick={() => save(false)}
            disabled={isSaving}
            className="rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isSaving ? "Saving..." : "Save document"}
          </button>
          <button
            onClick={() => save(true)}
            disabled={isSaving}
            className="rounded-full bg-violet-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-violet-600/25 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isSaving ? "Saving..." : "Save & add reminder"}
          </button>
          <button
            onClick={analyseAnother}
            disabled={isSaving}
            className="rounded-full bg-white px-5 py-4 text-sm font-bold text-zinc-800 shadow-sm"
          >
            Analyse another
          </button>
        </div>
      </div>
      <Toast message={message} tone={message.startsWith("Could") ? "error" : "success"} />
      <BottomNav />
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3 py-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 truncate font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}

function createId(prefix: string) {
  void prefix;

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (
      Number(char) ^
      (Math.random() * 16) >> (Number(char) / 4)
    ).toString(16),
  );
}

function normalizePendingAnalysis(pending: PendingAnalysis): PendingAnalysis {
  return {
    ...pending,
    documentId: pending.documentId ?? createId("doc"),
    fileSize: pending.fileSize ?? 0,
    source: pending.source ?? "mock-fallback",
    analysis: {
      ...pending.analysis,
      suggestedReminders: pending.analysis.suggestedReminders.map((reminder) => {
        if (typeof reminder === "string") {
          return {
            title: reminder,
            dueDate: pending.analysis.reminderDate,
            priority: "medium" as const,
          };
        }

        return reminder;
      }),
    },
  };
}
