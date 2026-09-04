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
import {
  latestMileage,
  vehicleDisplayName,
  type VehicleMotRecord,
  type VehicleRecord,
} from "@/lib/vehicle-records";

import {
  type DocumentFilter,
  emptyMotDraft,
  emptyTaxDraft,
  formatMotDate,
  motAudit,
  motNumber,
  type MotTaxDialog,
  type MotTaxView,
} from "./mot-tax-model";

function useMotTaxController(vehicleId: string, view: MotTaxView) {
  const { state, hydrated, updateState } = useDiaryDockData();
  const vehicle = state.vehicles.vehicles.find((item) => item.id === vehicleId);
  const [dialog, setDialog] = useState<MotTaxDialog>(null);
  const [message, setMessage] = useState("");
  const [documentFilter, setDocumentFilter] = useState<DocumentFilter>("All");
  const [motDraft, setMotDraft] = useState(emptyMotDraft);
  const [taxDraft, setTaxDraft] = useState(emptyTaxDraft);

  const linkedDocuments = useMemo(() => {
    if (!vehicle) return [];
    const linked = new Set(vehicle.documentIds);
    return state.vaultDocuments.filter((document) => linked.has(document.id));
  }, [state.vaultDocuments, vehicle]);
  const complianceDocuments = linkedDocuments.filter((document) =>
    /\bmot\b|road tax|vehicle tax|tax receipt|tax disc/i.test(
      `${document.title} ${document.category} ${document.extractionSummary ?? ""}`,
    ),
  );
  const filteredDocuments = complianceDocuments.filter(
    (document) =>
      documentFilter === "All" ||
      (documentFilter === "MOT"
        ? /\bmot\b/i.test(document.title)
        : /tax/i.test(document.title)),
  );
  const garageReminders = state.reminders.filter(
    (reminder) => reminder.roomId === "garage" && reminder.group !== "done",
  );
  const mileage = vehicle ? latestMileage(vehicle) : null;
  const vehicleName = vehicle ? vehicleDisplayName(vehicle) : "Vehicle";
  const base = `/garage/vehicles/${vehicleId}/mot-tax`;

  const updateVehicle = (next: VehicleRecord) =>
    updateState((current) => ({
      ...current,
      vehicles: {
        vehicles: current.vehicles.vehicles.map((item) =>
          item.id === next.id ? next : item,
        ),
      },
    }));

  const openMot = () => {
    setMessage("");
    setDialog("mot");
  };

  const openTax = () => {
    if (!vehicle) return;
    setTaxDraft({
      renewalDate: vehicle.taxDueDate,
      amount: vehicle.roadTax.amount?.toString() ?? "",
      paymentFrequency: vehicle.roadTax.paymentFrequency,
      paidDate: vehicle.roadTax.paidDate,
      paymentReference: vehicle.roadTax.paymentReference,
      vehicleClass: vehicle.roadTax.vehicleClass,
      documentId: vehicle.roadTax.documentId ?? "",
    });
    setMessage("");
    setDialog("tax");
  };

  const saveMot = (event: FormEvent) => {
    event.preventDefault();
    if (!vehicle || !motDraft.testDate) {
      setMessage("Add the MOT test date.");
      return;
    }
    const record: VehicleMotRecord = {
      id: crypto.randomUUID(),
      testDate: motDraft.testDate,
      result: motDraft.result,
      mileage: motNumber(motDraft.mileage),
      advisoryCount: Math.max(0, motNumber(motDraft.advisoryCount) ?? 0),
      notes: motDraft.notes.trim(),
      documentId: motDraft.documentId || undefined,
      createdAt: new Date().toISOString(),
    };
    updateVehicle({
      ...vehicle,
      motHistory: [record, ...vehicle.motHistory],
      audit: [
        motAudit(
          `MOT ${record.result} recorded for ${formatMotDate(record.testDate)}`,
        ),
        ...vehicle.audit,
      ],
      updatedAt: new Date().toISOString(),
    });
    setMotDraft(emptyMotDraft);
    setDialog(null);
  };

  const saveTax = (event: FormEvent) => {
    event.preventDefault();
    if (!vehicle) return;
    updateVehicle({
      ...vehicle,
      taxDueDate: taxDraft.renewalDate,
      roadTax: {
        amount: motNumber(taxDraft.amount),
        paymentFrequency: taxDraft.paymentFrequency.trim(),
        paidDate: taxDraft.paidDate,
        paymentReference: taxDraft.paymentReference.trim(),
        vehicleClass: taxDraft.vehicleClass.trim(),
        documentId: taxDraft.documentId || undefined,
      },
      audit: [motAudit("Road tax details updated"), ...vehicle.audit],
      updatedAt: new Date().toISOString(),
    });
    setDialog(null);
  };

  return {
    base,
    complianceDocuments,
    dialog,
    documentFilter,
    filteredDocuments,
    garageReminders,
    hydrated,
    message,
    mileage,
    motDraft,
    openMot,
    openTax,
    saveMot,
    saveTax,
    setDialog,
    setDocumentFilter,
    setMessage,
    setMotDraft,
    setTaxDraft,
    taxDraft,
    vehicle,
    vehicleName,
    view,
  };
}

export type MotTaxController = ReturnType<typeof useMotTaxController>;
const MotTaxContext = createContext<MotTaxController | null>(null);

export function MotTaxProvider({
  vehicleId,
  view,
  children,
}: {
  vehicleId: string;
  view: MotTaxView;
  children: ReactNode;
}) {
  const value = useMotTaxController(vehicleId, view);
  return (
    <MotTaxContext.Provider value={value}>{children}</MotTaxContext.Provider>
  );
}

export function useMotTax() {
  const value = useContext(MotTaxContext);
  if (!value) throw new Error("MOT and tax provider is missing.");
  return value;
}
