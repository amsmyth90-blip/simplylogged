"use client";
import { useState } from "react";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { formatBillDate } from "@/lib/bill-records";
import { openPrivateDocument } from "@/lib/document-storage";
import type { InsurancePolicy } from "@/lib/insurance-records";
import type { Reminder } from "@/lib/mock-data";
import {
  upsertStructuredDocument,
  upsertStructuredReminder,
} from "@/lib/structured-data";

export function useInsurancePolicyDetail(policyId: string) {
  const { state, updateState } = useDiaryDockData();
  const policy = state.insurance.policies.find((item) => item.id === policyId);
  const [draft, setDraft] = useState<InsurancePolicy | undefined>(policy);
  const [message, setMessage] = useState("");
  const update = <K extends keyof InsurancePolicy>(
    key: K,
    value: InsurancePolicy[K],
  ) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  const save = async () => {
    if (!policy || !draft) return;
    if (!draft.title.trim() && !draft.provider.trim()) {
      setMessage("Add a policy title or provider before confirming.");
      return;
    }
    const changed =
      policy.reviewStatus === "reviewed" &&
      (policy.premium !== draft.premium ||
        policy.excess !== draft.excess ||
        policy.renewalDate !== draft.renewalDate);
    const history = changed
      ? [
          ...policy.history,
          {
            id: crypto.randomUUID(),
            premium: draft.premium,
            excess: draft.excess,
            renewalDate: draft.renewalDate,
            recordedAt: new Date().toISOString(),
          },
        ]
      : policy.history.length
        ? policy.history
        : [
            {
              id: crypto.randomUUID(),
              premium: draft.premium,
              excess: draft.excess,
              renewalDate: draft.renewalDate,
              recordedAt: new Date().toISOString(),
            },
          ];
    const updated: InsurancePolicy = {
      ...draft,
      title: draft.title.trim() || `${draft.provider} policy`,
      status: draft.status === "draft" ? "active" : draft.status,
      reviewStatus: "reviewed",
      history,
      updatedAt: new Date().toISOString(),
    };
    updateState((current) => ({
      ...current,
      insurance: {
        ...current.insurance,
        policies: current.insurance.policies.map((item) =>
          item.id === policyId ? updated : item,
        ),
      },
      vaultDocuments: current.vaultDocuments.map((document) =>
        document.id === updated.documentId
          ? {
              ...document,
              title: updated.title,
              issuer: updated.provider,
              dueDate: updated.renewalDate,
              reviewStatus: "reviewed",
              reviewedAt: new Date().toISOString(),
            }
          : document,
      ),
    }));
    const document = state.vaultDocuments.find(
      (item) => item.id === updated.documentId,
    );
    if (document)
      await upsertStructuredDocument({
        ...document,
        title: updated.title,
        issuer: updated.provider,
        dueDate: updated.renewalDate,
        reviewStatus: "reviewed",
        reviewedAt: new Date().toISOString(),
      });
    setDraft(updated);
    setMessage("Policy details saved.");
  };
  const remind = async () => {
    if (!draft) return;
    if (!draft.renewalDate) {
      setMessage("Add a renewal date first.");
      return;
    }
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: `Review ${draft.title || draft.provider || "insurance policy"}`,
      note: "Check the renewal quote, cover and exclusions against the original policy documents.",
      roomId: "office",
      roomName: "Office",
      group: "later",
      timeLabel: formatBillDate(draft.renewalDate),
      priority: "normal",
      documentId: draft.documentId,
      documentTitle: draft.title,
      dueDate: draft.renewalDate,
    };
    updateState((current) => ({
      ...current,
      reminders: [reminder, ...current.reminders],
    }));
    await upsertStructuredReminder(reminder);
    setMessage("Renewal reminder added.");
  };
  const view = async () => {
    if (!draft) return;
    try {
      await openPrivateDocument(draft.storageBucket, draft.storagePath);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to open this policy.",
      );
    }
  };
  return { policy, draft, message, update, save, remind, view };
}

export type InsurancePolicyDetailController = ReturnType<
  typeof useInsurancePolicyDetail
>;
