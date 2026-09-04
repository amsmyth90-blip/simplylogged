import type { VehicleExpense, VehicleRecord } from "@/lib/vehicle-records";

import { numberOrNull, type ReceiptDraft, vehicleAudit } from "./receipt-model";

export function updateReceiptRecord(
  vehicle: VehicleRecord,
  receipt: VehicleExpense,
  draft: ReceiptDraft,
  amount: number,
): VehicleRecord {
  return {
    ...vehicle,
    expenses: vehicle.expenses.map((expense) =>
      expense.id === receipt.id
        ? {
            ...expense,
            title: draft.title.trim(),
            provider: draft.provider.trim(),
            date: draft.date,
            amount,
            category: draft.category,
            mileage: numberOrNull(draft.mileage),
            paymentMethod: draft.paymentMethod.trim(),
            receiptNumber: draft.receiptNumber.trim(),
            notes: draft.notes.trim(),
            linkedServiceId: draft.linkedServiceId || undefined,
          }
        : expense,
    ),
    audit: [
      vehicleAudit(`Receipt updated: ${draft.title.trim()}`),
      ...vehicle.audit,
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function removeReceiptRecord(
  vehicle: VehicleRecord,
  receipt: VehicleExpense,
): VehicleRecord {
  return {
    ...vehicle,
    documentIds: vehicle.documentIds.filter((id) => id !== receipt.documentId),
    services: vehicle.services.map((service) => ({
      ...service,
      documentIds: service.documentIds.filter(
        (id) => id !== receipt.documentId,
      ),
    })),
    expenses: vehicle.expenses.filter((expense) => expense.id !== receipt.id),
    audit: [
      vehicleAudit(`Receipt deleted: ${receipt.title}`),
      ...vehicle.audit,
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function replaceReceiptDocumentRecord(
  vehicle: VehicleRecord,
  receipt: VehicleExpense,
  previousDocumentId: string,
  nextDocumentId: string,
): VehicleRecord {
  return {
    ...vehicle,
    documentIds: [
      nextDocumentId,
      ...vehicle.documentIds.filter((id) => id !== previousDocumentId),
    ],
    services: vehicle.services.map((service) => ({
      ...service,
      documentIds: service.documentIds.map((id) =>
        id === previousDocumentId ? nextDocumentId : id,
      ),
    })),
    expenses: vehicle.expenses.map((expense) =>
      expense.id === receipt.id
        ? { ...expense, documentId: nextDocumentId }
        : expense,
    ),
    audit: [
      vehicleAudit(`Receipt document replaced: ${receipt.title}`),
      ...vehicle.audit,
    ],
    updatedAt: new Date().toISOString(),
  };
}
