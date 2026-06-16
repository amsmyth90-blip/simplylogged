"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, ChevronDown, FileText, LockKeyhole, Plus, Search, Trash2 } from "lucide-react";
import { EstateCard, InternalPageShell } from "@/components/InternalPageShell";
import { Toast } from "@/components/Toast";
import { confirmDelete } from "@/lib/confirmations";
import { roomOptions } from "@/lib/mock-data";
import { deleteDocument, getDocuments } from "@/lib/supabase/documents";
import type { StoredDocument } from "@/lib/storage";

const drawers = ["Identity", "Property", "Finance", "Legal", "Emergency", "Family"];
const categories = ["all", ...drawers];

export default function VaultPage() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [query, setQuery] = useState("");
  const [roomId, setRoomId] = useState("all");
  const [category, setCategory] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState<StoredDocument | null>(null);
  const [toast, setToast] = useState("");
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
      const categoryMatches = category === "all" || mapCategoryToDrawer(document).includes(category);
      const textMatches =
        !normalizedQuery ||
        [document.title, document.category, document.provider, document.roomName]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return roomMatches && categoryMatches && textMatches;
    });
  }, [documents, query, roomId, category]);

  const readiness = Math.min(98, 58 + documents.length * 7);
  const recentlyAdded = [...documents]
    .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))
    .slice(0, 4);

  async function removeDocument(document: StoredDocument) {
    if (!confirmDelete(document.title)) return;
    try {
      await deleteDocument(document.id);
      setSelectedDocument(null);
      setDocuments(await getDocuments());
      setToast("Document deleted.");
    } catch {
      setToast("Could not delete the document. Please try again.");
    }
  }

  return (
    <InternalPageShell
      icon={Archive}
      eyebrow="Estate safe"
      title="Vault"
      subtitle="Protected documents, drawers, and recently filed estate records."
      action={
        <Link href="/add" className="grid h-11 w-11 place-items-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-300" aria-label="Add document">
            <Plus className="h-5 w-5" />
          </Link>
      }
    >
        <EstateCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-stone-500">Estate Readiness</p>
              <h2 className="mt-1 text-3xl font-bold text-emerald-700">{readiness}%</h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Very Good</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${readiness}%` }} />
          </div>
        </EstateCard>

        <section className="mt-4 grid gap-3">
          <label className="flex min-h-12 items-center gap-2 rounded-[1.2rem] bg-white px-4 shadow-sm shadow-stone-200">
            <Search className="h-5 w-5 text-stone-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vault"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-stone-400"
            />
          </label>
          <select
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            className="min-h-12 rounded-[1.2rem] bg-white px-4 text-base font-bold shadow-sm shadow-stone-200 outline-none"
          >
            <option value="all">All rooms</option>
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-12 rounded-[1.2rem] bg-white px-4 text-base font-bold shadow-sm shadow-stone-200 outline-none"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All categories" : item}
              </option>
            ))}
          </select>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          {drawers.map((drawer) => {
            const drawerDocs = filteredDocuments.filter((document) => mapCategoryToDrawer(document).includes(drawer));
            return (
              <button
                key={drawer}
                onClick={() => setOpenDrawers((current) => ({ ...current, [drawer]: !current[drawer] }))}
                className="min-h-24 rounded-[1.2rem] bg-white p-3 text-left shadow-sm shadow-stone-200"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <LockKeyhole className="h-4 w-4" />
                </span>
                <h3 className="mt-3 text-sm font-bold">{drawer}</h3>
                <p className="mt-1 text-sm text-stone-500">{drawerDocs.length} docs</p>
              </button>
            );
          })}
        </section>

        <section className="mt-5">
          <h2 className="text-xl font-bold">Vault Drawers</h2>
          <div className="mt-3 space-y-3">
            {drawers.map((drawer) => {
              const drawerDocs = filteredDocuments.filter((document) => mapCategoryToDrawer(document).includes(drawer));
              const isOpen = openDrawers[drawer] ?? false;
              return (
                <article key={drawer} className="overflow-hidden rounded-[1.25rem] bg-white shadow-sm shadow-stone-200">
                  <button
                    onClick={() => setOpenDrawers((current) => ({ ...current, [drawer]: !current[drawer] }))}
                    className="flex min-h-14 w-full items-center justify-between px-4 text-left"
                  >
                    <div>
                      <h3 className="font-bold">{drawer}</h3>
                      <p className="text-sm text-stone-500">{drawerDocs.length} documents</p>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-stone-400 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen ? (
                    <div className="space-y-2 border-t border-stone-100 p-3">
                      {drawerDocs.length ? (
                        drawerDocs.map((document) => (
                          <DocumentCard key={document.id} document={document} onOpen={() => setSelectedDocument(document)} />
                        ))
                      ) : (
                        <EmptyDrawer />
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <EstateCard className="bg-[#28231d] text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Recently Added</h2>
              <p className="text-sm text-white/60">{recentlyAdded.length || documents.length} new documents</p>
            </div>
            <Archive className="h-5 w-5 text-amber-200" />
          </div>
          <div className="mt-3 space-y-2">
            {(recentlyAdded.length ? recentlyAdded : documents.slice(0, 2)).map((document) => (
              <DocumentCard
                key={`recent-${document.id}`}
                document={document}
                dark
                onOpen={() => setSelectedDocument(document)}
              />
            ))}
            {!documents.length ? (
              <div className="rounded-2xl bg-white/10 p-3 text-sm text-white/70">
                <p>Add a document to open your first drawer.</p>
                <Link href="/add" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-bold text-stone-950">
                  Add Document
                </Link>
              </div>
            ) : null}
          </div>
        </EstateCard>

      {selectedDocument ? (
        <DocumentModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onDelete={() => removeDocument(selectedDocument)}
        />
      ) : null}
      <Toast message={toast} tone={toast.startsWith("Could") ? "error" : "success"} />
    </InternalPageShell>
  );
}

function DocumentCard({
  document,
  dark = false,
  onOpen,
}: {
  document: StoredDocument;
  dark?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl p-3 text-left ${dark ? "bg-white/10 text-white" : "bg-[#fbf7ef] text-[#261c14]"}`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
        <FileText className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold">{document.title}</h3>
        <p className={`truncate text-sm ${dark ? "text-white/60" : "text-stone-500"}`}>
          {document.roomName} - {document.category}
        </p>
      </div>
    </button>
  );
}

