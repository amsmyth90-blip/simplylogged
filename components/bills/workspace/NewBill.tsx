import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  BillsCard,
  BillsHeader,
  BillsNotice,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import type { BillDocumentAnalysis } from "@/lib/bill-document-analysis";
import type { BillRecord } from "@/lib/bill-records";
import {
  analysePrivateDocument,
  uploadPrivateDocument,
} from "@/lib/document-storage";
import type { VaultDocument } from "@/lib/mock-data";
import { documentKind, formatFileSize } from "@/lib/presentation";
import { upsertStructuredDocument } from "@/lib/structured-data";

function emptyBill(id: string, now: string): BillRecord {
  return {
    accountNumberMasked: "",
    amount: 0,
    billingPeriodEnd: "",
    billingPeriodStart: "",
    category: "Other",
    contractEndDate: "",
    createdAt: now,
    directDebit: false,
    dueDate: "",
    frequency: "one-off",
    history: [],
    id,
    notes: "",
    noticePeriodDays: null,
    paymentMethod: "",
    provider: "",
    reviewStatus: "needs-review",
    status: "draft",
    title: "",
    updatedAt: now,
    usage: "",
  };
}

function extractedBill(
  id: string,
  now: string,
  analysis: BillDocumentAnalysis | undefined,
  stored: {
    bucket: string;
    path: string;
  },
  file: File,
): BillRecord {
  return {
    ...emptyBill(id, now),
    accountNumberMasked: analysis?.accountNumberMasked || "",
    amount: analysis?.amount || 0,
    billingPeriodEnd: analysis?.billingPeriodEnd || "",
    billingPeriodStart: analysis?.billingPeriodStart || "",
    category: analysis?.category || "Other",
    contractEndDate: analysis?.contractEndDate || "",
    directDebit: analysis?.directDebit || false,
    documentId: id,
    dueDate: analysis?.dueDate || "",
    frequency: analysis?.frequency || "one-off",
    mimeType: file.type,
    notes: analysis?.reviewReasons.join(" · ") || "",
    noticePeriodDays: analysis?.noticePeriodDays ?? null,
    originalFileName: file.name,
    paymentMethod: analysis?.paymentMethod || "",
    provider: analysis?.provider || "",
    storageBucket: stored.bucket,
    storagePath: stored.path,
    title: analysis?.title || "",
    usage: analysis?.usage || "",
  };
}

function extractedDocument(
  id: string,
  file: File,
  analysis: BillDocumentAnalysis | undefined,
  stored: {
    bucket: string;
    path: string;
  },
  fallback: string,
): VaultDocument {
  return {
    category: "Finance",
    dueDate: analysis?.dueDate,
    extractedText: analysis?.extractedText,
    extractionSummary: analysis?.summary,
    id,
    issuer: analysis?.provider,
    kind: documentKind(file),
    mimeType: file.type,
    originalFileName: file.name,
    reviewReasons: analysis?.reviewReasons ?? [fallback],
    reviewStatus: "needs-review",
    roomId: "office",
    roomName: "Office",
    size: formatFileSize(file.size),
    storageBucket: stored.bucket,
    storagePath: stored.path,
    title: analysis?.title || file.name,
    updated: "Just now",
  };
}

export function NewBill() {
  const router = useRouter();
  const { updateState } = useDiaryDockData();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  function createManual() {
    const bill = emptyBill(crypto.randomUUID(), new Date().toISOString());
    updateState((current) => ({
      ...current,
      bills: { bills: [bill, ...current.bills.bills] },
    }));
    router.push(`/office/bills/${bill.id}`);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(true);
    setError("");
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const payload = await analysePrivateDocument<{
        billAnalysis?: BillDocumentAnalysis;
        error?: string;
      }>(stored, "bill");
      const fallback =
        payload.error ||
        "The bill could not be read automatically. Enter and check the details manually.";
      const document = extractedDocument(
        id,
        file,
        payload.billAnalysis,
        stored,
        fallback,
      );
      const bill = extractedBill(
        id,
        new Date().toISOString(),
        payload.billAnalysis,
        stored,
        file,
      );
      if (!bill.notes) bill.notes = fallback;
      updateState((current) => ({
        ...current,
        bills: {
          bills: [
            bill,
            ...current.bills.bills.filter((item) => item.id !== id),
          ],
        },
        vaultDocuments: [
          document,
          ...current.vaultDocuments.filter((item) => item.id !== id),
        ],
      }));
      await upsertStructuredDocument(document);
      router.push(`/office/bills/${id}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add this bill.",
      );
      setWorking(false);
    }
  }

  return (
    <BillsShell>
      <BillsHeader
        title="Add a bill"
        subtitle="Upload a bill for a helpful first read, or enter the details yourself."
        backHref="/office/bills"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="camera"
          title="Upload or photograph a bill"
          detail="PDF, JPEG, PNG, WebP or HEIC · up to 4 MB"
        />
        <label className="mt-5 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[#6f8e72]/45 bg-[#f7f7f1] px-5 text-center focus-within:ring-2 focus-within:ring-[#6f8e72]">
          <UiIcon name="plus" className="h-8 w-8 text-[#52705a]" />
          <span className="mt-3 text-sm font-semibold text-[#20352a]">
            {working ? "Securely storing and reading…" : "Choose a bill"}
          </span>
          <span className="mt-1 text-[11px] text-[#667068]">
            You will check every extracted detail before it is confirmed.
          </span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            onChange={upload}
            disabled={working}
            className="sr-only"
          />
        </label>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-[14px] bg-[#f7e4df] px-3 py-2.5 text-xs text-[#8c493f]"
          >
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={createManual}
          disabled={working}
          className="mt-4 min-h-12 w-full rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Enter details manually
        </button>
      </BillsCard>
      <BillsNotice />
    </BillsShell>
  );
}
