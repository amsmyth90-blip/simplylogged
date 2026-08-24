"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ModalShell } from "@/components/ModalShell";
import { PageHeader } from "@/components/PageHeader";
import { ReminderCard } from "@/components/ReminderCard";
import { UiIcon } from "@/components/UiIcon";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { documentCategoryOptions } from "@/lib/document-extraction";
import { roomDetails, type Reminder, type VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument, upsertStructuredReminder } from "@/lib/structured-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type DocumentDetailWorkspaceProps = {
  documentId: string;
  backHref?: string;
  backLabel?: string;
};

type DocumentCorrectionDraft = {
  title: string;
  issuer: string;
  category: string;
  roomId: string;
  dueDate: string;
  extractionSummary: string;
  extractedText: string;
  actionItems: string;
  sharedWith: string[];
  emergencyVisible: boolean;
};

function buildDraft(document: VaultDocument): DocumentCorrectionDraft {
  return {
    title: document.title,
    issuer: document.issuer ?? "",
    category: document.category,
    roomId: document.roomId ?? "",
    dueDate: document.dueDate ?? "",
    extractionSummary: document.extractionSummary ?? "",
    extractedText: document.extractedText ?? "",
    actionItems: document.actionItems?.join("\n") ?? "",
    sharedWith: document.sharedWith ?? [],
    emergencyVisible: Boolean(document.emergencyVisible)
  };
}

