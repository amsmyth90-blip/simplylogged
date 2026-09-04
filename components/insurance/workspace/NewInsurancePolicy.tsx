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
import {
  analysePrivateDocument,
  uploadPrivateDocument,
} from "@/lib/document-storage";
import type { InsuranceDocumentAnalysis } from "@/lib/insurance-document-analysis";
import type {
  InsurancePolicy,
  OfficeInsuranceType,
  PolicyStatus,
} from "@/lib/insurance-records";
import type { VaultDocument } from "@/lib/mock-data";
import { documentKind, formatFileSize as fileSize } from "@/lib/presentation";
import { upsertStructuredDocument } from "@/lib/structured-data";
import { InsuranceNotice } from "./insurance-shared";

function blankPolicy(partial: Partial<InsurancePolicy> = {}): InsurancePolicy {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    type: "Home" as OfficeInsuranceType,
    provider: "",
    policyNumberMasked: "",
    status: "draft" as PolicyStatus,
    reviewStatus: "needs-review",
    startDate: "",
    renewalDate: "",
    premium: 0,
    premiumFrequency: "annual",
    autoRenew: false,
    coverSummary: "",
    coverItems: [],
    excess: 0,
    providerPhone: "",
    providerEmail: "",
    linkedPeople: [],
    linkedAsset: "",
    beneficiaries: "",
    notes: "",
    history: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function NewInsurancePolicy() {
  const router = useRouter();
  const { updateState } = useDiaryDockData();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const store = (policy: InsurancePolicy, document?: VaultDocument) =>
    updateState((current) => ({
      ...current,
      vaultDocuments: document
        ? [
            document,
            ...current.vaultDocuments.filter((item) => item.id !== document.id),
          ]
        : current.vaultDocuments,
      insurance: {
        ...current.insurance,
        policies: [
          policy,
          ...current.insurance.policies.filter((item) => item.id !== policy.id),
        ],
      },
    }));
  const manual = () => {
    const policy = blankPolicy();
    store(policy);
    router.push(`/office/insurance/${policy.id}`);
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
        insuranceAnalysis?: InsuranceDocumentAnalysis;
        error?: string;
      }>(stored, "insurance");
      const analysis = payload.insuranceAnalysis;
      const now = new Date().toISOString();
      const document: VaultDocument = {
        id,
        title: analysis?.title || file.name,
        category: "Home & Property",
        kind: documentKind(file),
        size: fileSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "office",
        roomName: "Office",
        issuer: analysis?.provider,
        dueDate: analysis?.renewalDate,
        extractionSummary: analysis?.coverSummary,
        extractedText: analysis?.extractedText,
        reviewStatus: "needs-review",
        reviewReasons: analysis?.reviewReasons ?? [
          payload.error ||
            "The policy could not be read automatically. Enter and check the details manually.",
        ],
      };
      const policy = blankPolicy({
        id,
        documentId: id,
        title: analysis?.title || "",
        type: analysis?.type || "Home",
        provider: analysis?.provider || "",
        policyNumberMasked: analysis?.policyNumberMasked || "",
        startDate: analysis?.startDate || "",
        renewalDate: analysis?.renewalDate || "",
        premium: analysis?.premium || 0,
        premiumFrequency: analysis?.premiumFrequency || "annual",
        autoRenew: analysis?.autoRenew || false,
        coverSummary: analysis?.coverSummary || "",
        coverItems: [
          ...(analysis?.includedCover || []).map((label) => ({
            id: crypto.randomUUID(),
            label,
            value: "Included",
            included: true,
          })),
          ...(analysis?.excludedCover || []).map((label) => ({
            id: crypto.randomUUID(),
            label,
            value: "Not included",
            included: false,
          })),
        ],
        excess: analysis?.excess || 0,
        providerPhone: analysis?.providerPhone || "",
        providerEmail: analysis?.providerEmail || "",
        notes: analysis?.reviewReasons.join(" · ") || "",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        createdAt: now,
        updatedAt: now,
      });
      store(policy, document);
      await upsertStructuredDocument(document);
      router.push(`/office/insurance/${id}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add this policy.",
      );
      setWorking(false);
    }
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Add a Policy"
        subtitle="Upload a policy for a helpful first read, or enter the details yourself."
        backHref="/office/insurance"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="camera"
          title="Upload a policy document"
          detail="PDF, JPEG, PNG, WebP or HEIC · up to 4 MB"
        />
        <label className="mt-5 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[#6f8e72]/45 bg-[#f7f7f1] px-5 text-center">
          <UiIcon name="plus" className="h-8 w-8 text-[#52705a]" />
          <span className="mt-3 text-sm font-semibold text-[#20352a]">
            {working
              ? "Securely storing and reading…"
              : "Choose a policy document"}
          </span>
          <span className="mt-1 text-[11px] text-[#667068]">
            Nothing is confirmed until you review it.
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
          onClick={manual}
          disabled={working}
          className="mt-4 min-h-12 w-full rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Enter details manually
        </button>
      </BillsCard>
      <InsuranceNotice />
    </BillsShell>
  );
}
