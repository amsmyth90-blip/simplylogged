import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  uploadPrivateDocument,
  validateDocumentFile,
} from "@/lib/document-storage";
import type { VaultDocument } from "@/lib/mock-data";
import { documentKind, formatFileSize } from "@/lib/presentation";
import { deleteStructuredDocument, upsertStructuredDocument } from "@/lib/structured-data";
import type { VehicleExpense, VehicleRecord } from "@/lib/vehicle-records";

import {
  formatReceiptDate,
  money,
  numberOrNull,
  receiptDraft,
} from "./receipt-model";
import {
  removeReceiptRecord,
  replaceReceiptDocumentRecord,
  updateReceiptRecord,
} from "./receipt-records";

export function useReceiptDetail(
  vehicle: VehicleRecord,
  receipt: VehicleExpense,
  document: VaultDocument | undefined,
  base: string,
) {
  const router = useRouter();
  const { repositoryMode, updateState } = useDiaryDockData();
  const [draft, setDraft] = useState(() => receiptDraft(receipt));
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const openEdit = () => {
    setDraft(receiptDraft(receipt));
    setMessage("");
    setEditing(true);
  };

  const saveEdit = (event: FormEvent) => {
    event.preventDefault();
    const amount = numberOrNull(draft.amount);
    if (!draft.title.trim() || !draft.date || amount === null || amount < 0) {
      setMessage("Add the receipt title, date and total amount.");
      return;
    }

    updateVehicle(updateReceiptRecord(vehicle, receipt, draft, amount));
    setEditing(false);
  };

  const deleteReceipt = async () => {
    if (
      !window.confirm(
        `Delete “${receipt.title}” and its stored receipt? This cannot be undone.`,
      )
    ) {
      return;
    }

    setWorking(true);
    try {
      if (document && repositoryMode === "supabase") {
        await deleteStructuredDocument(document);
      }
      updateState((current) => ({
        ...current,
        vaultDocuments: current.vaultDocuments.filter(
          (item) => item.id !== receipt.documentId,
        ),
        vehicles: {
          vehicles: current.vehicles.vehicles.map((item) =>
            item.id === vehicle.id ? removeReceiptRecord(item, receipt) : item,
          ),
        },
      }));
      router.push(base);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to delete this receipt.",
      );
      setWorking(false);
    }
  };

  const replaceReceipt = async (event: ChangeEvent<HTMLInputElement>) => {
    const replacement = event.target.files?.[0];
    if (!replacement || !document) return;

    const validation = validateDocumentFile(replacement);
    if (validation) {
      setMessage(validation);
      return;
    }

    setWorking(true);
    const nextId = crypto.randomUUID();
    try {
      const stored =
        repositoryMode === "supabase"
          ? await uploadPrivateDocument(replacement, nextId)
          : null;
      const nextDocument: VaultDocument = {
        ...document,
        id: nextId,
        kind: documentKind(replacement),
        size: formatFileSize(replacement.size),
        updated: "Just now",
        storageBucket: stored?.bucket,
        storagePath: stored?.path,
        originalFileName: replacement.name,
        mimeType: replacement.type,
        reviewStatus: "needs-review",
        reviewedAt: undefined,
        reviewReasons: [
          "The receipt file was replaced. Recheck the saved details against the new original.",
        ],
      };
      updateState((current) => ({
        ...current,
        vaultDocuments: [
          nextDocument,
          ...current.vaultDocuments.filter((item) => item.id !== document.id),
        ],
        vehicles: {
          vehicles: current.vehicles.vehicles.map((item) =>
            item.id === vehicle.id
              ? replaceReceiptDocumentRecord(item, receipt, document.id, nextId)
              : item,
          ),
        },
      }));
      await upsertStructuredDocument(nextDocument);
      await deleteStructuredDocument(document);
      setMessage(
        "Receipt document replaced. Recheck the saved details against the new original.",
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to replace this receipt.",
      );
    } finally {
      setWorking(false);
      event.target.value = "";
    }
  };

  const shareReceipt = async () => {
    const summary = `${receipt.title} · ${formatReceiptDate(receipt.date)} · ${money(receipt.amount)}`;
    if (navigator.share) {
      await navigator.share({
        title: `DiaryDock receipt: ${receipt.title}`,
        text: summary,
      });
      return;
    }
    await navigator.clipboard.writeText(summary);
    setMessage("Receipt summary copied. The private document was not shared.");
  };

  const updateVehicle = (nextVehicle: VehicleRecord) =>
    updateState((current) => ({
      ...current,
      vehicles: {
        vehicles: current.vehicles.vehicles.map((item) =>
          item.id === vehicle.id ? nextVehicle : item,
        ),
      },
    }));

  return {
    deleteReceipt,
    draft,
    editing,
    message,
    openEdit,
    replaceReceipt,
    saveEdit,
    setDraft,
    setEditing,
    setMessage,
    shareReceipt,
    working,
  };
}
