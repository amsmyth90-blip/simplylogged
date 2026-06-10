"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, CheckCircle2, Mail, MoveRight, Plus, Trash2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Toast } from "@/components/Toast";
import { confirmDelete } from "@/lib/confirmations";
import { roomOptions } from "@/lib/mock-data";
import { deleteDocument, getDocuments, updateDocument } from "@/lib/supabase/documents";
import type { StoredDocument } from "@/lib/storage";

export default function MailboxPage() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [toast, setToast] = useState("");
  const [busyDocumentId, setBusyDocumentId] = useState("");

  useEffect(() => {
    async function refresh() {
      setDocuments((await getDocuments()).filter((document) => document.status === "new"));
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("simplyLoggedStorage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("simplyLoggedStorage", refresh);
    };
  }, []);

  async function refreshMailbox() {
    setDocuments((await getDocuments()).filter((document) => document.status === "new"));
  }

  async function acceptSuggestion(document: StoredDocument) {
    try {
      setBusyDocumentId(document.id);
      await updateDocument({ ...document, status: "filed" });
      await refreshMailbox();
      setToast("Suggestion accepted.");
    } catch {
      setToast("Could not accept suggestion. Please try again.");
    } finally {
      setBusyDocumentId("");
    }
  }

  async function moveRoom(document: StoredDocument, roomId: string) {
    const room = roomOptions.find((item) => item.id === roomId);
    if (!room) return;
    try {
      setBusyDocumentId(document.id);
      await updateDocument({ ...document, roomId: room.id, roomName: room.name, status: "filed" });
      await refreshMailbox();
      setToast(`Moved to ${room.name}.`);
    } catch {
      setToast("Could not move document. Please try again.");
    } finally {
      setBusyDocumentId("");
    }
  }

  async function remove(documentId: string) {
    const document = documents.find((item) => item.id === documentId);
    if (document && !confirmDelete(document.title)) {
      return;
    }

    try {
      setBusyDocumentId(documentId);
      await deleteDocument(documentId);
      await refreshMailbox();
      setToast("Mailbox item deleted.");
    } catch {
      setToast("Could not delete mailbox item. Please try again.");
    } finally {
      setBusyDocumentId("");
    }
  }

  return (
    <main className="min-h-svh bg-[#f5efe6] pb-[calc(8rem+env(safe-area-inset-bottom))] text-[#261c14]">
      <section className="relative min-h-[21rem] overflow-hidden rounded-b-[2rem] bg-[radial-gradient(circle_at_68%_42%,rgba(248,113,113,0.14),transparent_18%),linear-gradient(135deg,#182015,#42522d_48%,#1b130d)] px-5 pb-20 pt-5 text-white shadow-2xl shadow-stone-400/40">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.68))]" />
        <div className="absolute bottom-20 right-8 h-28 w-32 rounded-t-[3rem] bg-[linear-gradient(180deg,#233320,#0f1710)] shadow-2xl shadow-black/40 ring-1 ring-white/10" />
        <div className="absolute bottom-20 right-8 h-12 w-32 rounded-b-2xl bg-black/30" />
        <div className="absolute bottom-24 right-4 h-2 w-20 bg-red-500" />
        <div className="absolute bottom-28 right-2 h-12 w-2 rounded-full bg-red-600" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-white/82">Mailbox</p>
            <h1 className="mt-2 max-w-52 text-4xl font-bold">Unfiled items & suggestions</h1>
            <p className="mt-3 text-sm font-medium text-white/78">{documents.length} items need your review</p>
          </div>
          <Link href="/add" className="grid h-11 w-11 place-items-center rounded-full bg-black/24 backdrop-blur-md" aria-label="Add upload">
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <div className="relative z-20 mx-auto -mt-12 max-w-md px-4">
        <section className="rounded-[1.35rem] bg-white p-4 text-center shadow-xl shadow-stone-300/50">
          <p className="text-sm font-bold">{documents.length} items need your review</p>
        </section>

        <section className="mt-4 space-y-3">
          {documents.length ? (
            documents.map((document) => (
              <article key={document.id} className="rounded-[1.35rem] bg-white p-4 shadow-sm shadow-stone-200">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="truncate font-bold">{document.title}</h2>
                      <span className="text-sm text-stone-500">Today</span>
                    </div>
                    <p className="mt-1 text-sm text-stone-500">{document.provider || "Simply Logged"}</p>
                    <span className="mt-2 inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-sm font-bold text-violet-700">
                      Suggests: {document.roomName}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_1fr_44px] gap-2">
                  <button disabled={busyDocumentId === document.id} onClick={() => acceptSuggestion(document)} className="min-h-11 rounded-xl bg-emerald-700 text-sm font-bold text-white disabled:bg-stone-300">
                    {busyDocumentId === document.id ? "Saving" : "Accept"}
                  </button>
                  <label className="flex min-h-11 items-center justify-center rounded-xl border border-stone-200 bg-[#fbf7ef] px-2 text-sm font-bold">
                    <MoveRight className="mr-1 h-4 w-4 text-stone-500" />
                    <select disabled={busyDocumentId === document.id} value={document.roomId} onChange={(event) => moveRoom(document, event.target.value)} className="min-w-0 bg-transparent outline-none disabled:opacity-50">
                      {roomOptions.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button disabled={busyDocumentId === document.id} onClick={() => remove(document.id)} className="grid min-h-11 place-items-center rounded-xl border border-stone-200 bg-[#fbf7ef] disabled:opacity-50" aria-label="Delete">
                    <Trash2 className="h-5 w-5 text-rose-600" />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <section className="rounded-[1.35rem] bg-white p-6 text-center shadow-sm shadow-stone-200">
              <Archive className="mx-auto h-9 w-9 text-amber-700" />
              <h2 className="mt-3 font-bold">Mailbox clear</h2>
              <p className="mt-1 text-sm text-stone-500">New uploads will arrive here before filing.</p>
              <CheckCircle2 className="mx-auto mt-4 h-6 w-6 text-emerald-600" />
            </section>
          )}
        </section>
      </div>
      <Toast message={toast} tone={toast.startsWith("Could") ? "error" : "success"} />
      <BottomNav />
    </main>
  );
}
