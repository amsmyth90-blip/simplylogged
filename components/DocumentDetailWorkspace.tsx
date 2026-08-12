"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ModalShell } from "@/components/ModalShell";
import { PageHeader } from "@/components/PageHeader";
import { ReminderCard } from "@/components/ReminderCard";
import { SectionHeader } from "@/components/SectionHeader";
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
    () => state.householdMembers.filter((member) => member.accessTone !== "full" || member.name !== "Amy"),
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

  const markReviewed = () => {
    updateState((current) => ({
      ...current,
      vaultDocuments: current.vaultDocuments.map((item) =>
        item.id === documentId
          ? {
              ...item,
              reviewStatus: "reviewed",
              reviewReasons: [],
              reviewedAt: "Just now",
              updated: "Just now"
            }
          : item
      )
    }));
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
                  by: "Amy"
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

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={document.category}
        title={document.title}
        subtitle={document.extractionSummary ?? "Secure document details, filing, and AI capture notes."}
        backHref={backHref}
        backLabel={backLabel}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCorrection}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/88 px-4 py-2 text-xs font-semibold text-ink shadow-soft"
            >
              Edit
            </button>
            {document.storagePath ? (
              <button
                type="button"
                onClick={() => void openStoredFile()}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-soft"
              >
                <UiIcon name="file" className="h-3.5 w-3.5" />
                {isOpening ? "Opening" : "Open"}
              </button>
            ) : null}
          </div>
        }
        meta={
          <>
            <span className="estate-chip">{document.kind}</span>
            <span className="estate-chip">{document.size}</span>
            {document.roomName ? <span className="estate-chip">{document.roomName}</span> : null}
            <span className="estate-chip">
              {document.reviewStatus === "needs-review" ? "Needs review" : "Reviewed"}
            </span>
            {document.emergencyVisible ? <span className="estate-chip">Emergency visible</span> : null}
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <section className="estate-sheet overflow-hidden p-4">
            <SectionHeader title="Original file" hint={document.originalFileName ?? "Stored DiaryDock document"} />
            <div className="mt-4 overflow-hidden rounded-[28px] border border-white/70 bg-white/58">
              {signedUrl && isImage ? (
                <img src={signedUrl} alt={document.title} className="max-h-[560px] w-full object-contain" />
              ) : signedUrl && isPdf ? (
                <iframe src={signedUrl} title={document.title} className="h-[560px] w-full bg-white" />
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mist text-ink/45">
                    <UiIcon name="file" className="h-7 w-7" />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-ink">
                    {document.storagePath ? "Secure original attached" : "No original file attached yet"}
                  </p>
                  <p className="mt-1.5 max-w-sm text-sm leading-6 text-ink/55">
                    {document.storagePath
                      ? "Use Open to view the stored original in a secure temporary link."
                      : "Older demo documents have metadata only. New AI captures now store the original file."}
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
            <section className="estate-sheet p-5">
              <SectionHeader title="OCR text" hint="Text DiaryDock read from the document" />
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink/68">{document.extractedText}</p>
            </section>
          ) : null}
        </div>

        <div className="space-y-4">
          {document.reviewStatus === "needs-review" ? (
            <section className="estate-sheet border-amber-200/70 bg-amber-50/72 p-5">
              <SectionHeader title="Needs review" hint="Check the AI capture before trusting these details" />
              <div className="mt-4 space-y-2">
                {(document.reviewReasons?.length ? document.reviewReasons : ["Check AI filing details"]).map((reason) => (
                  <div key={reason} className="flex items-start gap-2 rounded-2xl bg-white/72 px-3.5 py-3 text-sm text-amber-800">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={markReviewed}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft"
              >
                <UiIcon name="check" className="h-4 w-4" />
                Mark as reviewed
              </button>
            </section>
          ) : (
            <section className="estate-sheet p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage/60 text-moss">
                  <UiIcon name="check" className="h-5 w-5" />
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

          <section className="estate-sheet p-5">
            <SectionHeader title="Filing details" hint="Where DiaryDock placed this document" />
            <div className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 ${
              document.reviewStatus === "needs-review"
                ? "border-amber-200/80 bg-amber-50/80 text-amber-900"
                : "border-[#cbd8c5] bg-[#edf3e9]/80 text-[#465b40]"
            }`}>
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/75">
                <UiIcon name={document.reviewStatus === "needs-review" ? "alert" : "check"} className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {document.reviewStatus === "needs-review" ? "Please check these details" : "Details checked"}
                </p>
                <p className="mt-1 text-xs leading-5 opacity-75">
                  {document.reviewStatus === "needs-review"
                    ? "Compare the information below with the original document. Use Edit to correct anything before marking it as reviewed."
                    : "These details have been reviewed. You can still use Edit if anything needs to be updated."}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/76 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">Room</p>
                <p className="mt-1 font-semibold text-ink">{document.roomName ?? "All Files only"}</p>
              </div>
              <div className="rounded-2xl bg-white/76 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">Category</p>
                <p className="mt-1 font-semibold text-ink">{document.category}</p>
              </div>
              <div className="rounded-2xl bg-white/76 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">Issuer</p>
                <p className="mt-1 font-semibold text-ink">{document.issuer ?? "Not captured"}</p>
              </div>
              <div className="rounded-2xl bg-white/76 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">Due date</p>
                <p className="mt-1 font-semibold text-ink">{document.dueDate || "None visible"}</p>
              </div>
              <div className="rounded-2xl bg-white/76 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">Detail check</p>
                <p className="mt-1 font-semibold text-ink">
                  {document.reviewStatus === "needs-review" ? "Please review" : "Checked"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/76 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">Updated</p>
                <p className="mt-1 font-semibold text-ink">{document.updated}</p>
              </div>
            </div>
            {document.roomId ? (
              <Link
                href={`/room/${document.roomId}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/78 px-4 py-3 text-sm font-semibold text-ink/70"
              >
                Open {document.roomName}
                <UiIcon name="chevron-right" className="h-4 w-4" />
              </Link>
            ) : null}
          </section>

          {document.extractionSummary ? (
            <section className="estate-sheet p-5">
              <SectionHeader title="AI summary" hint="Captured during mobile intake" />
              <p className="mt-4 text-sm leading-7 text-ink/68">{document.extractionSummary}</p>
            </section>
          ) : null}

          {document.actionItems?.length ? (
            <section className="estate-sheet p-5">
              <SectionHeader title="Action items" hint="Suggested follow-up from the scan" />
              <div className="mt-4 space-y-2">
                {document.actionItems.map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-2xl bg-white/70 px-3.5 py-3 text-sm text-ink/68">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-moss" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {linkedReminders.length ? (
            <section className="estate-sheet p-5">
              <SectionHeader title="Linked reminders" hint="Follow-up connected to this document" />
              <div className="mt-4 space-y-3">
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