export function DocumentDetailWorkspace({
  documentId,
  backHref = "/files",
  backLabel = "All Files"
}: DocumentDetailWorkspaceProps) {
  const { state, hydrated, updateState } = useDiaryDockData();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DocumentCorrectionDraft | null>(null);

  const document = state.vaultDocuments.find((item) => item.id === documentId) ?? null;
  const roomOptions = useMemo(
    () =>
      Object.values(roomDetails)
        .map((room) => ({ id: room.id, name: room.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const shareOptions = useMemo(
    () => state.householdMembers,
    [state.householdMembers]
  );
  const linkedReminders = useMemo(() => {
    if (!document) {
      return [];
    }

    return state.reminders
      .filter((item) => item.documentId === document.id || (!item.documentId && (item.roomId === document.roomId || item.title === document.title)))
      .slice(0, 3);
  }, [document, state.reminders]);

  useEffect(() => {
    let cancelled = false;

    async function createPreviewUrl() {
      setSignedUrl(null);
      setFileMessage(null);

      if (!document?.storageBucket || !document.storagePath) {
        return;
      }

      const client = getSupabaseBrowserClient();
      if (!client) {
        setFileMessage("Supabase storage is not available in this session.");
        return;
      }

      const { data, error } = await client.storage
        .from(document.storageBucket)
        .createSignedUrl(document.storagePath, 300);

      if (cancelled) {
        return;
      }

      if (error || !data?.signedUrl) {
        setFileMessage(error?.message ?? "DiaryDock could not load the stored file preview.");
        return;
      }

      setSignedUrl(data.signedUrl);
    }

    void createPreviewUrl();

    return () => {
      cancelled = true;
    };
  }, [document?.storageBucket, document?.storagePath]);

  const openStoredFile = async () => {
    if (!document?.storageBucket || !document.storagePath) {
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setFileMessage("Supabase storage is not available in this session.");
      return;
    }

    setIsOpening(true);
    setFileMessage(null);

    const { data, error } = await client.storage
      .from(document.storageBucket)
      .createSignedUrl(document.storagePath, 60);

    setIsOpening(false);

    if (error || !data?.signedUrl) {
      setFileMessage(error?.message ?? "DiaryDock could not open the stored file.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const markReviewed = async () => {
    if (!document) {
      return;
    }

    const reviewedDocument: VaultDocument = {
      ...document,
      reviewStatus: "reviewed",
      reviewReasons: [],
      reviewedAt: "Just now",
      updated: "Just now"
    };

    updateState((current) => ({
      ...current,
      vaultDocuments: current.vaultDocuments.map((item) =>
        item.id === documentId ? reviewedDocument : item
      )
    }));

    await upsertStructuredDocument(reviewedDocument);
  };

  const openCorrection = () => {
    if (!document) {
      return;
    }

    setDraft(buildDraft(document));
    setEditing(true);
  };

  const closeCorrection = () => {
    setEditing(false);
    setDraft(null);
  };

  const saveCorrection = async () => {
    if (!document || !draft) {
      return;
    }

    const title = draft.title.trim();
    if (!title) {
      return;
    }

    const nextRoom = draft.roomId ? roomDetails[draft.roomId] : null;
    const previousRoomId = document.roomId;
    const nextActionItems = draft.actionItems
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const sharedWith = draft.sharedWith;

    let nextStructuredDocument: VaultDocument | null = null;
    let nextStructuredReminders: Reminder[] = [];

    updateState((current) => {
      const correctedDocument: VaultDocument = {
        ...document,
        title,
        issuer: draft.issuer.trim() || undefined,
        category: draft.category,
        roomId: nextRoom?.id,
        roomName: nextRoom?.name,
        dueDate: draft.dueDate.trim(),
        extractionSummary: draft.extractionSummary.trim() || undefined,
        extractedText: draft.extractedText.trim() || undefined,
        actionItems: nextActionItems,
        sharedWith,
        emergencyVisible: draft.emergencyVisible,
        reviewStatus: "reviewed",
        reviewReasons: [],
        reviewedAt: "Just now",
        updated: "Just now"
      };
      nextStructuredDocument = correctedDocument;

      const roomDocuments = { ...current.roomDocuments };

      if (previousRoomId) {
        roomDocuments[previousRoomId] = (roomDocuments[previousRoomId] ?? []).filter(
          (item) => item.id !== `${previousRoomId}-${document.id}` && item.title !== document.title
        );
      }

      if (nextRoom) {
        const nextRoomDocument = {
          id: `${nextRoom.id}-${document.id}`,
          title,
          kind: document.kind,
          size: document.size,
          updated: "Just now"
        };

        roomDocuments[nextRoom.id] = [
          nextRoomDocument,
          ...(roomDocuments[nextRoom.id] ?? []).filter((item) => item.id !== nextRoomDocument.id)
        ];
      }

      const reminders = current.reminders.map((reminder) =>
        reminder.documentId === document.id
          ? {
              ...reminder,
              documentTitle: title,
              roomId: nextRoom?.id,
              roomName: nextRoom?.name
            }
          : reminder
      );
      nextStructuredReminders = reminders.filter((reminder) => reminder.documentId === document.id);

      return {
        ...current,
        vaultDocuments: current.vaultDocuments.map((item) => (item.id === document.id ? correctedDocument : item)),
        roomDocuments,
        roomActivity: nextRoom
          ? {
              ...current.roomActivity,
              [nextRoom.id]: [
                {
                  id: `${nextRoom.id}-correction-${Date.now()}`,
                  text:
                    previousRoomId && previousRoomId !== nextRoom.id
                      ? `Moved and corrected ${title}`
                      : `Corrected document details for ${title}`,
                  when: "Just now",
                  by: "You"
                },
                ...(current.roomActivity[nextRoom.id] ?? [])
              ]
            }
          : current.roomActivity,
        reminders,
        mailboxItems: current.mailboxItems.map((item) =>
          item.title === document.title
            ? {
                ...item,
                title,
                source: draft.issuer.trim() || item.source,
                suggestedRoom: nextRoom?.name ?? item.suggestedRoom
              }
            : item
        )
      };
    });

    if (nextStructuredDocument) {
      await upsertStructuredDocument(nextStructuredDocument);
    }

    await Promise.all(nextStructuredReminders.map((reminder) => upsertStructuredReminder(reminder)));

    closeCorrection();
  };

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Secure document" title="Loading document" backHref={backHref} backLabel={backLabel} />
        <div className="estate-sheet p-5 text-sm text-ink/55">Loading your secure document details...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Secure document" title="Document not found" backHref={backHref} backLabel={backLabel} />
        <EmptyState
          icon="file"
          title="This document is not in All Files"
          message="It may have been removed, or the app is still syncing your account."
          action={
            <Link href={backHref} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
              Back to {backLabel}
            </Link>
          }
        />
      </div>
    );
  }

  const isImage = document.mimeType?.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";
  const needsReview = document.reviewStatus === "needs-review";
  const filingDetails = [
    { label: "Room", value: document.roomName ?? "All Files only" },
    { label: "Category", value: document.category },
    { label: "From", value: document.issuer ?? "Not captured" },
    { label: "Due", value: document.dueDate || "No date" }
  ];

  return (
    <div className="space-y-2.5 pb-4">
      <header className="rounded-[22px] border border-white/70 bg-white/86 p-3 shadow-soft backdrop-blur-md sm:p-3.5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={backHref}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white/82 px-2.5 text-[11px] font-semibold text-ink/70 transition hover:bg-white"
          >
            <UiIcon name="arrow-left" className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCorrection}
              className="inline-flex min-h-9 items-center rounded-full border border-black/10 bg-white/82 px-3 text-[11px] font-semibold text-ink/70 shadow-sm transition hover:bg-white"
            >
              Edit
            </button>
            {document.storagePath ? (
              <button
                type="button"
                onClick={() => void openStoredFile()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-[11px] font-semibold text-white shadow-soft"
              >
                <UiIcon name="file" className="h-3.5 w-3.5" />
                {isOpening ? "Opening" : "Open"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-2.5 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/42">{document.category}</p>
          <h1 className="mt-0.5 line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-ink sm:text-[20px]">
            {document.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-sage/60 px-2.5 py-1 text-[11px] font-semibold text-moss">{document.kind}</span>
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-ink/55">{document.size}</span>
            {document.roomName ? (
              <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-ink/55">{document.roomName}</span>
            ) : null}
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                needsReview ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {needsReview ? "Needs review" : "Reviewed"}
            </span>
          </div>
        </div>
      </header>

      <section className="grid gap-2.5 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-2.5">
          <section className="estate-sheet overflow-hidden p-2.5">
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold tracking-tight text-ink">Original file</h2>
                <p className="truncate text-xs text-ink/45">{document.originalFileName ?? "Stored DiaryDock document"}</p>
              </div>
              {document.storagePath ? (
                <button
                  type="button"
                  onClick={() => void openStoredFile()}
                  className="shrink-0 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-ink/60"
                >
                  Open
                </button>
              ) : null}
            </div>
            <div className="mt-3 overflow-hidden rounded-[20px] border border-white/70 bg-white/62">
              {signedUrl && isImage ? (
                <img src={signedUrl} alt={document.title} className="max-h-[46vh] w-full object-contain sm:max-h-[500px]" />
              ) : signedUrl && isPdf ? (
                <iframe src={signedUrl} title={document.title} className="h-[46vh] min-h-[310px] w-full bg-white sm:h-[500px]" />
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center px-4 py-6 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mist text-ink/45">
                    <UiIcon name="file" className="h-5 w-5" />
                  </span>
                  <p className="mt-2.5 text-sm font-semibold text-ink">
                    {document.storagePath ? "Secure original attached" : "No original file attached yet"}
                  </p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-ink/50">
                    {document.storagePath
                      ? "Open it securely when you need the full document."
                      : "This record currently contains saved details only."}
                  </p>
                </div>
              )}
            </div>
            {fileMessage ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {fileMessage}
              </div>
            ) : null}
          </section>

          {document.extractedText ? (
            <details className="estate-sheet group p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-1 text-sm font-semibold text-ink">
                OCR text
                <span className="rounded-full bg-white/75 px-2.5 py-1 text-[11px] text-ink/45 group-open:hidden">Show</span>
                <span className="hidden rounded-full bg-white/75 px-2.5 py-1 text-[11px] text-ink/45 group-open:inline">Hide</span>
              </summary>
              <p className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-white/70 p-3 text-xs leading-5 text-ink/62">
                {document.extractedText}
              </p>
            </details>
          ) : null}
        </div>

        <div className="space-y-2.5">
          {needsReview ? (
            <section className="estate-sheet border-amber-200/70 bg-amber-50/82 p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-amber-700">
                  <UiIcon name="alert" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink">Please check this</h2>
                  <p className="mt-0.5 text-xs leading-5 text-ink/55">Check the title, room and any dates before saving.</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {(document.reviewReasons?.length ? document.reviewReasons : ["Check AI filing details"]).map((reason) => (
                  <div key={reason} className="flex items-start gap-2 rounded-2xl bg-white/72 px-3 py-2 text-xs leading-5 text-amber-800">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={openCorrection}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/80 px-3 text-sm font-semibold text-ink/70"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void markReviewed()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-3 text-sm font-semibold text-white shadow-soft"
                >
                  <UiIcon name="check" className="h-4 w-4" />
                  Reviewed
                </button>
              </div>
            </section>
          ) : (
            <section className="estate-sheet p-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sage/60 text-moss">
                  <UiIcon name="check" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Reviewed</p>
                  <p className="mt-0.5 text-xs text-ink/55">
                    {document.reviewedAt ? `Checked ${document.reviewedAt.toLowerCase()}` : "No review needed"}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="estate-sheet p-3.5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-tight text-ink">Details</h2>
              <button type="button" onClick={openCorrection} className="text-xs font-semibold text-moss">
                Edit
              </button>
            </div>
            <div className="mt-3 divide-y divide-black/5 overflow-hidden rounded-2xl bg-white/76">
              {filingDetails.map((item) => (
                <div key={item.label} className="grid grid-cols-[82px_1fr] gap-3 px-3 py-2.5 text-sm">
                  <span className="text-xs font-semibold text-ink/42">{item.label}</span>
                  <span className="min-w-0 truncate font-semibold text-ink/78">{item.value}</span>
                </div>
              ))}
            </div>
            {document.roomId ? (
              <Link
                href={`/room/${document.roomId}`}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/78 px-4 text-sm font-semibold text-ink/70"
              >
                Open {document.roomName}
                <UiIcon name="chevron-right" className="h-4 w-4" />
              </Link>
            ) : null}
          </section>

          {document.extractionSummary ? (
            <section className="estate-sheet p-3.5">
              <h2 className="text-sm font-semibold tracking-tight text-ink">Summary</h2>
              <p className="mt-2 text-xs leading-5 text-ink/62">{document.extractionSummary}</p>
            </section>
          ) : null}

          {document.actionItems?.length ? (
            <section className="estate-sheet p-3.5">
              <h2 className="text-sm font-semibold tracking-tight text-ink">Actions</h2>
              <div className="mt-2 space-y-1.5">
                {document.actionItems.map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs leading-5 text-ink/64">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-moss" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {linkedReminders.length ? (
            <section className="estate-sheet p-3.5">
              <h2 className="text-sm font-semibold tracking-tight text-ink">Linked reminders</h2>
              <div className="mt-2 space-y-2">
                {linkedReminders.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} compact href="/reminders" />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <ModalShell
        open={editing}
        title="Correct document"
        subtitle="Update the AI capture, move it to the right room, and save a reviewed record."
        onClose={closeCorrection}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeCorrection}
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveCorrection()}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
            >
              Save corrections
            </button>
          </div>
        }
      >
        {draft ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Title</span>
              <input
                type="text"
                value={draft.title}
                onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Issuer</span>
                <input
                  type="text"
                  value={draft.issuer}
                  onChange={(event) => setDraft((current) => (current ? { ...current, issuer: event.target.value } : current))}
                  placeholder="Insurer, council, school, GP..."
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Due date</span>
                <input
                  type="text"
                  value={draft.dueDate}
                  onChange={(event) => setDraft((current) => (current ? { ...current, dueDate: event.target.value } : current))}
                  placeholder="12 Aug 2026"
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Category</span>
                <select
                  value={draft.category}
                  onChange={(event) => setDraft((current) => (current ? { ...current, category: event.target.value } : current))}
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
                >
                  {documentCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Room</span>
                <select
                  value={draft.roomId}
                  onChange={(event) => setDraft((current) => (current ? { ...current, roomId: event.target.value } : current))}
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
                >
                  <option value="">All Files only</option>
                  {roomOptions.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">AI summary</span>
              <textarea
                value={draft.extractionSummary}
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, extractionSummary: event.target.value } : current))
                }
                rows={3}
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Action items</span>
              <textarea
                value={draft.actionItems}
                onChange={(event) => setDraft((current) => (current ? { ...current, actionItems: event.target.value } : current))}
                rows={4}
                placeholder="One action per line"
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
              <div className="grid gap-2 sm:grid-cols-2">
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
                          setDraft((current) => {
                            if (!current) {
                              return current;
                            }

                            return {
                              ...current,
                              sharedWith: event.target.checked
                                ? [...current.sharedWith, member.name]
                                : current.sharedWith.filter((name) => name !== member.name)
                            };
                          })
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
              <p className="text-xs leading-5 text-ink/45">
                Unticked means private to the main household organisers. These choices are saved as document permissions.
              </p>
            </section>

            <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/72 px-4 py-3">
              <input
                type="checkbox"
                checked={draft.emergencyVisible}
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, emergencyVisible: event.target.checked } : current))
                }
                className="mt-1 h-4 w-4 rounded border-black/20 text-moss"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">Show in Emergency Access Mode</span>
                <span className="mt-0.5 block text-xs leading-5 text-ink/45">
                  Use this only for records trusted people may need in a crisis.
                </span>
              </span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">OCR text</span>
              <textarea
                value={draft.extractedText}
                onChange={(event) => setDraft((current) => (current ? { ...current, extractedText: event.target.value } : current))}
                rows={6}
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
          </div>
        ) : null}
      </ModalShell>
    </div>
  );
}
