"use client";

import { useState, type ChangeEvent } from "react";
import {
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
  fieldClass,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { uploadPrivateDocument } from "@/lib/document-storage";
import type { VaultDocument } from "@/lib/mock-data";
import {
  documentKind as fileKind,
  formatDate,
  formatFileSize as fileSize,
} from "@/lib/presentation";
import { upsertStructuredDocument } from "@/lib/structured-data";
import { cancellationDeadline, ContractNotice } from "./contracts-shared";

export function ContractCancellationGuide({
  contractId,
}: {
  contractId: string;
}) {
  const { state, updateState } = useDiaryDockData();
  const contract = state.contracts.contracts.find(
    (item) => item.id === contractId,
  );
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  if (!contract)
    return (
      <BillsShell>
        <BillsHeader
          title="Contract Not Found"
          subtitle="This contract is not available."
          backHref="/office/contracts"
        />
      </BillsShell>
    );
  const updateInstructions = (value: string) =>
    updateState((current) => ({
      ...current,
      contracts: {
        contracts: current.contracts.contracts.map((item) =>
          item.id === contract.id
            ? {
                ...item,
                cancellationInstructions: value,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      },
    }));
  const uploadProof = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(true);
    setMessage("");
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const document: VaultDocument = {
        id,
        title: `${contract.serviceName || contract.provider} cancellation confirmation`,
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
        issuer: contract.provider,
        reviewStatus: "reviewed",
        reviewedAt: new Date().toISOString(),
        reviewReasons: [],
      };
      updateState((current) => ({
        ...current,
        vaultDocuments: [document, ...current.vaultDocuments],
        contracts: {
          contracts: current.contracts.contracts.map((item) =>
            item.id === contract.id
              ? {
                  ...item,
                  cancellationProofDocumentId: id,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        },
      }));
      await upsertStructuredDocument(document);
      setMessage("Cancellation confirmation stored securely.");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to store this confirmation.",
      );
    } finally {
      setWorking(false);
    }
  };
  const deadline = cancellationDeadline(contract);
  return (
    <BillsShell>
      <BillsHeader
        title="Cancellation Guide"
        subtitle={`A practical record for ${contract.serviceName || contract.provider}. DiaryDock will not contact the provider for you.`}
        backHref={`/office/contracts/${contract.id}`}
      />
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Dates to confirm"
          detail="Check every date against the original contract or provider account"
        />
        <dl className="mt-4 divide-y divide-[#20352a]/[0.07] rounded-[18px] bg-[#f7f7f1] px-4">
          <div className="flex justify-between gap-4 py-3 text-xs">
            <dt className="text-[#667068]">Minimum term ends</dt>
            <dd className="font-semibold text-[#20352a]">
              {formatDate(contract.minimumTermEnd)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3 text-xs">
            <dt className="text-[#667068]">Renewal date</dt>
            <dd className="font-semibold text-[#20352a]">
              {formatDate(contract.renewalDate)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3 text-xs">
            <dt className="text-[#667068]">Notice period</dt>
            <dd className="font-semibold text-[#20352a]">
              {contract.noticePeriodDays === null
                ? "Not recorded"
                : `${contract.noticePeriodDays} days`}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3 text-xs">
            <dt className="text-[#667068]">Calculated deadline</dt>
            <dd className="font-semibold text-[#20352a]">
              {formatDate(deadline)}
            </dd>
          </div>
        </dl>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="check"
          title="Cancellation instructions"
          detail="Record the provider's own steps and contact details"
        />
        <textarea
          rows={6}
          value={contract.cancellationInstructions}
          onChange={(event) => updateInstructions(event.target.value)}
          className={`${fieldClass} mt-4`}
          placeholder="For example: call the provider, quote the account reference, request written confirmation…"
        />
        <ol className="mt-4 space-y-2 text-xs leading-5 text-[#667068]">
          <li>
            1. Confirm the minimum term, notice deadline and any exit fee.
          </li>
          <li>
            2. Contact the provider using details from your official contract.
          </li>
          <li>3. Ask for written confirmation and the final payment date.</li>
          <li>4. Store that confirmation below.</li>
        </ol>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="lock"
          title="Proof of cancellation"
          detail="Store the email, letter or screenshot in private document storage"
        />
        <label className="mt-4 flex min-h-24 cursor-pointer items-center justify-center rounded-[18px] border border-dashed border-[#6f8e72]/45 bg-[#f7f7f1] px-4 text-center text-sm font-semibold text-[#45604d]">
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            className="sr-only"
            disabled={working}
            onChange={(event) => void uploadProof(event)}
          />
          {working
            ? "Storing securely…"
            : contract.cancellationProofDocumentId
              ? "Replace cancellation confirmation"
              : "Upload cancellation confirmation"}
        </label>
        {message ? (
          <p
            role="status"
            className="mt-3 text-xs font-semibold text-[#52705a]"
          >
            {message}
          </p>
        ) : null}
      </BillsCard>
      <ContractNotice />
    </BillsShell>
  );
}
