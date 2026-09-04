import type { VehicleRecord, VehicleServiceEntry } from "@/lib/vehicle-records";

import {
  cleanWorkItems,
  serviceAudit,
  serviceNumber,
  type ServiceDraft,
} from "./service-model";

export function buildServiceEntry(
  vehicle: VehicleRecord,
  draft: ServiceDraft,
  editingId: string | null,
): VehicleServiceEntry {
  const existing = vehicle.services.find((entry) => entry.id === editingId);
  return {
    id: editingId ?? crypto.randomUUID(),
    kind: draft.kind,
    title: draft.title.trim(),
    provider: draft.provider.trim(),
    date: draft.date,
    mileage: serviceNumber(draft.mileage),
    cost: serviceNumber(draft.cost),
    paymentMethod: draft.paymentMethod.trim(),
    workItems: cleanWorkItems(draft.workItems),
    notes: draft.notes.trim(),
    nextServiceDate: draft.nextServiceDate,
    nextServiceMileage: serviceNumber(draft.nextServiceMileage),
    documentIds: draft.documentIds,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
}

export function saveServiceRecord(
  vehicle: VehicleRecord,
  entry: VehicleServiceEntry,
  draft: ServiceDraft,
  editingId: string | null,
): VehicleRecord {
  return {
    ...vehicle,
    nextServiceDate: draft.nextServiceDate || vehicle.nextServiceDate,
    nextServiceMileage:
      serviceNumber(draft.nextServiceMileage) ?? vehicle.nextServiceMileage,
    services: editingId
      ? vehicle.services.map((item) => (item.id === editingId ? entry : item))
      : [entry, ...vehicle.services],
    audit: [
      serviceAudit(
        `${editingId ? "Updated" : "Added"} ${entry.kind === "inspection" ? "maintenance" : "service"} record: ${entry.title}`,
      ),
      ...vehicle.audit,
    ],
    updatedAt: new Date().toISOString(),
  };
}
