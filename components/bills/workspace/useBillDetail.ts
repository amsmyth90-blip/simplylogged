import { useEffect, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  formatBillDate,
  formatMoney,
  type BillRecord,
} from "@/lib/bill-records";
import { openPrivateDocument } from "@/lib/document-storage";
import type { Reminder } from "@/lib/mock-data";
import {
  upsertStructuredDocument,
  upsertStructuredReminder,
} from "@/lib/structured-data";

export type UpdateBillField = <Key extends keyof BillRecord>(
  key: Key,
  value: BillRecord[Key],
) => void;

function historyFor(original: BillRecord, draft: BillRecord) {
  const changed =
    original.reviewStatus === "reviewed" &&
    (original.amount !== draft.amount || original.dueDate !== draft.dueDate);
  if (!changed && original.history.length) return original.history;
  return [
    ...original.history,
    {
      id: crypto.randomUUID(),
      amount: draft.amount,
      dueDate: draft.dueDate,
      recordedAt: new Date().toISOString(),
    },
  ];
}

export function useBillDetail(billId: string) {
  const { state, updateState } = useDiaryDockData();
  const bill = state.bills.bills.find((item) => item.id === billId);
  const [draft, setDraft] = useState<BillRecord>();
  const [message, setMessage] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (bill && draft?.id !== bill.id) setDraft(bill);
  }, [bill, draft?.id]);

  const update: UpdateBillField = (key, value) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  async function save() {
    if (!bill || !draft) return;
    if (!draft.title.trim() && !draft.provider.trim()) {
      setMessage("Add a bill title or provider before confirming.");
      return;
    }
    const now = new Date().toISOString();
    const updated: BillRecord = {
      ...draft,
      history: historyFor(bill, draft),
      reviewStatus: "reviewed",
      status: draft.status === "draft" ? "active" : draft.status,
      title: draft.title.trim() || `${draft.provider} bill`,
      updatedAt: now,
    };
    updateState((current) => ({
      ...current,
      bills: {
        bills: current.bills.bills.map((item) =>
          item.id === billId ? updated : item,
        ),
      },
      vaultDocuments: current.vaultDocuments.map((document) =>
        document.id === updated.documentId
          ? {
              ...document,
              dueDate: updated.dueDate,
              issuer: updated.provider,
              reviewStatus: "reviewed",
              reviewedAt: now,
              title: updated.title,
            }
          : document,
      ),
    }));
    const document = state.vaultDocuments.find(
      (item) => item.id === updated.documentId,
    );
    if (document) {
      await upsertStructuredDocument({
        ...document,
        dueDate: updated.dueDate,
        issuer: updated.provider,
        reviewStatus: "reviewed",
        reviewedAt: now,
        title: updated.title,
      });
    }
    setDraft(updated);
    setMessage("Details checked and saved.");
  }

  async function addReminder() {
    if (!draft?.dueDate) {
      setMessage("Add a due date first.");
      return;
    }
    const reminder: Reminder = {
      documentId: draft.documentId,
      documentTitle: draft.title,
      dueDate: draft.dueDate,
      group: "later",
      id: crypto.randomUUID(),
      note: `Amount recorded: ${formatMoney(draft.amount)}. Check the original bill before paying.`,
      priority: "normal",
      roomId: "office",
      roomName: "Office",
      timeLabel: formatBillDate(draft.dueDate),
      title: `Pay ${draft.title || draft.provider || "bill"}`,
    };
    updateState((current) => ({
      ...current,
      reminders: [reminder, ...current.reminders],
    }));
    await upsertStructuredReminder(reminder);
    setMessage("Due-date reminder added.");
  }

  async function viewDocument() {
    if (!draft) return;
    setOpening(true);
    setMessage("");
    try {
      await openPrivateDocument(draft.storageBucket, draft.storagePath);
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Unable to open the bill.",
      );
    } finally {
      setOpening(false);
    }
  }

  return {
    addReminder,
    bill,
    draft,
    message,
    opening,
    save,
    update,
    viewDocument,
  };
}

export type BillDetailModel = ReturnType<typeof useBillDetail>;