function DocumentModal({
  document,
  onClose,
  onDelete,
}: {
  document: StoredDocument;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-black/35 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
      <section className="max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Vault document</p>
            <h2 className="mt-1 truncate text-xl font-bold">{document.title}</h2>
            <p className="mt-1 text-sm text-stone-500">{document.roomName}</p>
          </div>
          <button onClick={onClose} className="min-h-11 rounded-full bg-stone-100 px-4 text-sm font-bold">
            Close
          </button>
        </div>
        <div className="mt-4 grid gap-2 text-sm">
          <p className="rounded-2xl bg-[#fbf7ef] p-3"><strong>Category:</strong> {document.category || "Uncategorised"}</p>
          <p className="rounded-2xl bg-[#fbf7ef] p-3"><strong>Provider:</strong> {document.provider || "Not set"}</p>
          <p className="rounded-2xl bg-[#fbf7ef] p-3"><strong>Expiry:</strong> {document.expiryDate || "Not set"}</p>
          <p className="rounded-2xl bg-[#fbf7ef] p-3 leading-6">{document.summary || "No summary saved."}</p>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_44px] gap-2">
          <Link
            href={document.roomId === "vault" ? "/vault" : `/room/${document.roomId}`}
            className="grid min-h-11 place-items-center rounded-full bg-stone-950 px-4 text-sm font-bold text-white"
          >
            Open room
          </Link>
          <button
            onClick={onDelete}
            className="grid min-h-11 place-items-center rounded-full bg-rose-100 text-rose-700"
            aria-label={`Delete ${document.title}`}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </section>
    </div>
  );
}

function EmptyDrawer() {
  return (
    <div className="rounded-2xl bg-[#fbf7ef] p-4 text-sm text-stone-500">
      This drawer is ready for its first document.
    </div>
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
