"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { DocumentCorrectionModal } from "@/components/document-detail/DocumentCorrectionModal";
import { DocumentDetailHeader } from "@/components/document-detail/DocumentDetailHeader";
import { DocumentDetailsSidebar } from "@/components/document-detail/DocumentDetailsSidebar";
import { DocumentFilePreview } from "@/components/document-detail/DocumentFilePreview";
import {
  markDocumentReviewed,
  saveDocumentCorrection
} from "@/components/document-detail/document-detail-actions";
import {
  buildDocumentDraft,
  linkedDocumentReminders,
  type DocumentCorrectionDraft
} from "@/components/document-detail/document-detail-model";
import { useSecureDocumentUrl } from "@/components/document-detail/use-secure-document-url";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

type DocumentDetailWorkspaceProps = {
  backHref?: string;
  backLabel?: string;
  documentId: string;
};

export function DocumentDetailWorkspace({
  documentId,
  backHref = "/files",
  backLabel = "All Files"
}: DocumentDetailWorkspaceProps) {
  const { state, hydrated, repositoryMode, updateState } = useDiaryDockData();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DocumentCorrectionDraft | null>(null);
  const document = state.vaultDocuments.find((item) => item.id === documentId) ?? null;
  const canManage = document?.isOwnedByCurrentUser !== false;
  const file = useSecureDocumentUrl(document);
  const shareOptions = useMemo(
    () =>
      state.householdMembers.filter((member) => {
        if (!member.userId) return false;
        return document?.ownerId
          ? member.userId !== document.ownerId
          : member.lastActive !== "Now";
      }),
    [document, state.householdMembers]
  );
  const linkedReminders = useMemo(
    () => (document ? linkedDocumentReminders(document, state.reminders) : []),
    [document, state.reminders]
  );

  const openCorrection = () => {
    if (!document || !canManage) return;
    const nextDraft = buildDocumentDraft(document);
    if (!nextDraft.sharedWithUserIds.length && document.sharedWith?.length) {
      nextDraft.sharedWithUserIds = shareOptions
        .filter((member) => document.sharedWith?.includes(member.name))
        .map((member) => member.userId)
        .filter((userId): userId is string => Boolean(userId));
    }
    setDraft(nextDraft);
    setEditing(true);
  };
  const closeCorrection = () => {
    setEditing(false);
    setDraft(null);
  };
  const saveCorrection = async () => {
    if (!document || !draft || !canManage) return;
    try {
      const saved = await saveDocumentCorrection({
        document,
        draft,
        repositoryMode,
        shareOptions,
        updateState
      });
      if (saved) closeCorrection();
    } catch (error) {
      file.setFileMessage(
        error instanceof Error ? error.message : "Sharing could not be updated."
      );
    }
  };
  const markReviewed = async () => {
    if (!document || !canManage) return;
    try {
      await markDocumentReviewed(document, updateState);
    } catch (error) {
      file.setFileMessage(
        error instanceof Error ? error.message : "The review could not be saved."
      );
    }
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
        <EmptyState icon="file" title="This document is not in All Files" message="It may have been removed, or the app is still syncing your account." action={<Link href={backHref} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Back to {backLabel}</Link>} />
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pb-4">
      <DocumentDetailHeader backHref={backHref} backLabel={backLabel} canManage={canManage} document={document} isOpening={file.isOpening} onEdit={openCorrection} onOpen={() => void file.openStoredFile()} />
      <section className="grid gap-2.5 lg:grid-cols-[1.08fr_0.92fr]">
        <DocumentFilePreview document={document} fileMessage={file.fileMessage} onOpen={() => void file.openStoredFile()} signedUrl={file.signedUrl} />
        <DocumentDetailsSidebar canManage={canManage} document={document} linkedReminders={linkedReminders} onEdit={openCorrection} onReviewed={() => void markReviewed()} />
      </section>
      <DocumentCorrectionModal draft={draft} onClose={closeCorrection} onSave={() => void saveCorrection()} open={editing} setDraft={setDraft} shareOptions={shareOptions} />
    </div>
  );
}
