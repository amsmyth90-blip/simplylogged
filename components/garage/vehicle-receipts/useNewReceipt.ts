import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  uploadPrivateDocument,
  validateDocumentFile,
} from "@/lib/document-storage";
import type { VaultDocument } from "@/lib/mock-data";
import { documentKind, formatFileSize } from "@/lib/presentation";
import type { ReceiptDocumentAnalysis } from "@/lib/receipt-document-analysis";
import { upsertStructuredDocument } from "@/lib/structured-data";
import type { VehicleExpense, VehicleRecord } from "@/lib/vehicle-records";

import { emptyReceiptDraft, numberOrNull, vehicleAudit } from "./receipt-model";

export function useNewReceipt(vehicle: VehicleRecord, base: string) {
  const router = useRouter();
  const { repositoryMode, updateState } = useDiaryDockData();
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState(emptyReceiptDraft);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const analyseReceipt = async (selected: File) => {
    const validation = validateDocumentFile(selected);
    if (validation) {
      setMessage(validation);
      return;
    }

    setFile(selected);
    setWorking(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("analysisMode", "receipt");
      form.append("files", selected);
      const response = await fetch("/api/capture/extract", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        receiptAnalysis?: ReceiptDocumentAnalysis;
        error?: string;
      };
      if (!response.ok || !payload.receiptAnalysis) {
        throw new Error(
          payload.error || "DiaryDock could not read this receipt.",
        );
      }

      const result = payload.receiptAnalysis;
      setDraft({
        title: result.title || selected.name.replace(/\.[^.]+$/, ""),
        provider: result.merchant,
        date: result.date,
        amount: result.amount ? String(result.amount) : "",
        category: result.category,
        mileage: result.mileage?.toString() ?? "",
        paymentMethod: result.paymentMethod,
        receiptNumber: result.receiptNumber,
        notes: result.summary,
        linkedServiceId: "",
      });
      setMessage(
        result.reviewReasons.length
          ? "DiaryDock suggested these details. Check the highlighted information against the original before saving."
          : "Receipt read. Please check every detail before saving.",
      );
    } catch (reason) {
      setDraft({
        ...emptyReceiptDraft,
        title: selected.name.replace(/\.[^.]+$/, ""),
      });
      setMessage(
        `${reason instanceof Error ? reason.message : "The receipt could not be read automatically."} Enter and check the details manually.`,
      );
    } finally {
      setWorking(false);
    }
  };

  const saveReceipt = async (event: FormEvent) => {
    event.preventDefault();
    const amount = numberOrNull(draft.amount);
    if (
      !file ||
      !draft.title.trim() ||
      !draft.date ||
      amount === null ||
      amount < 0
    ) {
      setMessage("Choose a receipt and add its title, date and total amount.");
      return;
    }

    setWorking(true);
    const documentId = crypto.randomUUID();
    const expenseId = crypto.randomUUID();
    try {
      const stored =
        repositoryMode === "supabase"
          ? await uploadPrivateDocument(file, documentId)
          : null;
      const document: VaultDocument = {
        id: documentId,
        title: draft.title.trim(),
        category: "Vehicle receipts",
        kind: documentKind(file),
        size: formatFileSize(file.size),
        updated: "Just now",
        storageBucket: stored?.bucket,
        storagePath: stored?.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "garage",
        roomName: "Garage",
        issuer: draft.provider.trim(),
        extractionSummary: draft.notes.trim(),
        reviewStatus: "reviewed",
        reviewedAt: "Just now",
      };
      const expense: VehicleExpense = {
        id: expenseId,
        category: draft.category,
        title: draft.title.trim(),
        provider: draft.provider.trim(),
        amount,
        date: draft.date,
        mileage: numberOrNull(draft.mileage),
        paymentMethod: draft.paymentMethod.trim(),
        receiptNumber: draft.receiptNumber.trim(),
        linkedServiceId: draft.linkedServiceId || undefined,
        documentId,
        notes: draft.notes.trim(),
        createdAt: new Date().toISOString(),
      };

      updateState((current) => ({
        ...current,
        vaultDocuments: [
          document,
          ...current.vaultDocuments.filter((item) => item.id !== documentId),
        ],
        vehicles: {
          vehicles: current.vehicles.vehicles.map((item) =>
            item.id === vehicle.id
              ? addReceiptToVehicle(item, expense, documentId)
              : item,
          ),
        },
      }));
      await upsertStructuredDocument(document);
      router.push(`${base}/${expenseId}`);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to save this receipt.",
      );
      setWorking(false);
    }
  };

  return {
    analyseReceipt,
    draft,
    file,
    message,
    saveReceipt,
    setDraft,
    working,
  };
}

function addReceiptToVehicle(
  vehicle: VehicleRecord,
  expense: VehicleExpense,
  documentId: string,
): VehicleRecord {
  const linkedServiceId = expense.linkedServiceId;
  return {
    ...vehicle,
    documentIds: vehicle.documentIds.includes(documentId)
      ? vehicle.documentIds
      : [documentId, ...vehicle.documentIds],
    services: linkedServiceId
      ? vehicle.services.map((service) =>
          service.id === linkedServiceId
            ? {
                ...service,
                documentIds: service.documentIds.includes(documentId)
                  ? service.documentIds
                  : [documentId, ...service.documentIds],
              }
            : service,
        )
      : vehicle.services,
    expenses: [expense, ...vehicle.expenses],
    audit: [vehicleAudit(`Receipt added: ${expense.title}`), ...vehicle.audit],
    updatedAt: new Date().toISOString(),
  };
}
