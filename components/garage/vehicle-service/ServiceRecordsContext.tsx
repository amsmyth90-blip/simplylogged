"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { Reminder } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";
import {
  latestMileage,
  vehicleDisplayName,
  type VehicleRecord,
  type VehicleServiceEntry,
  type VehicleServiceKind,
} from "@/lib/vehicle-records";

import { downloadServiceSummary } from "./download-service-summary";
import {
  duplicateServiceDraft,
  editServiceDraft,
  emptyReminderDraft,
  emptyServiceDraft,
  formatServiceDate,
  newServiceDraft,
  type ServiceDialog,
  type ServiceHistoryFilter,
  type ServiceRecordsView,
} from "./service-model";
import { buildServiceEntry, saveServiceRecord } from "./service-records";

function useServiceRecordsController(
  vehicleId: string,
  view: ServiceRecordsView,
  serviceId?: string,
) {
  const { state, hydrated, repositoryMode, updateState } = useDiaryDockData();
  const vehicle = state.vehicles.vehicles.find((item) => item.id === vehicleId);
  const [dialog, setDialog] = useState<ServiceDialog>(null);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceDraft, setServiceDraft] = useState(emptyServiceDraft);
  const [reminderDraft, setReminderDraft] = useState(emptyReminderDraft);
  const [historyFilter, setHistoryFilter] =
    useState<ServiceHistoryFilter>("all");
  const [historyAscending, setHistoryAscending] = useState(false);
  const [exporting, setExporting] = useState(false);

  const vehicleDocuments = useMemo(() => {
    if (!vehicle) return [];
    const linked = new Set(vehicle.documentIds);
    return state.vaultDocuments.filter(
      (document) => linked.has(document.id) && document.kind !== "Image",
    );
  }, [state.vaultDocuments, vehicle]);
  const serviceRecords =
    vehicle?.services.filter((entry) => entry.kind !== "repair") ?? [];
  const repairRecords =
    vehicle?.services.filter((entry) => entry.kind === "repair") ?? [];
  const serviceRecord = serviceId
    ? serviceRecords.find((entry) => entry.id === serviceId)
    : undefined;
  const vehicleName = vehicle ? vehicleDisplayName(vehicle) : "Vehicle";
  const mileage = vehicle ? (latestMileage(vehicle)?.mileage ?? null) : null;
  const base = `/garage/vehicles/${vehicleId}/servicing`;
  const serviceReminders = state.reminders.filter(
    (reminder) =>
      reminder.roomId === "garage" &&
      reminder.group !== "done" &&
      /service|maintenance|tyre|brake|battery|oil|wiper/i.test(
        `${reminder.title} ${reminder.note ?? ""}`,
      ),
  );

  const updateVehicle = (next: VehicleRecord) =>
    updateState((current) => ({
      ...current,
      vehicles: {
        vehicles: current.vehicles.vehicles.map((item) =>
          item.id === next.id ? next : item,
        ),
      },
    }));

  const openNewService = (
    kind: Exclude<VehicleServiceKind, "repair"> = "service",
  ) => {
    if (!vehicle) return;
    setEditingId(null);
    setServiceDraft(newServiceDraft(vehicle, kind));
    setMessage("");
    setDialog("service");
  };

  const openEditService = (entry: VehicleServiceEntry) => {
    if (!vehicle) return;
    setEditingId(entry.id);
    setServiceDraft(editServiceDraft(vehicle, entry));
    setMessage("");
    setDialog("service");
  };

  const duplicateService = (entry: VehicleServiceEntry) => {
    setEditingId(null);
    setServiceDraft(duplicateServiceDraft(entry));
    setMessage("Check the copied details, then add the new date and mileage.");
    setDialog("service");
  };

  const saveService = (event: FormEvent) => {
    event.preventDefault();
    if (!vehicle || !serviceDraft.title.trim() || !serviceDraft.date) {
      setMessage("Add a service title and date.");
      return;
    }
    const entry = buildServiceEntry(vehicle, serviceDraft, editingId);
    updateVehicle(saveServiceRecord(vehicle, entry, serviceDraft, editingId));
    setServiceDraft(emptyServiceDraft);
    setEditingId(null);
    setMessage("");
    setDialog(null);
  };

  const openReminder = () => {
    setReminderDraft({
      title: `Service ${vehicleName}`,
      dueDate: vehicle?.nextServiceDate ?? "",
      note: "",
    });
    setMessage("");
    setDialog("reminder");
  };

  const saveReminder = (event: FormEvent) => {
    event.preventDefault();
    if (!reminderDraft.title.trim() || !reminderDraft.dueDate) {
      setMessage("Add a reminder title and due date.");
      return;
    }
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: reminderDraft.title.trim(),
      note: reminderDraft.note.trim(),
      roomId: "garage",
      roomName: "Garage",
      group: "later",
      timeLabel: formatServiceDate(reminderDraft.dueDate),
      dueDate: reminderDraft.dueDate,
      priority: "normal",
    };
    updateState((current) => ({
      ...current,
      reminders: [reminder, ...current.reminders],
    }));
    if (repositoryMode === "supabase") void upsertStructuredReminder(reminder);
    setReminderDraft(emptyReminderDraft);
    setMessage("");
    setDialog(null);
  };

  const toggleDocument = (documentId: string) =>
    setServiceDraft((draft) => ({
      ...draft,
      documentIds: draft.documentIds.includes(documentId)
        ? draft.documentIds.filter((id) => id !== documentId)
        : [...draft.documentIds, documentId],
    }));

  const exportSummary = async () => {
    if (!vehicle) return;
    setExporting(true);
    try {
      await downloadServiceSummary(
        vehicleName,
        vehicle.registration,
        serviceRecords,
      );
    } finally {
      setExporting(false);
    }
  };

  return {
    base,
    dialog,
    duplicateService,
    editingId,
    exporting,
    exportSummary,
    historyAscending,
    historyFilter,
    hydrated,
    message,
    mileage,
    openEditService,
    openNewService,
    openReminder,
    reminderDraft,
    repairRecords,
    saveReminder,
    saveService,
    serviceDraft,
    serviceRecord,
    serviceRecords,
    serviceReminders,
    setDialog,
    setHistoryAscending,
    setHistoryFilter,
    setMessage,
    setReminderDraft,
    setServiceDraft,
    state,
    toggleDocument,
    vehicle,
    vehicleDocuments,
    vehicleName,
    view,
  };
}

export type ServiceRecordsController = ReturnType<
  typeof useServiceRecordsController
>;

const ServiceRecordsContext = createContext<ServiceRecordsController | null>(
  null,
);

export function ServiceRecordsProvider({
  vehicleId,
  view,
  serviceId,
  children,
}: {
  vehicleId: string;
  view: ServiceRecordsView;
  serviceId?: string;
  children: ReactNode;
}) {
  const value = useServiceRecordsController(vehicleId, view, serviceId);
  return (
    <ServiceRecordsContext.Provider value={value}>
      {children}
    </ServiceRecordsContext.Provider>
  );
}

export function useServiceRecords() {
  const value = useContext(ServiceRecordsContext);
  if (!value) throw new Error("Service records provider is missing.");
  return value;
}
