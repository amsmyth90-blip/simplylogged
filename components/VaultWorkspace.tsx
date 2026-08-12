"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { DiaryDockDataProvider, useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { PageHeader } from "@/components/PageHeader";
import { ReminderCard } from "@/components/ReminderCard";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { remindersList, vaultCategories, vaultSecurity, type VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument } from "@/lib/structured-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type VaultWorkspaceProps = {
  initialDocuments: VaultDocument[];
};

type VaultFilter = "all" | "needs-review" | "shared" | "emergency" | "starred";
type VaultSort = "newest" | "category" | "due-date" | "title";

type VaultDraft = {
  title: string;
  category: string;
  kind: VaultDocument["kind"];
  size: string;
  sharedWith: string[];
  emergencyVisible: boolean;
  starred: boolean;
};

const defaultDraft: VaultDraft = {
  title: "",
  category: "Identity",
  kind: "PDF",
  size: "",
  sharedWith: [],
  emergencyVisible: false,
  starred: false
};

function buildDraft(document?: VaultDocument): VaultDraft {
  if (!document) {
    return defaultDraft;
  }

  return {
    title: document.title,
    category: document.category,
    kind: document.kind,
    size: document.size,
    sharedWith: document.sharedWith ?? [],
    emergencyVisible: Boolean(document.emergencyVisible),
    starred: Boolean(document.starred)
  };
}

function recencyRank(document: VaultDocument) {
  const value = document.updated.toLowerCase();

  if (value.includes("just now")) return 0;
  if (value.includes("today")) return 1;
  if (value.includes("yesterday")) return 2;
  if (value.includes("week")) return 3;
  if (value.includes("month")) return 4;

  return 5;
}

