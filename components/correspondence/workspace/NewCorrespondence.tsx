"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

import {
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import type { CorrespondenceRecord } from "@/lib/correspondence-records";
import type { DocumentExtractionResult } from "@/lib/document-extraction";
import {
  analysePrivateDocument,
  uploadPrivateDocument,
} from "@/lib/document-storage";
import type { VaultDocument } from "@/lib/mock-data";
import {
  documentKind as fileKind,
  formatFileSize as fileSize,
} from "@/lib/presentation";
import { upsertStructuredDocument } from "@/lib/structured-data";

import {
  CorrespondenceNotice,
  folderFromExtraction,
} from "./correspondence-shared";

function createBlankCorrespondence(
  partial: Partial<CorrespondenceRecord> = {},
): CorrespondenceRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    sender: "",
    correspondenceType: "Letter",
    folder: "Other",
    receivedDate: now.slice(0, 10),
    deadline: "",
    status: "unread",
    reviewStatus: "needs-review",
    summary: "",
    extractedText: "",
    actions: [],
    contactName: "",
    contactPhone: "",
    contactUrl: "",
    linkedReminderIds: [],
    responses: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function correspondenceFromExtraction(
  id: string,
  file: File,
  stored: { bucket: string; path: string },
  extraction: DocumentExtractionResult,
): CorrespondenceRecord {
  const now = new Date().toISOString();
  return createBlankCorrespondence({
    id,
    documentId: id,
    title: extraction.title,
    sender: extraction.issuer,
    correspondenceType: extraction.detectedDocumentType || "Letter",
    folder: folderFromExtraction(extraction),
    deadline: extraction.dueDate,
    status:
      extraction.actionItems.length || extraction.dueDate
        ? "action-needed"
        : "unread",
    summary: extraction.summary,
    extractedText: extraction.extractedText,
    actions: extraction.actionItems.map((label) => ({
      id: crypto.randomUUID(),
      label,
      completed: false,
    })),
    contactName: extraction.issuer,
    storageBucket: stored.bucket,
    storagePath: stored.path,
    originalFileName: file.name,
    mimeType: file.type,
    createdAt: now,
    updatedAt: now,
  });
}

function vaultDocumentFromExtraction(
  id: string,
  file: File,
  stored: { bucket: string; path: string },
  extraction: DocumentExtractionResult,
): VaultDocument {
  return {
    id,
    title: extraction.title || file.name,
    category: extraction.category,
    kind: fileKind(file),
    size: fileSize(file.size),
    updated: "Just now",
    storageBucket: stored.bucket,
    storagePath: stored.path,
    originalFileName: file.name,
    mimeType: file.type,
    roomId: "office",
    roomName: "Office",
    issuer: extraction.issuer,
    dueDate: extraction.dueDate,
    extractionSummary: extraction.summary,
    extractedText: extraction.extractedText,
    actionItems: extraction.actionItems,
    confidence: extraction.confidence,
    reviewStatus: "needs-review",
    reviewReasons: [
      "Check the sender, summary, deadline and actions against the original letter before confirming.",
    ],
  };
}

export function NewCorrespondence() {
  const router = useRouter();
  const { updateState } = useDiaryDockData();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const storeCorrespondence = (
    item: CorrespondenceRecord,
    document?: VaultDocument,
  ) => {
    updateState((current) => ({
      ...current,
      vaultDocuments: document
        ? [
            document,
            ...current.vaultDocuments.filter(
              (entry) => entry.id !== document.id,
            ),
          ]
        : current.vaultDocuments,
      correspondence: {
        correspondence: [
          item,
          ...current.correspondence.correspondence.filter(
            (entry) => entry.id !== item.id,
          ),
        ],
      },
    }));
  };
  const manual = () => {
    const item = createBlankCorrespondence();
    storeCorrespondence(item);
    router.push(`/office/correspondence/${item.id}`);
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(true);
    setError("");
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const payload = await analysePrivateDocument<{
        extraction?: DocumentExtractionResult;
        error?: string;
      }>(stored);
      if (!payload.extraction)
        throw new Error(payload.error || "The letter could not be read.");
      const item = correspondenceFromExtraction(
        id,
        file,
        stored,
        payload.extraction,
      );
      const document = vaultDocumentFromExtraction(
        id,
        file,
        stored,
        payload.extraction,
      );
      storeCorrespondence(item, document);
      await upsertStructuredDocument(document);
      router.push(`/office/correspondence/${id}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to add this correspondence.",
      );
      setWorking(false);
    }
  };

  return (
    <BillsShell>
      <BillsHeader
        title="Add Correspondence"
        subtitle="Upload or photograph a letter for a helpful first read, or enter it manually."
        backHref="/office/correspondence"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="camera"
          title="Scan or upload a letter"
          detail="PDF, JPEG, PNG, WebP or HEIC · up to 4 MB"
        />
        <label className="mt-5 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[#6f8e72]/45 bg-[#f7f7f1] px-5 text-center focus-within:ring-2 focus-within:ring-[#6f8e72]">
          <UiIcon name="plus" className="h-7 w-7 text-[#52705a]" />
          <span className="mt-3 text-sm font-semibold text-[#20352a]">
            {working ? "Reading your letter…" : "Choose a letter or notice"}
          </span>
          <span className="mt-1 text-xs text-[#667068]">
            You will review all suggested details before saving.
          </span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            className="sr-only"
            disabled={working}
            onChange={(event) => void upload(event)}
          />
        </label>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-[14px] bg-[#f7e4df] px-3 py-2.5 text-xs text-[#924a40]"
          >
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={manual}
          className="mt-4 min-h-12 w-full rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Enter details manually
        </button>
      </BillsCard>
      <CorrespondenceNotice />
    </BillsShell>
  );
}
