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
import { UiIcon } from "@/components/UiIcon";
import { formatBillDate } from "@/lib/bill-records";
import { uploadPrivateDocument } from "@/lib/document-storage";
import type { ClaimStatus, InsuranceClaim } from "@/lib/insurance-records";
import type { VaultDocument } from "@/lib/mock-data";
import { documentKind, formatFileSize as fileSize } from "@/lib/presentation";
import { upsertStructuredDocument } from "@/lib/structured-data";
import { claimTone } from "./insurance-shared";

export function InsuranceClaims() {
  const { state, updateState } = useDiaryDockData();
  const [showForm, setShowForm] = useState(false);
  const [evidenceWorking, setEvidenceWorking] = useState("");
  const policies = state.insurance.policies.filter(
    (policy) => policy.reviewStatus === "reviewed",
  );
  const [draft, setDraft] = useState({
    policyId: policies[0]?.id || "",
    title: "",
    claimNumberMasked: "",
    incidentDate: "",
    description: "",
    status: "draft" as ClaimStatus,
  });
  const save = () => {
    if (!draft.title.trim() || !draft.policyId) return;
    const now = new Date().toISOString();
    const claim: InsuranceClaim = {
      id: crypto.randomUUID(),
      ...draft,
      evidenceDocumentIds: [],
      createdAt: now,
      updatedAt: now,
    };
    updateState((current) => ({
      ...current,
      insurance: {
        ...current.insurance,
        claims: [claim, ...current.insurance.claims],
      },
    }));
    setShowForm(false);
  };
  const addEvidence = async (
    claim: InsuranceClaim,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setEvidenceWorking(claim.id);
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const document: VaultDocument = {
        id,
        title: `${claim.title} evidence — ${file.name}`,
        category: "Insurance Claim",
        kind: documentKind(file),
        size: fileSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "safe-room",
        roomName: "Safe Room",
        reviewStatus: "reviewed",
        reviewedAt: new Date().toISOString(),
      };
      updateState((current) => ({
        ...current,
        vaultDocuments: [document, ...current.vaultDocuments],
        insurance: {
          ...current.insurance,
          claims: current.insurance.claims.map((item) =>
            item.id === claim.id
              ? {
                  ...item,
                  evidenceDocumentIds: [id, ...item.evidenceDocumentIds],
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        },
      }));
      await upsertStructuredDocument(document);
    } finally {
      setEvidenceWorking("");
    }
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Claims Centre"
        subtitle="Record claim details, progress and references alongside the relevant policy."
        backHref="/office/insurance"
      />
      <BillsCard>
        <div className="flex items-center justify-between">
          <BillsSectionTitle
            icon="briefcase"
            title="Your claims"
            detail={`${state.insurance.claims.length} claim${state.insurance.claims.length === 1 ? "" : "s"} recorded`}
          />
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2f5140] text-white"
            aria-label="Add a claim"
          >
            <UiIcon name="plus" className="h-5 w-5" />
          </button>
        </div>
        {showForm ? (
          <div className="mt-5 rounded-[18px] bg-[#f6f5ef] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#667068]">
                Policy
                <select
                  value={draft.policyId}
                  onChange={(event) =>
                    setDraft({ ...draft, policyId: event.target.value })
                  }
                  className={fieldClass}
                >
                  <option value="">Choose policy</option>
                  {policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Claim title
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Claim number (masked)
                <input
                  value={draft.claimNumberMasked}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      claimNumberMasked: event.target.value,
                    })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068]">
                Incident date
                <input
                  type="date"
                  value={draft.incidentDate}
                  onChange={(event) =>
                    setDraft({ ...draft, incidentDate: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
                Description
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={save}
              className="mt-4 min-h-11 w-full rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white"
            >
              Save claim record
            </button>
          </div>
        ) : null}
        <div className="mt-5 space-y-3">
          {state.insurance.claims.length ? (
            state.insurance.claims.map((claim) => {
              const policy = policies.find(
                (item) => item.id === claim.policyId,
              );
              return (
                <article
                  key={claim.id}
                  className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#20352a]">
                        {claim.title}
                      </h3>
                      <p className="mt-1 text-[11px] text-[#667068]">
                        {policy?.title || "Policy"} ·{" "}
                        {formatBillDate(claim.incidentDate)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[9px] font-semibold capitalize ${claimTone[claim.status]}`}
                    >
                      {claim.status.replace("-", " ")}
                    </span>
                  </div>
                  {claim.description ? (
                    <p className="mt-3 text-xs leading-5 text-[#667068]">
                      {claim.description}
                    </p>
                  ) : null}
                  <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[13px] border border-[#6f8e72]/30 px-3 text-xs font-semibold text-[#45604d]">
                    <UiIcon name="plus" className="h-4 w-4" />
                    {evidenceWorking === claim.id
                      ? "Storing evidence…"
                      : `Add evidence${claim.evidenceDocumentIds.length ? ` · ${claim.evidenceDocumentIds.length}` : ""}`}
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                      onChange={(event) => void addEvidence(claim, event)}
                      disabled={Boolean(evidenceWorking)}
                      className="sr-only"
                    />
                  </label>
                </article>
              );
            })
          ) : (
            <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-5 text-center text-xs text-[#667068]">
              No claims recorded.
            </p>
          )}
        </div>
      </BillsCard>
      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
        DiaryDock records your own claim notes and stores uploaded evidence
        privately in the Safe Room. It does not submit claims or communicate
        with insurers on your behalf.
      </p>
    </BillsShell>
  );
}