function VaultWorkspaceInner() {
  const { state, repositoryMode, updateState } = useDiaryDockData();
  const documents = state.vaultDocuments;
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<VaultFilter>("all");
  const [sortBy, setSortBy] = useState<VaultSort>("newest");
  const [selectedId, setSelectedId] = useState(documents[0]?.id ?? "");
  const [draft, setDraft] = useState<VaultDraft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const shareOptions = useMemo(
    () => state.householdMembers.filter((member) => member.accessTone !== "full" || member.name !== "Amy"),
    [state.householdMembers]
  );

  const secureQueue = remindersList
    .filter((item) => item.roomId === "office" || item.roomId === "safe-room")
    .slice(0, 3);
  const reviewQueue = documents.filter((document) => document.reviewStatus === "needs-review");
  const sharedQueue = documents.filter((document) => document.sharedWith?.length);
  const emergencyQueue = documents.filter((document) => document.emergencyVisible);

  const filterOptions: { id: VaultFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: documents.length },
    { id: "needs-review", label: "Needs review", count: reviewQueue.length },
    { id: "shared", label: "Shared", count: sharedQueue.length },
    { id: "emergency", label: "Emergency", count: emergencyQueue.length },
    { id: "starred", label: "Starred", count: documents.filter((document) => document.starred).length }
  ];

  const filteredDocuments = useMemo(() => {
    const filtered = documents.filter((document) => {
      const matchesCategory = selectedCategory === "all" || document.category === selectedCategory;
      const matchesFilter =
        selectedFilter === "all" ||
        (selectedFilter === "needs-review" && document.reviewStatus === "needs-review") ||
        (selectedFilter === "shared" && Boolean(document.sharedWith?.length)) ||
        (selectedFilter === "emergency" && Boolean(document.emergencyVisible)) ||
        (selectedFilter === "starred" && Boolean(document.starred));
      const haystack = [
        document.title,
        document.category,
        document.kind,
        document.roomName,
        document.issuer,
        document.dueDate,
        document.extractionSummary,
        document.extractedText
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = haystack.includes(query.trim().toLowerCase());
      return matchesCategory && matchesFilter && matchesQuery;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "category") {
        return `${a.category}${a.title}`.localeCompare(`${b.category}${b.title}`);
      }

      if (sortBy === "due-date") {
        return (a.dueDate || "zzzz").localeCompare(b.dueDate || "zzzz");
      }

      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }

      return recencyRank(a) - recencyRank(b);
    });
  }, [documents, query, selectedCategory, selectedFilter, sortBy]);

  const selectedDocument =
    filteredDocuments.find((document) => document.id === selectedId) ?? filteredDocuments[0] ?? null;
  const starred = filteredDocuments.filter((document) => document.starred);

  const categoryCounts = useMemo(() => {
    return vaultCategories.map((category) => ({
      ...category,
      count: documents.filter((document) => document.category === category.name).length
    }));
  }, [documents]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(defaultDraft);
    setOpen(true);
  };

  const openEdit = (document: VaultDocument) => {
    setEditingId(document.id);
    setDraft(buildDraft(document));
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setDraft(defaultDraft);
  };

  const saveDocument = () => {
    const title = draft.title.trim();
    if (!title) {
      return;
    }

    const existingDocument = editingId ? documents.find((document) => document.id === editingId) : null;
    const nextDocument: VaultDocument = {
      ...existingDocument,
      id: editingId ?? `v${Date.now()}`,
      title,
      category: draft.category,
      kind: draft.kind,
      size: draft.size.trim() || "Pending upload",
      updated: "Just now",
      sharedWith: draft.sharedWith,
      emergencyVisible: draft.emergencyVisible,
      starred: draft.starred
    };

    updateState((current) => ({
      ...current,
      vaultDocuments: editingId
        ? current.vaultDocuments.map((document) => (document.id === editingId ? nextDocument : document))
        : [nextDocument, ...current.vaultDocuments]
    }));

    void upsertStructuredDocument(nextDocument);
    setSelectedId(nextDocument.id);
    closeModal();
  };

  const openStoredFile = async (document: VaultDocument) => {
    if (!document.storageBucket || !document.storagePath) {
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setFileMessage("Supabase storage is not available in this session.");
      return;
    }

    setOpeningFileId(document.id);
    setFileMessage(null);

    const { data, error } = await client.storage
      .from(document.storageBucket)
      .createSignedUrl(document.storagePath, 60);

    setOpeningFileId(null);

    if (error || !data?.signedUrl) {
      setFileMessage(error?.message ?? "DiaryDock could not open the stored file yet.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const updateDocument = (nextDocument: VaultDocument) => {
    updateState((current) => ({
      ...current,
      vaultDocuments: current.vaultDocuments.map((document) =>
        document.id === nextDocument.id ? nextDocument : document
      )
    }));

    void upsertStructuredDocument(nextDocument);
  };

  const toggleSelectedFlag = (flag: "starred" | "emergencyVisible") => {
    if (!selectedDocument) {
      return;
    }

    updateDocument({
      ...selectedDocument,
      [flag]: !selectedDocument[flag],
      updated: "Just now"
    });
  };

  const markSelectedReviewed = () => {
    if (!selectedDocument) {
      return;
    }

    updateDocument({
      ...selectedDocument,
      reviewStatus: "reviewed",
      reviewReasons: [],
      reviewedAt: "Just now",
      updated: "Just now"
    });
  };

  return (
    <>
      <div className="immersive-page">
        <PageHeader
          eyebrow="All files"
          title="All Files"
          subtitle="Every document, securely stored in one place."
          heroImage="/images/pages/vault-hero.webp"
          heroPosition="center 44%"
          badge="Secure archive"
          action={
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-white/30 bg-white/14 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md sm:inline-flex">
                {repositoryMode === "supabase" ? "Supabase live" : "Session demo"}
              </span>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/16 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md transition hover:bg-white/22"
              >
                <UiIcon name="plus" className="h-4 w-4" />
                Add file
              </button>
            </div>
          }
        />

        <label className="estate-sheet flex items-center gap-3 px-4 py-3">
          <UiIcon name="search" className="h-5 w-5 shrink-0 text-ink/35" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search passports, policies, deeds..."
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
          />
        </label>

        <section className="estate-sheet p-3">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedFilter(filter.id)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  selectedFilter === filter.id
                    ? "bg-ink text-white shadow-soft"
                    : "border border-white/70 bg-white/62 text-ink/58 hover:bg-white"
                }`}
              >
                {filter.label}
                <span className={selectedFilter === filter.id ? "ml-1 text-white/72" : "ml-1 text-ink/38"}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 px-1 py-1">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">Sort documents</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as VaultSort)}
              className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-ink/62 outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="category">Category</option>
              <option value="due-date">Due date</option>
              <option value="title">Title</option>
            </select>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Categories" hint={`${documents.length} documents across your secure collections`} />
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`estate-sheet flex w-36 shrink-0 items-center gap-2.5 px-3 py-2.5 text-left transition ${
                selectedCategory === "all" ? "ring-1 ring-moss/30" : ""
              }`}
            >
              <div className="flex shrink-0 items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mist text-ink/60">
                  <UiIcon name="folder" className="h-5 w-5" />
                </span>
                <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-ink/55">
                  {documents.length}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">All documents</p>
                <p className="hidden">Everything currently stored in DiaryDock</p>
              </div>
            </button>

            {categoryCounts.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.name)}
                className={`estate-sheet flex w-36 shrink-0 items-center gap-2.5 px-3 py-2.5 text-left transition ${
                  selectedCategory === category.name ? "ring-1 ring-moss/30" : ""
                }`}
              >
                <div className="flex shrink-0 items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mist text-ink/60">
                    <UiIcon name={category.icon as IconName} className="h-5 w-5" />
                  </span>
                  <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-ink/55">
                    {category.count}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{category.name}</p>
                  <p className="hidden">{category.note}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3">
          <div className="space-y-4">
            <section className="hidden">
              {[
                { label: "Needs review", value: reviewQueue.length, icon: "alert" as IconName, tone: "bg-amber-100 text-amber-700" },
                { label: "Shared", value: sharedQueue.length, icon: "share" as IconName, tone: "bg-mist text-sky-700" },
                { label: "Emergency", value: emergencyQueue.length, icon: "shield" as IconName, tone: "bg-blush text-orange-700" }
              ].map((queue) => (
                <button
                  key={queue.label}
                  type="button"
                  onClick={() =>
                    setSelectedFilter(
                      queue.label === "Needs review" ? "needs-review" : queue.label === "Shared" ? "shared" : "emergency"
                    )
                  }
                  className="estate-sheet flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${queue.tone}`}>
                    <UiIcon name={queue.icon} className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-xl font-semibold tracking-tight text-ink">{queue.value}</span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">{queue.label}</span>
                  </span>
                </button>
              ))}
            </section>

            <section className="estate-sheet divide-y divide-white/60 overflow-hidden">
              {filteredDocuments.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon="folder"
                    title="No matches yet"
                    message="Try another search term or add a new document to this category."
                  />
                </div>
              ) : (
                filteredDocuments.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => { window.location.href = `/document/${document.id}`; }}
                    className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-white/60 ${
                      selectedDocument?.id === document.id ? "bg-white/45" : ""
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist text-[10px] font-bold text-ink/70">
                      {document.kind}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-ink">{document.title}</span>
                        {document.starred ? <UiIcon name="star" className="h-3.5 w-3.5 shrink-0 text-gold" /> : null}
                        {document.emergencyVisible ? (
                          <span className="shrink-0 rounded-full bg-blush px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                            Emergency
                          </span>
                        ) : null}
                        {document.reviewStatus === "needs-review" ? (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            Review
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink/50">
                        {document.category} - {document.size} - Updated {document.updated.toLowerCase()}
                      </span>
                    </span>
                    <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/25" />
                  </button>
                ))
              )}
            </section>

            <section className="hidden">
              <SectionHeader title="Starred" hint="Pinned for quick access" />
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {starred.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => { window.location.href = `/document/${document.id}`; }}
                    className="estate-sheet w-44 shrink-0 p-4 text-left transition hover:-translate-y-0.5"
                  >
                    <div className="flex shrink-0 items-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist text-[10px] font-bold text-ink/70">
                        {document.kind}
                      </span>
                      <UiIcon name="star" className="h-4 w-4 text-gold" />
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-snug text-ink">{document.title}</p>
                    <p className="mt-1 text-xs text-ink/50">{document.category}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="hidden">
            {reviewQueue.length ? (
              <section className="estate-sheet p-5">
                <SectionHeader title="Needs review" hint={`${reviewQueue.length} AI capture${reviewQueue.length === 1 ? "" : "s"} to check`} />
                <div className="mt-4 space-y-3">
                  {reviewQueue.slice(0, 4).map((document) => (
                    <Link
                      key={document.id}
                      href={`/document/${document.id}`}
                      className="flex items-center gap-3 rounded-2xl bg-amber-50/85 px-3.5 py-3 text-left transition hover:bg-amber-50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-amber-700">
                        <UiIcon name="alert" className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{document.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-ink/52">
                          {document.reviewReasons?.[0] ?? "Check AI filing details"}
                        </span>
                      </span>
                      <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="estate-sheet p-5">
              <SectionHeader title="Selected document" hint="Shared with rooms and mailbox routes" />
              {selectedDocument ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-[30px] bg-[linear-gradient(180deg,rgba(255,252,248,0.88),rgba(255,248,240,0.72))] p-4 shadow-[0_22px_48px_-34px_rgba(54,44,24,0.26)]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mist text-ink/60">
                        <UiIcon name="file" className="h-5 w-5" />
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedDocument.reviewStatus === "needs-review" ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
                            Needs review
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openEdit(selectedDocument)}
                          className="rounded-full border border-black/10 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-white"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">{selectedDocument.title}</h3>
                    <p className="mt-1 text-sm text-ink/55">{selectedDocument.category}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectedFlag("starred")}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          selectedDocument.starred ? "bg-gold/30 text-yellow-800" : "border border-white/70 bg-white/80 text-ink/58"
                        }`}
                      >
                        {selectedDocument.starred ? "Starred" : "Star"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSelectedFlag("emergencyVisible")}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          selectedDocument.emergencyVisible ? "bg-blush text-orange-700" : "border border-white/70 bg-white/80 text-ink/58"
                        }`}
                      >
                        {selectedDocument.emergencyVisible ? "Emergency visible" : "Mark emergency"}
                      </button>
                      {selectedDocument.reviewStatus === "needs-review" ? (
                        <button
                          type="button"
                          onClick={markSelectedReviewed}
                          className="rounded-full bg-sage/65 px-3 py-1.5 text-xs font-semibold text-moss transition hover:bg-sage"
                        >
                          Mark reviewed
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white/80 px-3.5 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">File type</p>
                        <p className="mt-1 font-semibold text-ink">{selectedDocument.kind}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3.5 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">Size</p>
                        <p className="mt-1 font-semibold text-ink">{selectedDocument.size}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3.5 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">Updated</p>
                        <p className="mt-1 font-semibold text-ink">{selectedDocument.updated}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3.5 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                          Shared with
                        </p>
                        <p className="mt-1 font-semibold text-ink">
                          {selectedDocument.sharedWith?.join(", ") || "Private"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3.5 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">Emergency</p>
                        <p className="mt-1 font-semibold text-ink">
                          {selectedDocument.emergencyVisible ? "Visible" : "Hidden"}
                        </p>
                      </div>
                    </div>
                    {selectedDocument.storagePath ? (
                      <div className="mt-3 rounded-2xl border border-moss/15 bg-sage/35 px-3.5 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-moss">Original file stored</p>
                            <p className="mt-0.5 truncate text-xs text-ink/50">
                              {selectedDocument.originalFileName ?? "Private DiaryDock file"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void openStoredFile(selectedDocument)}
                            className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-white"
                          >
                            {openingFileId === selectedDocument.id ? "Opening..." : "Open"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {selectedDocument.extractionSummary ? (
                      <div className="mt-3 rounded-2xl bg-white/70 px-3.5 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                          AI summary
                        </p>
                        <p className="mt-1 text-sm leading-6 text-ink/62">{selectedDocument.extractionSummary}</p>
                      </div>
                    ) : null}
                    {fileMessage ? (
                      <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                        {fileMessage}
                      </div>
                    ) : null}
                    <Link
                      href={`/document/${selectedDocument.id}`}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
                    >
                      Open document details
                      <UiIcon name="chevron-right" className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    icon="file"
                    title="Choose a document"
                    message="Select a record from the list to inspect or edit its details."
                  />
                </div>
              )}
            </section>

            <section className="estate-sheet p-5">
              <SectionHeader title="Security posture" hint="The calm checks behind the scenes" />
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage/60 text-moss">
                    <UiIcon name="shield" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{vaultSecurity.encryption}</p>
                    <p className="mt-0.5 text-xs text-ink/55">
                      Backed up {vaultSecurity.lastBackup.toLowerCase()} - {vaultSecurity.devices} trusted devices
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-ink/55">
                    <span>{vaultSecurity.storageUsed} used</span>
                    <span>{vaultSecurity.storageTotal}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-moss to-sage"
                      style={{ width: `${vaultSecurity.storagePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="estate-sheet p-5">
              <SectionHeader title="Secure queue" hint="Related reminders waiting for attention" />
              <div className="mt-4 space-y-3">
                {secureQueue.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} compact href="/reminders" />
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>

      <ModalShell
        open={open}
        title={editingId ? "Edit document" : "Add document"}
        subtitle="Shared with rooms and mailbox routing through the DiaryDock data layer."
        onClose={closeModal}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveDocument}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
            >
              Save document
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Passport scan bundle"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Category</span>
              <select
                value={draft.category}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              >
                {vaultCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Document type</span>
              <select
                value={draft.kind}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    kind: event.target.value as VaultDocument["kind"]
                  }))
                }
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              >
                <option value="PDF">PDF</option>
                <option value="Scan">Scan</option>
                <option value="Note">Note</option>
                <option value="Image">Image</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">File size</span>
              <input
                type="text"
                value={draft.size}
                onChange={(event) => setDraft((current) => ({ ...current, size: event.target.value }))}
                placeholder="1.2 MB"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink">Who can see this?</span>
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-ink/45">
                  {draft.sharedWith.length ? `${draft.sharedWith.length} selected` : "Private"}
                </span>
              </div>
              <div className="grid gap-2">
                {shareOptions.map((member) => {
                  const checked = draft.sharedWith.includes(member.name);

                  return (
                    <label
                      key={member.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 transition ${
                        checked
                          ? "border-moss/30 bg-sage/55 shadow-[0_16px_30px_-24px_rgba(50,80,56,0.42)]"
                          : "border-black/10 bg-white/72 hover:bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            sharedWith: event.target.checked
                              ? [...current.sharedWith, member.name]
                              : current.sharedWith.filter((name) => name !== member.name)
                          }))
                        }
                        className="h-4 w-4 rounded border-black/20 text-moss"
                      />
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/82 text-xs font-semibold text-ink/62">
                        {member.initials}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{member.name}</span>
                        <span className="block truncate text-xs text-ink/45">{member.access}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
            <input
              type="checkbox"
              checked={draft.starred}
              onChange={(event) => setDraft((current) => ({ ...current, starred: event.target.checked }))}
              className="h-4 w-4 rounded border-black/20 text-ink"
            />
            <span className="text-sm font-medium text-ink">Pin this document to Starred</span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
            <input
              type="checkbox"
              checked={draft.emergencyVisible}
              onChange={(event) => setDraft((current) => ({ ...current, emergencyVisible: event.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-black/20 text-moss"
            />
            <span>
              <span className="block text-sm font-medium text-ink">Show in Emergency Access Mode</span>
              <span className="mt-0.5 block text-xs leading-5 text-ink/45">
                Makes this document available in the limited emergency view.
              </span>
            </span>
          </label>
        </div>
      </ModalShell>
    </>
  );
}

export function VaultWorkspace(_: VaultWorkspaceProps) {
  return <VaultWorkspaceInner />;
}
