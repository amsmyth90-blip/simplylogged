"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, FileText, Plus, Search } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { roomOptions } from "@/lib/mock-data";
import { getDocuments } from "@/lib/supabase/documents";
import type { StoredDocument } from "@/lib/storage";

export default function VaultPage() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [query, setQuery] = useState("");
  const [roomId, setRoomId] = useState("all");

  useEffect(() => {
    async function refresh() {
      setDocuments(await getDocuments());
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("simplyLoggedStorage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("simplyLoggedStorage", refresh);
    };
  }, []);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return documents.filter((document) => {
      const roomMatches = roomId === "all" || document.roomId === roomId;
      const textMatches =
        !normalizedQuery ||
        [document.title, document.category, document.provider, document.roomName]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return roomMatches && textMatches;
    });
  }, [documents, query, roomId]);

  return (
    <main className="min-h-svh bg-zinc-950 px-4 pb-28 pt-5 text-white">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-300">Simply Logged</p>
            <h1 className="text-3xl font-bold">Vault</h1>
          </div>
          <Link
            href="/add"
            className="grid h-12 w-12 place-items-center rounded-full bg-violet-600"
            aria-label="Add item"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </header>

        <section className="mt-6 rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/15">
          <Archive className="h-8 w-8 text-violet-300" />
          <h2 className="mt-4 text-xl font-bold">Family vault overview</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {documents.length
              ? `${documents.length} saved document${documents.length === 1 ? "" : "s"} across your estate.`
              : "Upload a document and Simply Logged will file it into the right room."}
          </p>
        </section>

        <section className="mt-4 grid gap-3">
          <label className="flex items-center gap-2 rounded-[1.25rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
            <Search className="h-4 w-4 text-violet-300" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-400"
            />
          </label>
          <select
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            className="rounded-[1.25rem] bg-white/10 px-4 py-3 text-sm font-bold text-white outline-none ring-1 ring-white/10"
          >
            <option value="all">All rooms</option>
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </section>

        <section className="mt-4 space-y-3">
          {filteredDocuments.length ? (
            filteredDocuments.map((document) => (
              <Link
                key={document.id}
                href={document.roomId === "vault" ? "/vault" : `/room/${document.roomId}`}
                className="block rounded-[1.25rem] bg-white/10 p-4 ring-1 ring-white/10"
              >
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 shrink-0 text-violet-300" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="truncate text-sm font-bold">{document.title}</h3>
                      {document.status === "new" ? (
                        <span className="rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-zinc-300">
                      {document.roomName} · {document.category}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
                      {document.summary}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.5rem] bg-white/10 p-6 text-center ring-1 ring-white/10">
              <FileText className="mx-auto h-8 w-8 text-violet-300" />
              <h2 className="mt-3 font-bold">No documents yet</h2>
              <p className="mt-1 text-sm text-zinc-300">
                Add your first document and the mock AI will suggest a room.
              </p>
              <Link
                href="/add"
                className="mt-4 inline-flex rounded-full bg-violet-600 px-4 py-2 text-sm font-bold"
              >
                Add document
              </Link>
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
