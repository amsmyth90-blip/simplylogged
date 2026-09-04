"use client";

import { useState } from "react";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { ContractRecord } from "@/lib/contract-records";
import { openPrivateDocument } from "@/lib/document-storage";
import type { Reminder } from "@/lib/mock-data";
import { formatDate } from "@/lib/presentation";
import { upsertStructuredReminder } from "@/lib/structured-data";
import { cancellationDeadline } from "./contracts-shared";

export type ContractDetailTab = "overview" | "dates" | "payments" | "documents";

export function useContractDetail(contractId: string) {
  const { state, updateState } = useDiaryDockData();
  const original = state.contracts.contracts.find(
    (contract) => contract.id === contractId,
  );
  const [draft, setDraft] = useState(original);
  const [tab, setTab] = useState<ContractDetailTab>("overview");
  const [message, setMessage] = useState("");
  const [opening, setOpening] = useState(false);
  const update = <K extends keyof ContractRecord>(
    key: K,
    value: ContractRecord[K],
  ) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  const save = () => {
    if (!draft) return;
    const now = new Date().toISOString();
    const previous = original?.priceHistory.at(-1);
    const history =
      draft.monthlyCost > 0 &&
      (!previous || previous.amount !== draft.monthlyCost)
        ? [
            ...draft.priceHistory,
            {
              id: crypto.randomUUID(),
              amount: draft.monthlyCost,
              effectiveDate: now.slice(0, 10),
              recordedAt: now,
            },
          ]
        : draft.priceHistory;
    const saved: ContractRecord = {
      ...draft,
      status: draft.status === "draft" ? "active" : draft.status,
      reviewStatus: "reviewed",
      lastReviewedAt: now.slice(0, 10),
      updatedAt: now,
      priceHistory: history,
    };
    setDraft(saved);
    updateState((current) => ({
      ...current,
      contracts: {
        contracts: current.contracts.contracts.map((contract) =>
          contract.id === saved.id ? saved : contract,
        ),
      },
    }));
    setMessage("Contract details saved.");
  };
  const addReminder = async () => {
    if (!draft) return;
    const dueDate =
      cancellationDeadline(draft) || draft.renewalDate || draft.minimumTermEnd;
    if (!dueDate) {
      setMessage("Add a renewal or contract end date first.");
      return;
    }
    const reminder: Reminder = {
      id: `contract-${draft.id}-${dueDate}`,
      title: `Review ${draft.serviceName || draft.provider || "contract"}`,
      note: "Check the provider terms, price and notice period before taking action.",
      roomId: "office",
      roomName: "Office",
      group: "later",
      timeLabel: formatDate(dueDate),
      priority: "normal",
      documentId: draft.documentId,
      documentTitle: draft.serviceName,
      dueDate,
    };
    updateState((current) => ({
      ...current,
      reminders: [
        reminder,
        ...current.reminders.filter((item) => item.id !== reminder.id),
      ],
    }));
    await upsertStructuredReminder(reminder);
    setMessage("Review reminder added.");
  };
  const openDocument = async () => {
    if (!draft) return;
    setOpening(true);
    setMessage("");
    try {
      await openPrivateDocument(draft.storageBucket, draft.storagePath);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to open the contract document.",
      );
    } finally {
      setOpening(false);
    }
  };
  return {
    draft,
    tab,
    message,
    opening,
    setTab,
    update,
    save,
    addReminder,
    openDocument,
  };
}

export type ContractDetailController = ReturnType<typeof useContractDetail>;
