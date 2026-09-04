"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { DiaryDockAppState } from "@/lib/diarydock-data";
import {
  openPrivateDocument,
  uploadPrivateDocument,
  validateDocumentFile,
} from "@/lib/document-storage";
import {
  createLetterDraft,
  hydrateLettersRecord,
  type LetterOfWishes,
  type LettersOfWishesRecord,
} from "@/lib/letter-records";
import type { VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument } from "@/lib/structured-data";

function replaceLetters(
  state: DiaryDockAppState,
  record: LettersOfWishesRecord,
) {
  return {
    ...state,
    willsWishes: { ...state.willsWishes, lettersOfWishes: record },
  };
}

function readableFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useLetterEditor(letterId?: string) {
  const router = useRouter();
  const { state, hydrated, repositoryMode, updateState } = useDiaryDockData();
  const record = hydrateLettersRecord(state.willsWishes.lettersOfWishes);
  const storedLetter = useMemo(
    () =>
      letterId
        ? (record.letters.find((letter) => letter.id === letterId) ?? null)
        : null,
    [letterId, record.letters],
  );
  const [draft, setDraft] = useState<LetterOfWishes>(createLetterDraft);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hydrated) setDraft(storedLetter ?? createLetterDraft());
  }, [hydrated, storedLetter]);

  const updateField = <K extends keyof LetterOfWishes>(
    key: K,
    value: LetterOfWishes[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const saveLetter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (!draft.title.trim() || !draft.content.trim()) {
      setMessage("Add a title and some words before saving your letter.");
      return;
    }
    if (!draft.recipientName.trim() && draft.recipientType === "other") {
      setMessage("Add the intended recipient’s name or relationship.");
      return;
    }
    if (attachment) {
      const validationError = validateDocumentFile(attachment);
      if (validationError) {
        setMessage(validationError);
        return;
      }
      if (repositoryMode !== "supabase") {
        setMessage(
          "Secure attachments require the connected DiaryDock account service.",
        );
        return;
      }
    }

    setSaving(true);
    const now = new Date().toISOString();
    const id = draft.id || crypto.randomUUID();
    let attachmentIds = [...draft.attachmentDocumentIds];
    let uploadedDocument: VaultDocument | null = null;

    try {
      if (attachment) {
        const documentId = crypto.randomUUID();
        const stored = await uploadPrivateDocument(attachment, documentId);
        uploadedDocument = {
          id: documentId,
          title: `${draft.title.trim()} attachment`,
          category: "Legal & Estate",
          kind: attachment.type === "application/pdf" ? "PDF" : "Image",
          size: readableFileSize(attachment.size),
          updated: "Just now",
          storageBucket: stored.bucket,
          storagePath: stored.path,
          originalFileName: attachment.name,
          mimeType: attachment.type,
          roomId: "office",
          roomName: "Office",
          issuer: "Letter of Wishes attachment",
          reviewStatus: "reviewed",
        };
        await upsertStructuredDocument(uploadedDocument);
        attachmentIds = [...attachmentIds, documentId];
      }

      const versionNumber = draft.versions.length + 1;
      const nextLetter: LetterOfWishes = {
        ...draft,
        id,
        title: draft.title.trim(),
        recipientName: draft.recipientName.trim(),
        content: draft.content.trim(),
        envelopeTitle: draft.envelopeTitle.trim(),
        envelopeMessage: draft.envelopeMessage.trim(),
        memoryNotes: draft.memoryNotes.trim(),
        attachmentDocumentIds: attachmentIds,
        createdAt: draft.createdAt || now,
        updatedAt: now,
        versions: [
          ...draft.versions,
          {
            id: crypto.randomUUID(),
            versionNumber,
            createdAt: now,
            title: draft.title.trim(),
            content: draft.content.trim(),
            envelopeTitle: draft.envelopeTitle.trim(),
            envelopeMessage: draft.envelopeMessage.trim(),
          },
        ],
      };

      updateState((current) => {
        const currentRecord = hydrateLettersRecord(
          current.willsWishes.lettersOfWishes,
        );
        const nextState = uploadedDocument
          ? {
              ...current,
              vaultDocuments: [
                uploadedDocument,
                ...current.vaultDocuments.filter(
                  (document) => document.id !== uploadedDocument?.id,
                ),
              ],
            }
          : current;
        return replaceLetters(nextState, {
          letters: [
            nextLetter,
            ...currentRecord.letters.filter((letter) => letter.id !== id),
          ],
          updatedAt: now,
        });
      });
      setDraft(nextLetter);
      setAttachment(null);
      setMessage(`Letter saved privately as version ${versionNumber}.`);
      if (!letterId) router.replace(`/wills/letters-of-wishes/${id}`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The letter could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openAttachment = async (documentId: string) => {
    const document = state.vaultDocuments.find(
      (item) => item.id === documentId,
    );
    try {
      await openPrivateDocument(document?.storageBucket, document?.storagePath);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to open this attachment.",
      );
    }
  };

  const removeAttachment = (documentId: string) => {
    setDraft((current) => ({
      ...current,
      attachmentDocumentIds: current.attachmentDocumentIds.filter(
        (id) => id !== documentId,
      ),
    }));
    setMessage(
      "Attachment removed from this letter. The original file remains in All Files and has not been deleted.",
    );
  };

  const chooseAttachment = (file: File | null) => {
    setAttachment(file);
    setMessage(file ? (validateDocumentFile(file) ?? "") : "");
  };

  return {
    state,
    hydrated,
    storedLetter,
    draft,
    updateField,
    attachment,
    chooseAttachment,
    message,
    saving,
    saveLetter,
    openAttachment,
    removeAttachment,
  };
}

export type LetterEditorViewModel = ReturnType<typeof useLetterEditor>;
