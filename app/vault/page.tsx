"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ChevronDown,
  FileText,
  Fingerprint,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { roomOptions } from "@/lib/mock-data";
import { getDocuments } from "@/lib/supabase/documents";
import type { StoredDocument } from "@/lib/storage";

const drawers = ["Identity", "Property", "Finance", "Legal", "Emergency", "Family"];

export default function VaultPage() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [query, setQuery] = useState("");
  const [roomId, setRoomId] = useState("all");
  const [openDrawers, setOpenDrawers] = useState<Record<string, boolean>>({
    Identity: true,
    Property: true,
  });

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

  const readiness = Math.min(98, 58 + documents.length * 7);
  const recentlyAdded = [...documents]
    .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))
    .slice(0, 4);

  function toggleDrawer(drawer: string) {
    setOpenDrawers((current) => ({ ...current, [drawer]: !current[drawer] }));
  }

  return (
    <main className="min-h-svh overflow-hidden bg-[#11110f] px-4 pb-28 pt-5 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(253,224,171,0.28),transparent_34%),radial-gradient(circle_at_15%_28%,rgba(139,92,246,0.18),transparent_28%),linear-gradient(180deg,#191714,#09090b)]" />
      <div className="relative mx-auto max-w-md">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-200">Estate Vault</p>
            <h1 className="text-3xl font-bold">Safe Room</h1>
          </div>
          <Link
            href="/add"
            className="grid h-12 w-12 place-items-center rounded-full bg-violet-600 shadow-lg shadow-violet-900/30"
            aria-label="Add document"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative grid grid-cols-[1fr_8rem] items-center gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                Readiness
              </p>
              <h2 className="mt-2 text-4xl font-bold">{readiness}%</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Identity, finance, legal, and emergency papers held behind the estate door.
              </p>
            </div>
            <div className="relative mx-auto grid h-32 w-28 place-items-center rounded-[2rem] border border-amber-100/20 bg-[linear-gradient(145deg,#2f2b24,#0f0f10)] shadow-inner shadow-black">
              <div className="absolute inset-3 rounded-[1.4rem] border border-white/10 bg-[radial-gradient(circle,#555_0,#1f1f21_55%,#050505_100%)] animate-[pulse_4s_ease-in-out_infinite]" />
              <div className="relative grid h-16 w-16 place-items-center rounded-full border-4 border-amber-200/40 bg-zinc-900">
                <LockKeyhole className="h-7 w-7 text-amber-200" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3">
          <label className="flex items-center gap-2 rounded-[1.35rem] border border-white/15 bg-white/12 px-4 py-3 backdrop-blur-2xl">
            <Search className="h-4 w-4 text-amber-200" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the vault"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-400"
            />
          </label>
          <select
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            className="rounded-[1.35rem] border border-white/15 bg-white/12 px-4 py-3 text-sm font-bold text-white outline-none backdrop-blur-2xl"
          >
            <option value="all">All estate rooms</option>
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </section>

        {recentlyAdded.length ? (
          <section className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-amber-200" />
              <h2 className="text-sm font-bold">Recently added</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentlyAdded.map((document) => (
                <DocumentCard key={document.id} document={document} compact />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-5 space-y-3">
          {drawers.map((drawer) => {
            const drawerDocs = filteredDocuments.filter((document) =>
              mapCategoryToDrawer(document).includes(drawer),
            );
            const isOpen = openDrawers[drawer] ?? false;
            const lastUpdated = drawerDocs[0]?.uploadedAt;

            return (
              <article
                key={drawer}
                className="overflow-hidden rounded-[1.5rem] border border-white/12 bg-white/10 backdrop-blur-2xl"
              >
                <button
                  onClick={() => toggleDrawer(drawer)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-200/15 text-amber-100">
                      <Archive className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold">{drawer}</h3>
                      <p className="text-xs text-zinc-400">
                        {drawerDocs.length} docs · {lastUpdated ? formatDate(lastUpdated) : "Awaiting first file"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-zinc-300 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen ? (
                  <div className="grid gap-3 border-t border-white/10 p-3">
                    {drawerDocs.length ? (
                      drawerDocs.map((document) => (
                        <DocumentCard key={document.id} document={document} />
                      ))
                    ) : (
                      <div className="rounded-[1.25rem] bg-black/20 p-4 text-sm text-zinc-300">
                        This drawer is ready for its first document.
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        {!filteredDocuments.length ? (
          <section className="mt-5 rounded-[1.5rem] bg-white/10 p-6 text-center ring-1 ring-white/10">
            <ShieldCheck className="mx-auto h-8 w-8 text-amber-200" />
            <h2 className="mt-3 font-bold">The safe is waiting</h2>
            <p className="mt-1 text-sm text-zinc-300">Add a document to unlock your first drawer.</p>
          </section>
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}

function DocumentCard({
  document,
  compact = false,
}: {
  document: StoredDocument;
  compact?: boolean;
}) {
  return (
    <Link
      href={document.roomId === "vault" ? "/vault" : `/room/${document.roomId}`}
      className={`block shrink-0 rounded-[1.25rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06))] p-4 shadow-lg shadow-black/15 ${
        compact ? "w-56" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-zinc-950">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold">{document.title}</h3>
          <p className="mt-1 text-xs text-zinc-300">
            {document.roomName} · {document.category}
          </p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{document.summary}</p>
        </div>
      </div>
    </Link>
  );
}

function mapCategoryToDrawer(document: StoredDocument) {
  const text = `${document.category} ${document.title} ${document.roomName}`.toLowerCase();
  if (/(identity|passport|licence|birth|medical|qualification)/.test(text)) return ["Identity", "Family"];
  if (/(home|property|mortgage|utilities|boiler|warranty)/.test(text)) return ["Property", "Family"];
  if (/(finance|pension|bank|investment|contract)/.test(text)) return ["Finance"];
  if (/(legal|will|power|attorney|life|legacy|funeral)/.test(text)) return ["Legal", "Emergency"];
  if (/(emergency|insurance|mot|tax|service)/.test(text)) return ["Emergency"];
  return ["Family"];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}
