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
import type { BillDocumentAnalysis } from "@/lib/bill-document-analysis";
import type { ContractRecord } from "@/lib/contract-records";
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
import { ContractNotice } from "./contracts-shared";

function blankContract(partial: Partial<ContractRecord> = {}): ContractRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    serviceName: "",
    provider: "",
    category: "Other",
    status: "draft",
    reviewStatus: "needs-review",
    accountEmail: "",
    accountNumberMasked: "",
    monthlyCost: 0,
    frequency: "monthly",
    paymentMethod: "",
    startDate: "",
    minimumTermEnd: "",
    renewalDate: "",
    noticePeriodDays: null,
    autoRenew: false,
    promotionalPrice: null,
    promotionalEndDate: "",
    cancellationInstructions: "",
    notes: "",
    priceHistory: [],
    lastReviewedAt: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function NewContract() {
  const router = useRouter();
  const { updateState } = useDiaryDockData();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const storeContract = (contract: ContractRecord, document?: VaultDocument) =>
    updateState((current) => ({
      ...current,
      vaultDocuments: document
        ? [
            document,
            ...current.vaultDocuments.filter((item) => item.id !== document.id),
          ]
        : current.vaultDocuments,
      contracts: {
        contracts: [
          contract,
          ...current.contracts.contracts.filter(
            (item) => item.id !== contract.id,
          ),
        ],
      },
    }));
  const manual = () => {
    const draft = blankContract();
    storeContract(draft);
    router.push(`/office/contracts/${draft.id}`);
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
        billAnalysis?: BillDocumentAnalysis;
        error?: string;
      }>(stored, "bill");
      const analysis = payload.billAnalysis;
      const now = new Date().toISOString();
      const contract = blankContract({
        id,
        documentId: id,
        serviceName: analysis?.title ?? "",
        provider: analysis?.provider ?? "",
        category:
          analysis?.category === "Communications"
            ? "Broadband"
            : analysis?.category === "Subscriptions"
              ? "Streaming"
              : analysis?.category === "Home services"
                ? "Home service"
                : "Other",
        accountNumberMasked: analysis?.accountNumberMasked ?? "",
        monthlyCost: analysis?.amount ?? 0,
        frequency: analysis?.frequency ?? "monthly",
        paymentMethod: analysis?.paymentMethod ?? "",
        startDate: analysis?.billingPeriodStart ?? "",
        minimumTermEnd: analysis?.contractEndDate ?? "",
        renewalDate: analysis?.contractEndDate ?? "",
        noticePeriodDays: analysis?.noticePeriodDays ?? null,
        notes: analysis?.reviewReasons.join(" · ") ?? "",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        priceHistory: analysis?.amount
          ? [
              {
                id: crypto.randomUUID(),
                amount: analysis.amount,
                effectiveDate: analysis.billingPeriodStart || now.slice(0, 10),
                recordedAt: now,
              },
            ]
          : [],
        createdAt: now,
        updatedAt: now,
      });
      const document: VaultDocument = {
        id,
        title: analysis?.title || file.name,
        category: "Finance",
        kind: fileKind(file),
        size: fileSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "office",
        roomName: "Office",
        issuer: analysis?.provider,
        dueDate: analysis?.contractEndDate,
        extractionSummary: analysis?.summary,
        extractedText: analysis?.extractedText,
        reviewStatus: "needs-review",
        reviewReasons: analysis?.reviewReasons ?? [
          payload.error ||
            "The contract could not be read automatically. Enter and check the details manually.",
        ],
      };
      storeContract(contract, document);
      await upsertStructuredDocument(document);
      router.push(`/office/contracts/${id}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to add this contract.",
      );
      setWorking(false);
    }
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Add a Contract"
        subtitle="Upload a contract for a helpful first read, or enter the details yourself."
        backHref="/office/contracts"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="camera"
          title="Upload a contract document"
          detail="PDF, JPEG, PNG, WebP or HEIC · up to 4 MB"
        />
        <label className="mt-5 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[#6f8e72]/45 bg-[#f7f7f1] px-5 text-center focus-within:ring-2 focus-within:ring-[#6f8e72]">
          <UiIcon name="plus" className="h-7 w-7 text-[#52705a]" />
          <span className="mt-3 text-sm font-semibold text-[#20352a]">
            {working ? "Reading your contract…" : "Choose a contract file"}
          </span>
          <span className="mt-1 text-xs text-[#667068]">
            You will check all extracted details before they are used.
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
      <ContractNotice />
    </BillsShell>
  );
}
