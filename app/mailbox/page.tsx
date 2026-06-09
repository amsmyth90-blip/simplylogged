"use client";

import { useEffect, useState } from "react";
import { Archive, CheckCircle2, Mail, MoveRight, Sparkles, Trash2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { roomOptions } from "@/lib/mock-data";
import { deleteDocument, getDocuments, updateDocument } from "@/lib/supabase/documents";
import type { StoredDocument } from "@/lib/storage";

export default function MailboxPage() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);

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
    await updateDocument({ ...document, status: "filed" });
    await refreshMailbox();
  }

  async function moveRoom(document: StoredDocument, roomId: string) {
    const room = roomOptions.find((item) => item.id === roomId);
    if (!room) return;
    await updateDocument({ ...document, roomId: room.id, roomName: room.name, status: "filed" });
    await refreshMailbox();
  }

  async function remove(documentId: string) {
    await deleteDocument(documentId);
    await refreshMailbox();
  }

  return (
    <main className="min-h-svh overflow-hidden bg-[#15120e] px-4 pb-28 pt-5 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_35%_0%,rgba(251,191,36,0.25),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(244,114,182,0.13),transparent_28%),linear-gradient(180deg,#241b13,#0f1115)]" />
      <div className="relative mx-auto max-w-md">
        <header>
          <p className="text-sm font-bold text-amber-200">Estate Mailbox</p>
          <h1 className="text-3xl font-bold">Inbox</h1>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/25 backdrop-blur-2xl">
          <div className="absolute bottom-0 left-8 right-8 h-20 rounded-t-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))] ring-1 ring-white/12" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Awaiting filing</p>
              <h2 className="mt-2 text-4xl font-bold">{documents.length}</h2>
              <p className="mt-2 text-sm text-white/68">New uploads, AI suggestions, and unreviewed papers.</p>
            </div>
            <div className="grid h-20 w-20 place-items-center rounded-[2rem] bg-amber-200 text-zinc-950 shadow-xl shadow-amber-950/30">
              <Mail className="h-9 w-9" />
            </div>
          </div>
        </section>

        <section className="mt-5 space-y-3">
          {documents.length ? (
            documents.map((document) => (
              <article key={document.id} className="overflow-hidden rounded-[1.5rem] border border-white/14 bg-white/12 backdrop-blur-2xl">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/14">
                      <Sparkles className="h-6 w-6 text-amber-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-bold">{document.title}</h2>
                      <p className="mt-1 text-xs text-white/55">
                        AI suggests {document.roomName} · {document.category}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/68">{document.summary}</p>
                    </div>
                  </div>
                  <label className="mt-4 flex items-center gap-2 rounded-2xl bg-black/18 p-3 text-sm font-bold">
                    <MoveRight className="h-4 w-4 text-amber-200" />
                    <select
                      value={document.roomId}
                      onChange={(event) => moveRoom(document, event.target.value)}
                      className="min-w-0 flex-1 bg-transparent outline-none"
                    >
                      {roomOptions.map((room) => (
                        <option key={room.id} value={room.id}>
                          Move to {room.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-px bg-white/10">
                  <button onClick={() => acceptSuggestion(document)} className="flex items-center justify-center gap-2 bg-emerald-500/18 px-3 py-3 text-sm font-bold text-emerald-100">
                    <CheckCircle2 className="h-4 w-4" />
                    Accept
                  </button>
                  <button onClick={() => remove(document.id)} className="flex items-center justify-center gap-2 bg-rose-500/18 px-3 py-3 text-sm font-bold text-rose-100">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <section className="rounded-[1.5rem] border border-white/14 bg-white/12 p-6 text-center backdrop-blur-2xl">
              <Archive className="mx-auto h-9 w-9 text-amber-200" />
              <h2 className="mt-3 font-bold">Mailbox clear</h2>
              <p className="mt-1 text-sm text-white/60">New estate paperwork will arrive here before filing.</p>
            </section>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
