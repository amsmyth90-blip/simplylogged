"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { BillsCard, fieldClass } from "@/components/bills/BillsUi";
import {
  VehicleCostsPanel,
  type VehicleCostView,
} from "@/components/garage/VehicleCostsPanel";
import { GarageVehicleSectionNav } from "@/components/garage/GarageVehicleSectionNav";
import {
  getPrivateDocumentUrl,
  uploadPrivateDocument,
} from "@/lib/document-storage";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import {
  upsertStructuredDocument,
  upsertStructuredReminder,
} from "@/lib/structured-data";
import {
  latestMileage,
  vehicleDisplayName,
  type VehicleExpense,
  type VehicleNote,
  type VehicleOwnershipStatus,
  type VehicleRecord,
  type VehicleServiceEntry,
  type VehicleServiceKind,
} from "@/lib/vehicle-records";

export type VehicleTab = "overview" | "servicing" | "repairs" | "costs" | "documents" | "notes";
type DialogKind = "vehicle" | "mileage" | "service" | "expense" | "note" | "reminder" | null;

const profileTabs: { id: VehicleTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "notes", label: "Photos & Notes" },
];

const serviceTabs: { id: VehicleTab; label: string }[] = [
  { id: "servicing", label: "Servicing" },
  { id: "repairs", label: "Repairs" },
];

const emptyVehicleDraft = {
  nickname: "",
  make: "",
  model: "",
  variant: "",
  registration: "",
  vin: "",
  year: "",
  colour: "",
  fuelType: "",
  transmission: "",
  drivetrain: "",
  engineSize: "",
  category: "",
  seatingCapacity: "",
  ownershipStatus: "unknown" as VehicleOwnershipStatus,
  keeperName: "",
  purchaseDate: "",
  purchasePrice: "",
  currentValue: "",
  currentValueUpdatedAt: "",
  motDueDate: "",
  taxDueDate: "",
  insuranceRenewalDate: "",
  nextServiceDate: "",
  breakdownRenewalDate: "",
  financeProvider: "",
  financeAgreementEndDate: "",
  warrantyProvider: "",
  warrantyEndDate: "",
};

const emptyServiceDraft = {
  kind: "service" as VehicleServiceKind,
  title: "",
  provider: "",
  date: "",
  nextServiceDate: "",
  mileage: "",
  cost: "",
  notes: "",
};

const emptyExpenseDraft = {
  category: "Other" as VehicleExpense["category"],
  title: "",
  provider: "",
  amount: "",
  date: "",
  mileage: "",
  paymentMethod: "",
  recurring: false,
  linkedServiceId: "",
  documentId: "",
  notes: "",
};

function formatDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Not recorded";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function daysUntil(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`).getTime();
  if (Number.isNaN(date)) return null;
  return Math.ceil((date - Date.now()) / 86_400_000);
}

function dateHelper(value: string) {
  const days = daysUntil(value);
  if (days === null) return { text: "Add date", tone: "text-[#667068]" };
  if (days < 0) return { text: `${Math.abs(days)} days overdue`, tone: "text-[#a4473d]" };
  if (days === 0) return { text: "Due today", tone: "text-[#a4473d]" };
  if (days <= 30) return { text: `${days} days left`, tone: "text-[#a46b2c]" };
  return { text: `in ${days} days`, tone: "text-[#317047]" };
}

function inputNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function imageSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function cleanText(value: string) {
  return value
    .replaceAll("Ã¢â‚¬â€", "—")
    .replaceAll("â€”", "—")
    .replaceAll("Â·", "·");
}

function vehicleDocumentCategory(document: VaultDocument) {
  const text = `${document.title} ${document.category} ${document.extractionSummary ?? ""}`.toLowerCase();
  if (/insurance|policy certificate|motor cover/.test(text)) return "Insurance";
  if (/\bmot\b/.test(text)) return "MOT";
  if (/v5c|logbook|log book|registration certificate/.test(text)) return "V5C & ownership";
  if (/service history|service book|maintenance/.test(text)) return "Service history";
  if (/repair|mechanic|garage invoice/.test(text)) return "Repairs";
  if (/finance|lease|hire purchase|agreement/.test(text)) return "Finance";
  if (/warranty|guarantee/.test(text)) return "Warranties";
  if (/breakdown|roadside/.test(text)) return "Breakdown cover";
  return "Other";
}

function audit(action: string) {
  return { id: crypto.randomUUID(), action, createdAt: new Date().toISOString() };
}

function PrivateVehicleImage({ document, alt, className }: { document?: VaultDocument; alt: string; className: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getPrivateDocumentUrl(document?.storageBucket, document?.storagePath).then((nextUrl) => {
      if (active) setUrl(nextUrl);
    });
    return () => {
      active = false;
    };
  }, [document?.storageBucket, document?.storagePath]);

  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
}

function SectionHeading({ icon, title, detail, action }: { icon: IconName; title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#dde6d8] text-[#45604d]">
          <UiIcon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-[#20352a]">{title}</h2>
          {detail ? <p className="mt-1 text-[12px] leading-5 text-[#667068]">{detail}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-5 border-b border-[#20352a]/[0.06] py-2.5 last:border-0">
      <dt className="text-[12px] text-[#667068]">{label}</dt>
      <dd className="max-w-[58%] text-right text-[13px] font-semibold text-[#20352a]">{value || "Not recorded"}</dd>
    </div>
  );
}

function EmptyState({ icon, title, detail, action }: { icon: IconName; title: string; detail: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#6f8e72]/35 bg-[#f7f7f1] px-5 py-8 text-center">
      <UiIcon name={icon} className="mx-auto h-7 w-7 text-[#6f8e72]" />
      <p className="mt-3 text-sm font-semibold text-[#20352a]">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-[#667068]">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-[17px] border border-[#20352a]/[0.07] bg-white px-2 text-center text-[11px] font-semibold text-[#20352a] transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3e9] text-[#45604d]"><UiIcon name={icon} className="h-[18px] w-[18px]" /></span>
      {label}
    </button>
  );
}

export function VehicleProfileWorkspace({ vehicleId, initialTab = "overview", initialCostsView = "overview" }: { vehicleId: string; initialTab?: VehicleTab; initialCostsView?: VehicleCostView }) {
  const router = useRouter();
  const { state, hydrated, repositoryMode, updateState } = useLifeDockData();
  const tab = initialTab;
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const vehicle = state.vehicles.vehicles.find((item) => item.id === vehicleId);
  const [vehicleDraft, setVehicleDraft] = useState(emptyVehicleDraft);
  const [mileageDraft, setMileageDraft] = useState({ mileage: "", date: "", note: "" });
  const [serviceDraft, setServiceDraft] = useState(emptyServiceDraft);
  const [expenseDraft, setExpenseDraft] = useState(emptyExpenseDraft);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState({ kind: "general" as VehicleNote["kind"], title: "", content: "" });
  const [reminderDraft, setReminderDraft] = useState({ title: "", date: "", note: "" });

  const garageDocuments = useMemo(() => {
    if (!vehicle) return [];
    const linked = new Set(vehicle.documentIds);
    return state.vaultDocuments.filter((document) => linked.has(document.id));
  }, [state.vaultDocuments, vehicle]);

  const unlinkedGarageDocuments = useMemo(() => {
    if (!vehicle) return [];
    const linked = new Set(
      state.vehicles.vehicles.flatMap((item) => item.documentIds),
    );
    return state.vaultDocuments.filter(
      (document) =>
        (document.roomId === "garage" || document.roomName === "Garage") &&
        !linked.has(document.id),
    );
  }, [state.vaultDocuments, state.vehicles.vehicles, vehicle]);

  const primaryPhoto = vehicle?.primaryPhotoDocumentId
    ? state.vaultDocuments.find((document) => document.id === vehicle.primaryPhotoDocumentId)
    : undefined;
  const photoDocuments = garageDocuments.filter((document) => document.kind === "Image");
  const regularDocuments = garageDocuments.filter((document) => document.kind !== "Image");
  const vehicleName = vehicle ? cleanText(vehicleDisplayName(vehicle)) : "Vehicle Profile";

  const updateVehicle = (updater: (current: VehicleRecord) => VehicleRecord) => {
    updateState((current) => ({
      ...current,
      vehicles: {
        vehicles: current.vehicles.vehicles.map((item) =>
          item.id === vehicleId ? updater(item) : item,
        ),
      },
    }));
  };

  const openVehicleEditor = () => {
    if (!vehicle) return;
    setVehicleDraft({
      nickname: vehicle.nickname,
      make: vehicle.make,
      model: vehicle.model,
      variant: vehicle.variant,
      registration: vehicle.registration,
      vin: vehicle.vin,
      year: vehicle.year?.toString() ?? "",
      colour: vehicle.colour,
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission,
      drivetrain: vehicle.drivetrain,
      engineSize: vehicle.engineSize,
      category: vehicle.category,
      seatingCapacity: vehicle.seatingCapacity?.toString() ?? "",
      ownershipStatus: vehicle.ownershipStatus,
      keeperName: vehicle.keeperName,
      purchaseDate: vehicle.purchaseDate,
      purchasePrice: vehicle.purchasePrice?.toString() ?? "",
      currentValue: vehicle.currentValue?.toString() ?? "",
      currentValueUpdatedAt: vehicle.currentValueUpdatedAt,
      motDueDate: vehicle.motDueDate,
      taxDueDate: vehicle.taxDueDate,
      insuranceRenewalDate: vehicle.insuranceRenewalDate,
      nextServiceDate: vehicle.nextServiceDate,
      breakdownRenewalDate: vehicle.breakdownRenewalDate,
      financeProvider: vehicle.financeProvider,
      financeAgreementEndDate: vehicle.financeAgreementEndDate,
      warrantyProvider: vehicle.warrantyProvider,
      warrantyEndDate: vehicle.warrantyEndDate,
    });
    setDialog("vehicle");
    setMoreOpen(false);
  };

  const saveVehicle = (event: FormEvent) => {
    event.preventDefault();
    if (!vehicleDraft.make.trim() && !vehicleDraft.model.trim()) {
      setMessage("Add a make or model before saving.");
      return;
    }
    const now = new Date().toISOString();
    updateVehicle((current) => ({
      ...current,
      ...vehicleDraft,
      year: inputNumber(vehicleDraft.year),
      seatingCapacity: inputNumber(vehicleDraft.seatingCapacity),
      purchasePrice: inputNumber(vehicleDraft.purchasePrice),
      currentValue: inputNumber(vehicleDraft.currentValue),
      audit: [audit("Vehicle details updated"), ...current.audit],
      updatedAt: now,
    }));
    setDialog(null);
    setMessage("");
  };

  const saveMileage = (event: FormEvent) => {
    event.preventDefault();
    const mileage = inputNumber(mileageDraft.mileage);
    if (mileage === null || mileage < 0 || !mileageDraft.date) {
      setMessage("Enter a valid mileage and recording date.");
      return;
    }
    updateVehicle((current) => ({
      ...current,
      mileage: [{ id: crypto.randomUUID(), mileage, recordedAt: mileageDraft.date, note: mileageDraft.note.trim() }, ...current.mileage],
      audit: [audit(`Mileage updated to ${mileage.toLocaleString("en-GB")} miles`), ...current.audit],
      updatedAt: new Date().toISOString(),
    }));
    setMileageDraft({ mileage: "", date: "", note: "" });
    setDialog(null);
    setMessage("");
  };

  const saveService = (event: FormEvent) => {
    event.preventDefault();
    if (!serviceDraft.title.trim() || !serviceDraft.date) {
      setMessage("Add a title and date for this record.");
      return;
    }
    const entry: VehicleServiceEntry = {
      id: crypto.randomUUID(),
      kind: serviceDraft.kind,
      title: serviceDraft.title.trim(),
      provider: serviceDraft.provider.trim(),
      date: serviceDraft.date,
      mileage: inputNumber(serviceDraft.mileage),
      cost: inputNumber(serviceDraft.cost),
      notes: serviceDraft.notes.trim(),
      documentIds: [],
      createdAt: new Date().toISOString(),
    };
    updateVehicle((current) => ({
      ...current,
      nextServiceDate: serviceDraft.nextServiceDate || current.nextServiceDate,
      services: [entry, ...current.services],
      audit: [audit(`${entry.kind === "repair" ? "Repair" : "Service"} record added: ${entry.title}`), ...current.audit],
      updatedAt: new Date().toISOString(),
    }));
    setServiceDraft(emptyServiceDraft);
    setDialog(null);
    setMessage("");
  };

  const saveExpense = (event: FormEvent) => {
    event.preventDefault();
    const amount = inputNumber(expenseDraft.amount);
    if (!expenseDraft.title.trim() || amount === null || amount < 0 || !expenseDraft.date) {
      setMessage("Add a title, valid amount and date.");
      return;
    }
    if (
      expenseDraft.linkedServiceId &&
      vehicle?.expenses.some(
        (expense) =>
          expense.id !== editingExpenseId &&
          expense.linkedServiceId === expenseDraft.linkedServiceId,
      )
    ) {
      setMessage("That service or repair is already linked to another expense.");
      return;
    }
    const existingExpense = vehicle?.expenses.find((expense) => expense.id === editingExpenseId);
    const entry: VehicleExpense = {
      id: editingExpenseId ?? crypto.randomUUID(),
      category: expenseDraft.category,
      title: expenseDraft.title.trim(),
      provider: expenseDraft.provider.trim(),
      amount,
      date: expenseDraft.date,
      mileage: inputNumber(expenseDraft.mileage),
      paymentMethod: expenseDraft.paymentMethod.trim(),
      recurring: expenseDraft.recurring,
      linkedServiceId: expenseDraft.linkedServiceId || undefined,
      documentId: expenseDraft.documentId || undefined,
      notes: expenseDraft.notes.trim(),
      createdAt: existingExpense?.createdAt ?? new Date().toISOString(),
    };
    updateVehicle((current) => ({
      ...current,
      expenses: editingExpenseId
        ? current.expenses.map((expense) => expense.id === editingExpenseId ? entry : expense)
        : [entry, ...current.expenses],
      audit: [audit(`Expense ${editingExpenseId ? "updated" : "added"}: ${entry.title}`), ...current.audit],
      updatedAt: new Date().toISOString(),
    }));
    setExpenseDraft(emptyExpenseDraft);
    setEditingExpenseId(null);
    setDialog(null);
    setMessage("");
  };

  const openNewExpense = () => {
    setExpenseDraft(emptyExpenseDraft);
    setEditingExpenseId(null);
    setMessage("");
    setDialog("expense");
  };

  const openExpenseEditor = (expense: VehicleExpense) => {
    setExpenseDraft({
      category: expense.category,
      title: expense.title,
      provider: expense.provider,
      amount: String(expense.amount),
      date: expense.date,
      mileage: expense.mileage?.toString() ?? "",
      paymentMethod: expense.paymentMethod ?? "",
      recurring: expense.recurring ?? false,
      linkedServiceId: expense.linkedServiceId ?? "",
      documentId: expense.documentId ?? "",
      notes: expense.notes,
    });
    setEditingExpenseId(expense.id);
    setMessage("");
    setDialog("expense");
  };

  const deleteExpense = () => {
    if (!editingExpenseId || !vehicle) return;
    const expense = vehicle.expenses.find((item) => item.id === editingExpenseId);
    if (!expense || !window.confirm(`Delete “${expense.title}”? This cannot be undone.`)) return;
    updateVehicle((current) => ({
      ...current,
      expenses: current.expenses.filter((item) => item.id !== editingExpenseId),
      audit: [audit(`Expense deleted: ${expense.title}`), ...current.audit],
      updatedAt: new Date().toISOString(),
    }));
    setExpenseDraft(emptyExpenseDraft);
    setEditingExpenseId(null);
    setDialog(null);
    setMessage("");
  };

  const saveNote = (event: FormEvent) => {
    event.preventDefault();
    if (!noteDraft.title.trim() || !noteDraft.content.trim()) {
      setMessage("Add a title and note before saving.");
      return;
    }
    const now = new Date().toISOString();
    const note: VehicleNote = {
      id: crypto.randomUUID(),
      kind: noteDraft.kind,
      title: noteDraft.title.trim(),
      content: noteDraft.content.trim(),
      photoDocumentIds: [],
      createdAt: now,
      updatedAt: now,
    };
    updateVehicle((current) => ({
      ...current,
      notes: [note, ...current.notes],
      audit: [audit(`${note.kind === "emergency" ? "Emergency information" : "Note"} added: ${note.title}`), ...current.audit],
      updatedAt: now,
    }));
    setNoteDraft({ kind: "general", title: "", content: "" });
    setDialog(null);
    setMessage("");
  };

  const saveReminder = async (event: FormEvent) => {
    event.preventDefault();
    if (!reminderDraft.title.trim() || !reminderDraft.date) {
      setMessage("Add a reminder title and date.");
      return;
    }
    const due = daysUntil(reminderDraft.date);
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: reminderDraft.title.trim(),
      note: reminderDraft.note.trim() || undefined,
      roomId: "garage",
      roomName: "Garage",
      group: due !== null && due <= 0 ? "today" : due !== null && due <= 7 ? "week" : "later",
      timeLabel: formatDate(reminderDraft.date),
      dueDate: reminderDraft.date,
      priority: due !== null && due <= 7 ? "high" : "normal",
    };
    updateState((current) => ({ ...current, reminders: [reminder, ...current.reminders] }));
    if (repositoryMode === "supabase") await upsertStructuredReminder(reminder);
    updateVehicle((current) => ({ ...current, audit: [audit(`Reminder added: ${reminder.title}`), ...current.audit] }));
    setReminderDraft({ title: "", date: "", note: "" });
    setDialog(null);
    setMessage("");
  };

  const addPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Choose a JPEG, PNG, WebP or HEIC image.");
      return;
    }
    setUploadingPhoto(true);
    setMessage("");
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const document: VaultDocument = {
        id,
        title: `${vehicleName} photo`,
        category: "Vehicles & Transport",
        kind: "Image",
        size: imageSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "garage",
        roomName: "Garage",
        reviewStatus: "reviewed",
        reviewedAt: new Date().toISOString(),
      };
      updateState((current) => ({
        ...current,
        vaultDocuments: [document, ...current.vaultDocuments.filter((item) => item.id !== id)],
        vehicles: {
          vehicles: current.vehicles.vehicles.map((item) =>
            item.id === vehicleId
              ? {
                  ...item,
                  primaryPhotoDocumentId: id,
                  documentIds: [id, ...item.documentIds.filter((documentId) => documentId !== id)],
                  audit: [audit("Primary vehicle photo updated"), ...item.audit],
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        },
      }));
      if (repositoryMode === "supabase") await upsertStructuredDocument(document);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to add this photo.");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  if (!hydrated) {
    return <div className="mx-auto w-full max-w-[760px] rounded-[28px] bg-white/75 p-8 text-sm text-[#667068]">Opening this vehicle profile…</div>;
  }

  if (!vehicle) {
    return (
      <div className="mx-auto w-full max-w-[760px] space-y-5 pb-28">
        <VehicleHeader title="Vehicle not found" />
        <BillsCard><EmptyState icon="car" title="This vehicle is not available" detail="It may have been removed or may belong to another DiaryDock account." action={<Link href="/room/garage" className="inline-flex min-h-11 items-center rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white">Back to Garage</Link>} /></BillsCard>
      </div>
    );
  }

  const mileage = latestMileage(vehicle);
  const completeness = [vehicle.make, vehicle.model, vehicle.registration, vehicle.vin, vehicle.year, vehicle.ownershipStatus !== "unknown", mileage, primaryPhoto].filter(Boolean).length;
  const health = completeness < 8 ? "Add details" : "Complete";
  const healthPercent = Math.round((completeness / 8) * 100);
  const serviceEntries = vehicle.services.filter((entry) => entry.kind !== "repair");
  const repairEntries = vehicle.services.filter((entry) => entry.kind === "repair");
  const documentCategories = Array.from(
    regularDocuments.reduce((counts, document) => {
      const category = vehicleDocumentCategory(document);
      counts.set(category, (counts.get(category) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()),
  );
  const pageTitle: Record<VehicleTab, string> = {
    overview: vehicleName,
    servicing: "Servicing",
    repairs: "Repairs",
    costs: "Costs & Running Expenses",
    documents: "Documents",
    notes: "Notes",
  };
  const recentActivity = [
    ...vehicle.audit
      .filter((entry) => /vehicle|mileage|photo|note/i.test(entry.action))
      .map((entry) => ({ id: entry.id, title: cleanText(entry.action), date: entry.createdAt, icon: "check" as IconName })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 5);

  const statusCards = [
    { label: "Mileage", value: mileage ? `${mileage.mileage.toLocaleString("en-GB")} miles` : "Not recorded", helper: mileage ? `Updated ${formatDate(mileage.recordedAt)}` : "Add a reading", date: "", icon: "chart" as IconName },
    { label: "Registration", value: vehicle.registration || "Not recorded", helper: "Vehicle identity", date: "", icon: "car" as IconName },
    { label: "Ownership", value: vehicle.ownershipStatus === "unknown" ? "Not recorded" : vehicle.ownershipStatus, helper: vehicle.keeperName || "Add registered keeper", date: "", icon: "users" as IconName },
    { label: "Current value", value: formatMoney(vehicle.currentValue), helper: vehicle.currentValueUpdatedAt ? `Updated ${formatDate(vehicle.currentValueUpdatedAt)}` : "Optional estimate", date: "", icon: "chart" as IconName },
  ];
  const headerActionLabel: Record<VehicleTab, string> = {
    overview: "Edit",
    servicing: "Add",
    repairs: "Add",
    costs: "Expense",
    documents: "Upload",
    notes: "Add note",
  };
  const headerAction = () => {
    if (tab === "overview") openVehicleEditor();
    if (tab === "servicing") {
      setServiceDraft({ ...emptyServiceDraft, kind: "service" });
      setDialog("service");
    }
    if (tab === "repairs") {
      setServiceDraft({ ...emptyServiceDraft, kind: "repair" });
      setDialog("service");
    }
    if (tab === "costs") openNewExpense();
    if (tab === "documents") router.push("/capture?room=garage");
    if (tab === "notes") {
      setNoteDraft({ kind: "general", title: "", content: "" });
      setDialog("note");
    }
  };
  const localTabs = tab === "servicing" || tab === "repairs"
    ? serviceTabs
    : tab === "overview" || tab === "notes"
      ? profileTabs
      : [];

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28">
      <VehicleHeader title={pageTitle[tab]} actionLabel={headerActionLabel[tab]} onEdit={headerAction} onMore={() => setMoreOpen((open) => !open)} moreOpen={moreOpen} />
      <GarageVehicleSectionNav vehicleId={vehicle.id} />

      {state.vehicles.vehicles.length > 1 ? (
        <nav aria-label="Choose a vehicle" className="flex gap-2 overflow-x-auto rounded-[18px] border border-[#20352a]/[0.07] bg-white/85 p-2 shadow-sm">
          {state.vehicles.vehicles.map((item) => (
            <Link key={item.id} href={`/garage/vehicles/${item.id}`} aria-current={item.id === vehicle.id ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[13px] px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${item.id === vehicle.id ? "bg-[#355540] text-white" : "bg-[#eef2e9] text-[#52705a]"}`}><UiIcon name="car" className="h-4 w-4" />{cleanText(vehicleDisplayName(item))}</Link>
          ))}
        </nav>
      ) : null}

      {tab === "overview" ? <section className="relative overflow-hidden rounded-[26px] border border-[#20352a]/[0.08] bg-[#fffdf8] shadow-[0_18px_42px_-32px_rgba(32,53,42,0.45)]">
        <div className="relative flex min-h-[230px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_75%_20%,#edf3e9,#f8f6ef_58%,#e8e4da)] sm:min-h-[300px]">
          <PrivateVehicleImage document={primaryPhoto} alt={`${vehicleName} primary vehicle`} className="absolute inset-0 h-full w-full object-cover" />
          {!primaryPhoto ? (
            <div className="relative z-10 text-center text-[#526b52]">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#6f8e72]/20 bg-white/65"><UiIcon name="car" className="h-10 w-10" /></span>
              <p className="mt-3 text-sm font-semibold">Add your vehicle photo</p>
              <p className="mt-1 text-[11px] text-[#667068]">Only a photo you upload will appear here.</p>
            </div>
          ) : null}
          <label className="absolute right-4 top-4 z-20 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 text-xs font-semibold text-[#20352a] shadow-sm backdrop-blur-md focus-within:ring-2 focus-within:ring-[#6f8e72]">
            <UiIcon name="camera" className="h-4 w-4" />
            {uploadingPhoto ? "Adding…" : primaryPhoto ? "Change photo" : "Add photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={addPhoto} disabled={uploadingPhoto} className="sr-only" />
          </label>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Vehicle profile</p>
              <h1 className="mt-1 font-serif text-[34px] leading-none tracking-[-0.03em] text-[#20352a]">{vehicleName}</h1>
              <p className="mt-2 text-[13px] text-[#667068]">{[vehicle.year, vehicle.category, vehicle.fuelType].filter(Boolean).join(" · ") || "Add the details that help identify this vehicle"}</p>
            </div>
            <span className="rounded-[12px] bg-[#f1f2ec] px-3 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#20352a]">{vehicle.registration || "No reg"}</span>
          </div>
        </div>
      </section> : <section className="flex min-h-[92px] items-center gap-4 rounded-[22px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-3 shadow-[0_16px_36px_-30px_rgba(32,53,42,0.45)]"><div className="relative flex h-[68px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_70%_20%,#edf3e9,#e6e3d9)] text-[#526b52]"><PrivateVehicleImage document={primaryPhoto} alt={`${vehicleName} primary vehicle`} className="absolute inset-0 h-full w-full object-cover" />{!primaryPhoto ? <UiIcon name="car" className="h-9 w-9" /> : null}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#20352a]">{vehicleName}</p><p className="mt-1 truncate text-[11px] text-[#667068]">{[vehicle.registration || "No registration", vehicle.year, vehicle.fuelType, mileage ? `${mileage.mileage.toLocaleString("en-GB")} miles` : "Mileage not recorded"].filter(Boolean).join(" · ")}</p></div></section>}

      {message ? <p role="alert" className="rounded-[16px] border border-[#9a4f43]/15 bg-[#f7e4df] px-4 py-3 text-[12px] text-[#8c493f]">{message}</p> : null}

      {localTabs.length ? <nav aria-label={tab === "servicing" || tab === "repairs" ? "Servicing and repair views" : "Vehicle profile views"} className="sticky top-2 z-30 overflow-x-auto rounded-[18px] border border-[#20352a]/[0.07] bg-white/95 p-1.5 shadow-sm backdrop-blur-xl">
        <div className={`grid gap-1 ${localTabs.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {localTabs.map((item) => {
            const href = item.id === "overview" ? `/garage/vehicles/${vehicle.id}` : `/garage/vehicles/${vehicle.id}/${item.id}`;
            const active = tab === item.id;
            return <Link key={item.id} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center justify-center rounded-[13px] px-1 text-[10px] font-semibold transition sm:px-3 sm:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${active ? "bg-[#355540] text-white" : "text-[#667068] hover:bg-[#eef2e9]"}`}>{item.label}</Link>;
          })}
        </div>
      </nav> : null}

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {statusCards.map((card) => {
              const helper = card.date ? dateHelper(card.date) : { text: card.helper, tone: "text-[#667068]" };
              return <BillsCard key={card.label} className="!p-4"><div className="flex items-center gap-2 text-[11px] font-semibold text-[#667068]"><UiIcon name={card.icon} className="h-4 w-4" />{card.label}</div><p className="mt-3 text-[15px] font-semibold text-[#20352a]">{card.value}</p><p className={`mt-1 text-[10px] font-medium ${helper.tone}`}>{helper.text}</p></BillsCard>;
            })}
          </div>

          <BillsCard className="bg-[linear-gradient(135deg,#edf5ea,#fffdf8)]">
            <div className="flex items-center justify-between gap-4"><SectionHeading icon="car" title="Profile completeness" detail="Identity, ownership, mileage and vehicle photo" /><span className={`text-sm font-semibold ${health === "Complete" ? "text-[#317047]" : "text-[#a46b2c]"}`}>{health}</span></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dde5db]"><div className="h-full rounded-full bg-[#3f7850] transition-[width] motion-reduce:transition-none" style={{ width: `${healthPercent}%` }} /></div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-[#667068]"><span>{completeness} of 8 key details recorded</span><button type="button" onClick={openVehicleEditor} className="min-h-11 rounded-[12px] px-3 font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Complete profile</button></div>
          </BillsCard>

          <BillsCard>
            <SectionHeading icon="car" title="Vehicle details" detail="Identity, ownership and value" action={<button type="button" onClick={openVehicleEditor} className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Edit</button>} />
            <dl className="mt-4"><DetailRow label="Make & model" value={[vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ")} /><DetailRow label="Registration" value={vehicle.registration} /><DetailRow label="VIN / chassis no." value={vehicle.vin} /><DetailRow label="Fuel & transmission" value={[vehicle.fuelType, vehicle.transmission].filter(Boolean).join(" · ")} /><DetailRow label="Ownership" value={vehicle.ownershipStatus === "unknown" ? "Not recorded" : vehicle.ownershipStatus} /><DetailRow label="Purchased" value={formatDate(vehicle.purchaseDate)} /><DetailRow label="Current value" value={formatMoney(vehicle.currentValue)} /></dl>
          </BillsCard>

          <BillsCard>
            <SectionHeading icon="plus" title="Profile actions" detail="Only identity, mileage, photos and notes live here" />
            <div className="mt-5 grid grid-cols-3 gap-2.5"><ActionButton icon="car" label="Edit details" onClick={openVehicleEditor} /><ActionButton icon="chart" label="Mileage" onClick={() => setDialog("mileage")} /><ActionButton icon="plus" label="Add note" onClick={() => { setNoteDraft({ kind: "general", title: "", content: "" }); setDialog("note"); }} /></div>
          </BillsCard>

          <BillsCard>
            <SectionHeading icon="clock" title="Recent profile activity" detail="Identity, mileage, photo and note changes" />
            <div className="mt-4 space-y-2">{recentActivity.length ? recentActivity.map((entry) => <div key={entry.id} className="flex min-h-[58px] items-center gap-3 rounded-[16px] bg-[#f7f7f1] px-3 py-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#52705a]"><UiIcon name={entry.icon} className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-[#20352a]">{entry.title}</span><span className="mt-0.5 block text-[10px] text-[#667068]">{entry.date ? formatDate(entry.date.slice(0, 10)) : "Date not recorded"}</span></span></div>) : <EmptyState icon="clock" title="No activity yet" detail="Updates you make to this vehicle will appear here." />}</div>
          </BillsCard>

        </div>
      ) : null}

      {tab === "servicing" ? (
        <div className="space-y-4">
          <BillsCard>
            <SectionHeading icon="calendar" title="Service summary" detail="Your most recent service and the next date you have recorded" action={<button type="button" onClick={() => { setServiceDraft({ ...emptyServiceDraft, kind: "service", nextServiceDate: vehicle.nextServiceDate }); setDialog("service"); }} className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Update</button>} />
            <dl className="mt-4"><DetailRow label="Last service" value={serviceEntries.length ? formatDate([...serviceEntries].sort((a,b)=>b.date.localeCompare(a.date))[0].date) : "Not recorded"} /><DetailRow label="Next service (date)" value={formatDate(vehicle.nextServiceDate)} /><DetailRow label="Current mileage" value={mileage ? `${mileage.mileage.toLocaleString("en-GB")} miles` : "Not recorded"} /></dl>
          </BillsCard>

          <BillsCard>
            <SectionHeading icon="gear" title="Service history" detail="Routine servicing and inspections recorded for this vehicle" action={<button type="button" onClick={() => { setServiceDraft({ ...emptyServiceDraft, kind: "service" }); setDialog("service"); }} className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Add service</button>} />
            <div className="mt-4 space-y-3">{serviceEntries.length ? [...serviceEntries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => <article key={entry.id} className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-[#eef2e9] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#52705a]">{entry.kind}</span><h3 className="mt-2 text-sm font-semibold text-[#20352a]">{entry.title}</h3><p className="mt-1 text-[11px] text-[#667068]">{[entry.provider, formatDate(entry.date), entry.mileage !== null ? `${entry.mileage.toLocaleString("en-GB")} miles` : ""].filter(Boolean).join(" · ")}</p></div><span className="text-sm font-semibold text-[#20352a]">{formatMoney(entry.cost)}</span></div>{entry.notes ? <p className="mt-3 text-[12px] leading-5 text-[#667068]">{entry.notes}</p> : null}</article>) : <EmptyState icon="gear" title="No service records yet" detail="Add routine services and inspections to build a reliable history." action={<button type="button" onClick={() => { setServiceDraft({ ...emptyServiceDraft, kind: "service" }); setDialog("service"); }} className="min-h-11 rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white">Add first service</button>} />}</div>
          </BillsCard>

          <Link href={`/garage/vehicles/${vehicle.id}/repairs`} className="flex min-h-[74px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]"><UiIcon name="gear" className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#20352a]">Repairs</span><span className="mt-0.5 block text-[11px] text-[#667068]">{repairEntries.length ? `${repairEntries.length} repair record${repairEntries.length === 1 ? "" : "s"}` : "No repairs recorded"}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>
          <button type="button" onClick={() => setDialog("reminder")} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"><UiIcon name="bell" className="h-4 w-4" />Set a vehicle reminder</button>
        </div>
      ) : null}

      {tab === "repairs" ? (
        <div className="space-y-4">
          <BillsCard><SectionHeading icon="gear" title="Repairs" detail="Faults, completed work and supporting details" action={<button type="button" onClick={() => { setServiceDraft({ ...emptyServiceDraft, kind: "repair" }); setDialog("service"); }} className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Add repair</button>} /><div className="mt-4 space-y-3">{repairEntries.length ? [...repairEntries].sort((a,b)=>b.date.localeCompare(a.date)).map((entry)=><article key={entry.id} className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-[#e6efe1] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#45604d]">Completed</span><h3 className="mt-2 text-sm font-semibold text-[#20352a]">{entry.title}</h3><p className="mt-1 text-[11px] text-[#667068]">{[formatDate(entry.date),entry.provider,entry.mileage !== null ? `${entry.mileage.toLocaleString("en-GB")} miles` : ""].filter(Boolean).join(" · ")}</p></div><span className="text-sm font-semibold text-[#20352a]">{formatMoney(entry.cost)}</span></div>{entry.notes ? <p className="mt-3 text-[12px] leading-5 text-[#667068]">{entry.notes}</p> : null}{entry.documentIds.length ? <p className="mt-3 text-[10px] font-semibold text-[#52705a]">{entry.documentIds.length} linked document{entry.documentIds.length === 1 ? "" : "s"}</p> : null}</article>) : <EmptyState icon="gear" title="No repairs recorded" detail="When work is needed, record the fault, garage, date, cost and what was completed." action={<button type="button" onClick={() => { setServiceDraft({ ...emptyServiceDraft, kind: "repair" }); setDialog("service"); }} className="min-h-11 rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white">Add first repair</button>} />}</div></BillsCard>
          <Link href={`/garage/vehicles/${vehicle.id}/servicing`} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] border border-[#6f8e72]/35 bg-white px-4 text-sm font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><UiIcon name="arrow-left" className="h-4 w-4" />Back to servicing</Link>
        </div>
      ) : null}

      {tab === "costs" ? (
        <VehicleCostsPanel
          vehicle={vehicle}
          view={initialCostsView}
          onAddExpense={openNewExpense}
          onEditExpense={openExpenseEditor}
        />
      ) : null}

      {tab === "documents" ? (
        <div className="space-y-4">
          <BillsCard><SectionHeading icon="folder" title="Document categories" detail="Categories are derived from the files linked to this vehicle" /><div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">{documentCategories.length ? documentCategories.map(([category,count])=><div key={category} className="rounded-[17px] border border-[#20352a]/[0.06] bg-[#faf9f4] p-3"><span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white text-[#52705a]"><UiIcon name={category === "Insurance" ? "shield" : category === "MOT" ? "calendar" : category === "Repairs" ? "gear" : "file"} className="h-4 w-4" /></span><p className="mt-3 text-[12px] font-semibold text-[#20352a]">{category}</p><p className="mt-0.5 text-[10px] text-[#667068]">{count} document{count === 1 ? "" : "s"}</p></div>) : <div className="col-span-2 sm:col-span-3"><EmptyState icon="folder" title="No document categories yet" detail="Categories will appear as vehicle files are linked." /></div>}</div></BillsCard>
          <BillsCard><SectionHeading icon="file" title="Vehicle documents" detail="Original files remain in All Files and are linked here" action={<span className="rounded-full bg-[#eef2e9] px-2.5 py-1 text-[10px] font-semibold text-[#52705a]">{regularDocuments.length}</span>} /><div className="mt-4 space-y-2">{regularDocuments.length ? regularDocuments.map((document)=><Link key={document.id} href={`/document/${document.id}?from=vehicle&vehicleId=${vehicle.id}`} className="group flex min-h-[74px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-3 py-2.5 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]"><UiIcon name="file" className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#20352a]">{cleanText(document.title)}</span><span className="mt-0.5 block text-[11px] text-[#667068]">{cleanText(document.kind)} · {cleanText(document.size)} · {cleanText(document.updated)}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>) : <EmptyState icon="file" title="No vehicle documents yet" detail="Use the main Scan button to securely add a V5C, MOT certificate, policy, warranty or receipt." />}</div><Link href="/capture?room=garage" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"><UiIcon name="plus" className="h-4 w-4" />Scan or upload a document</Link></BillsCard>
          {unlinkedGarageDocuments.length ? <BillsCard><SectionHeading icon="folder" title="Unassigned Garage files" detail="Choose which files genuinely belong to this vehicle" /><div className="mt-4 space-y-2">{unlinkedGarageDocuments.map((document)=><div key={document.id} className="flex min-h-[70px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.06] bg-[#faf9f4] px-3 py-2.5"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white text-[#52705a]"><UiIcon name="file" className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[#20352a]">{cleanText(document.title)}</span><span className="mt-0.5 block text-[10px] text-[#667068]">{cleanText(document.kind)} · {cleanText(document.updated)}</span></span><button type="button" onClick={()=>updateVehicle((current)=>({...current,documentIds:[document.id,...current.documentIds],audit:[audit(`Document linked: ${cleanText(document.title)}`),...current.audit],updatedAt:new Date().toISOString()}))} className="min-h-11 rounded-[12px] border border-[#6f8e72]/30 bg-white px-3 text-[11px] font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Link</button></div>)}</div></BillsCard> : null}
          <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">Vehicle files use DiaryDock&apos;s existing private document store. File links are generated only for the signed-in user and are not placed directly in page code.</p>
        </div>
      ) : null}

      {tab === "notes" ? (
        <div className="space-y-4">
          <BillsCard><SectionHeading icon="file" title="Notes" detail="Condition, accessories, damage and other useful context" action={<button type="button" onClick={() => { setNoteDraft({ kind: "general", title: "", content: "" }); setDialog("note"); }} className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Add note</button>} /><div className="mt-4 space-y-3">{vehicle.notes.filter((note)=>note.kind === "general").length ? vehicle.notes.filter((note)=>note.kind === "general").map((note)=><article key={note.id} className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-4"><h3 className="text-sm font-semibold text-[#20352a]">{note.title}</h3><p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-[#667068]">{note.content}</p><p className="mt-3 text-[10px] text-[#667068]">Updated {formatDate(note.updatedAt.slice(0,10))}</p></article>) : <EmptyState icon="file" title="No notes yet" detail="Record condition checks, accessories, damage or anything useful to remember." />}</div></BillsCard>
          <BillsCard><SectionHeading icon="camera" title="Photos" detail="Private images connected to this vehicle" /><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">{photoDocuments.map((document)=><div key={document.id} className="relative aspect-square overflow-hidden rounded-[15px] bg-[#e7eadf]"><PrivateVehicleImage document={document} alt={cleanText(document.title)} className="h-full w-full object-cover" /><span className="absolute inset-x-0 bottom-0 truncate bg-[#20352a]/70 px-2 py-1 text-[9px] text-white">{cleanText(document.title)}</span></div>)}<label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[15px] border border-dashed border-[#6f8e72]/40 bg-[#f7f7f1] text-[10px] font-semibold text-[#52705a] focus-within:ring-2 focus-within:ring-[#6f8e72]"><UiIcon name="plus" className="mb-1 h-5 w-5" />Add photo<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={addPhoto} disabled={uploadingPhoto} className="sr-only" /></label></div></BillsCard>
          <BillsCard className="bg-[#fff2ed]"><SectionHeading icon="alert" title="Emergency information" detail="Spare keys, breakdown details and instructions for urgent situations" action={<button type="button" onClick={() => { setNoteDraft({ kind: "emergency", title: "", content: "" }); setDialog("note"); }} className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#9a4f43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a4f43]">Add</button>} /><div className="mt-4 space-y-2">{vehicle.notes.filter((note)=>note.kind === "emergency").length ? vehicle.notes.filter((note)=>note.kind === "emergency").map((note)=><div key={note.id} className="rounded-[16px] bg-white/75 p-3"><p className="text-[12px] font-semibold text-[#7f3f37]">{note.title}</p><p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[#667068]">{note.content}</p></div>) : <p className="text-[12px] leading-5 text-[#667068]">No emergency information has been added.</p>}</div></BillsCard>
          <Link href="/family" className="flex min-h-[78px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]"><UiIcon name="users" className="h-5 w-5" /></span><span className="flex-1"><span className="block text-sm font-semibold text-[#20352a]">Trusted access</span><span className="mt-0.5 block text-[11px] text-[#667068]">Review household access without granting it automatically</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>
          <BillsCard><SectionHeading icon="clock" title="Record history" detail="A private audit trail of changes to this vehicle" /><div className="mt-4 space-y-2">{vehicle.audit.length ? vehicle.audit.slice(0,10).map((entry)=><div key={entry.id} className="flex min-h-[58px] items-center gap-3 rounded-[16px] bg-[#f7f7f1] px-3 py-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#52705a]"><UiIcon name="check" className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-[#20352a]">{cleanText(entry.action)}</span><span className="mt-0.5 block text-[10px] text-[#667068]">{formatDate(entry.createdAt.slice(0,10))}</span></span></div>) : <p className="text-[12px] text-[#667068]">No changes have been recorded yet.</p>}</div></BillsCard>
        </div>
      ) : null}

      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">DiaryDock helps you organise vehicle information and reminders. Always confirm official MOT, tax, insurance and legal details with the relevant provider or authority.</p>

      <VehicleDialogs dialog={dialog} title={vehicleName} message={message} close={() => { setDialog(null); setMessage(""); setEditingExpenseId(null); setExpenseDraft(emptyExpenseDraft); }} vehicleDraft={vehicleDraft} setVehicleDraft={setVehicleDraft} saveVehicle={saveVehicle} mileageDraft={mileageDraft} setMileageDraft={setMileageDraft} saveMileage={saveMileage} serviceDraft={serviceDraft} setServiceDraft={setServiceDraft} saveService={saveService} expenseDraft={expenseDraft} setExpenseDraft={setExpenseDraft} saveExpense={saveExpense} editingExpenseId={editingExpenseId} deleteExpense={deleteExpense} expenseDocuments={regularDocuments} vehicleServices={vehicle.services} noteDraft={noteDraft} setNoteDraft={setNoteDraft} saveNote={saveNote} reminderDraft={reminderDraft} setReminderDraft={setReminderDraft} saveReminder={saveReminder} />
    </div>
  );
}

function VehicleHeader({ title, actionLabel = "Edit", onEdit, onMore, moreOpen = false }: { title: string; actionLabel?: string; onEdit?: () => void; onMore?: () => void; moreOpen?: boolean }) {
  return (
    <header className="relative flex min-h-14 items-center gap-1 rounded-[20px] border border-[#20352a]/[0.07] bg-white/88 px-2.5 shadow-sm backdrop-blur-xl">
      <Link href="/room/garage" aria-label="Back to Garage" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#20352a] transition hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
        <UiIcon name="arrow-left" className="h-5 w-5" />
      </Link>
      <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[#20352a]">{title}</p>
      {onEdit ? (
        <div className="relative flex shrink-0 items-center gap-1">
          <button type="button" onClick={onEdit} className="min-h-11 rounded-full bg-[#eef3e9] px-3 text-[11px] font-semibold text-[#315d45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
            {actionLabel === "Edit" ? actionLabel : `+ ${actionLabel}`}
          </button>
          <button type="button" onClick={() => onMore?.()} aria-expanded={moreOpen} aria-label="More vehicle actions" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-base font-bold tracking-widest text-[#20352a] hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
            ...
          </button>
          {moreOpen ? (
            <div className="absolute right-0 top-12 z-40 w-52 rounded-[16px] border border-[#20352a]/10 bg-white p-2 shadow-xl">
              <Link href="/capture?room=garage" className="flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-xs font-semibold text-[#20352a] hover:bg-[#eef2e9]"><UiIcon name="file" className="h-4 w-4" />Scan document</Link>
              <Link href="/reminders" className="flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-xs font-semibold text-[#20352a] hover:bg-[#eef2e9]"><UiIcon name="bell" className="h-4 w-4" />Open reminders</Link>
            </div>
          ) : null}
        </div>
      ) : <span className="h-11 w-11" />}
    </header>
  );
}

type VehicleDraft = typeof emptyVehicleDraft;
type MileageDraft = { mileage: string; date: string; note: string };
type ServiceDraft = typeof emptyServiceDraft;
type ExpenseDraft = typeof emptyExpenseDraft;
type NoteDraft = { kind: VehicleNote["kind"]; title: string; content: string };
type ReminderDraft = { title: string; date: string; note: string };

function VehicleDialogs(props: {
  dialog: DialogKind; title: string; message: string; close: () => void;
  vehicleDraft: VehicleDraft; setVehicleDraft: React.Dispatch<React.SetStateAction<VehicleDraft>>; saveVehicle: (event: FormEvent) => void;
  mileageDraft: MileageDraft; setMileageDraft: React.Dispatch<React.SetStateAction<MileageDraft>>; saveMileage: (event: FormEvent) => void;
  serviceDraft: ServiceDraft; setServiceDraft: React.Dispatch<React.SetStateAction<ServiceDraft>>; saveService: (event: FormEvent) => void;
  expenseDraft: ExpenseDraft; setExpenseDraft: React.Dispatch<React.SetStateAction<ExpenseDraft>>; saveExpense: (event: FormEvent) => void;
  editingExpenseId: string | null; deleteExpense: () => void; expenseDocuments: VaultDocument[]; vehicleServices: VehicleServiceEntry[];
  noteDraft: NoteDraft; setNoteDraft: React.Dispatch<React.SetStateAction<NoteDraft>>; saveNote: (event: FormEvent) => void;
  reminderDraft: ReminderDraft; setReminderDraft: React.Dispatch<React.SetStateAction<ReminderDraft>>; saveReminder: (event: FormEvent) => Promise<void>;
}) {
  const titles: Record<Exclude<DialogKind, null>, string> = { vehicle: "Edit vehicle", mileage: "Update mileage", service: props.serviceDraft.kind === "repair" ? "Add repair" : "Add service record", expense: props.editingExpenseId ? "Edit vehicle expense" : "Add vehicle expense", note: "Add note", reminder: "Set reminder" };
  return <ModalShell open={props.dialog !== null} title={props.dialog ? titles[props.dialog] : props.title} subtitle={props.dialog === "vehicle" ? "Keep official details and renewal dates accurate." : `Add this to ${props.title}.`} onClose={props.close}>
    {props.message ? <p role="alert" className="mb-4 rounded-[14px] bg-[#f7e4df] px-3 py-2.5 text-xs text-[#8c493f]">{props.message}</p> : null}
    {props.dialog === "vehicle" ? <form onSubmit={props.saveVehicle} className="space-y-5"><FieldGroup title="Identity"><div className="grid gap-3 sm:grid-cols-2"><TextField label="Nickname" value={props.vehicleDraft.nickname} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,nickname:value}))}/><TextField label="Registration" value={props.vehicleDraft.registration} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,registration:value.toUpperCase()}))}/><TextField label="Make" value={props.vehicleDraft.make} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,make:value}))}/><TextField label="Model" value={props.vehicleDraft.model} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,model:value}))}/><TextField label="Variant" value={props.vehicleDraft.variant} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,variant:value}))}/><TextField label="Year" type="number" value={props.vehicleDraft.year} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,year:value}))}/><TextField label="VIN / chassis number" value={props.vehicleDraft.vin} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,vin:value.toUpperCase()}))}/><TextField label="Colour" value={props.vehicleDraft.colour} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,colour:value}))}/><TextField label="Fuel type" value={props.vehicleDraft.fuelType} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,fuelType:value}))}/><TextField label="Transmission" value={props.vehicleDraft.transmission} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,transmission:value}))}/><TextField label="Drivetrain" value={props.vehicleDraft.drivetrain} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,drivetrain:value}))}/><TextField label="Engine size" value={props.vehicleDraft.engineSize} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,engineSize:value}))}/><TextField label="Category / body type" value={props.vehicleDraft.category} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,category:value}))}/><TextField label="Seating capacity" type="number" value={props.vehicleDraft.seatingCapacity} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,seatingCapacity:value}))}/></div></FieldGroup><FieldGroup title="Ownership"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#667068]">Ownership status<select value={props.vehicleDraft.ownershipStatus} onChange={(event)=>props.setVehicleDraft((draft)=>({...draft,ownershipStatus:event.target.value as VehicleOwnershipStatus}))} className={fieldClass}><option value="unknown">Not recorded</option><option value="owned">Owned</option><option value="financed">Financed</option><option value="leased">Leased</option><option value="company">Company vehicle</option><option value="other">Other</option></select></label><TextField label="Registered keeper" value={props.vehicleDraft.keeperName} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,keeperName:value}))}/><TextField label="Purchase date" type="date" value={props.vehicleDraft.purchaseDate} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,purchaseDate:value}))}/><TextField label="Purchase price" type="number" value={props.vehicleDraft.purchasePrice} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,purchasePrice:value}))}/><TextField label="Current value" type="number" value={props.vehicleDraft.currentValue} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,currentValue:value}))}/><TextField label="Value checked on" type="date" value={props.vehicleDraft.currentValueUpdatedAt} onChange={(value)=>props.setVehicleDraft((draft)=>({...draft,currentValueUpdatedAt:value}))}/></div></FieldGroup><SubmitButton label="Save vehicle details" /></form> : null}
    {props.dialog === "mileage" ? <form onSubmit={props.saveMileage} className="space-y-4"><TextField label="Mileage" type="number" value={props.mileageDraft.mileage} onChange={(value)=>props.setMileageDraft((draft)=>({...draft,mileage:value}))}/><TextField label="Date recorded" type="date" value={props.mileageDraft.date} onChange={(value)=>props.setMileageDraft((draft)=>({...draft,date:value}))}/><TextArea label="Note (optional)" value={props.mileageDraft.note} onChange={(value)=>props.setMileageDraft((draft)=>({...draft,note:value}))}/><SubmitButton label="Save mileage" /></form> : null}
    {props.dialog === "service" ? <form onSubmit={props.saveService} className="space-y-4"><label className="text-xs font-semibold text-[#667068]">Record type<select value={props.serviceDraft.kind} onChange={(event)=>props.setServiceDraft((draft)=>({...draft,kind:event.target.value as VehicleServiceKind}))} className={fieldClass}><option value="service">Service</option><option value="repair">Repair</option><option value="inspection">Inspection</option></select></label><TextField label="Title" value={props.serviceDraft.title} onChange={(value)=>props.setServiceDraft((draft)=>({...draft,title:value}))}/><TextField label="Garage or provider" value={props.serviceDraft.provider} onChange={(value)=>props.setServiceDraft((draft)=>({...draft,provider:value}))}/><div className="grid grid-cols-2 gap-3"><TextField label="Date" type="date" value={props.serviceDraft.date} onChange={(value)=>props.setServiceDraft((draft)=>({...draft,date:value}))}/><TextField label="Mileage" type="number" value={props.serviceDraft.mileage} onChange={(value)=>props.setServiceDraft((draft)=>({...draft,mileage:value}))}/></div><div className="grid grid-cols-2 gap-3"><TextField label="Cost" type="number" value={props.serviceDraft.cost} onChange={(value)=>props.setServiceDraft((draft)=>({...draft,cost:value}))}/><TextField label="Next service date" type="date" value={props.serviceDraft.nextServiceDate} onChange={(value)=>props.setServiceDraft((draft)=>({...draft,nextServiceDate:value}))}/></div><TextArea label="Work completed" value={props.serviceDraft.notes} onChange={(value)=>props.setServiceDraft((draft)=>({...draft,notes:value}))}/><SubmitButton label="Save service record" /></form> : null}
    {props.dialog === "expense" ? <form onSubmit={props.saveExpense} className="space-y-4">
      <label className="text-xs font-semibold text-[#667068]">Category<select value={props.expenseDraft.category} onChange={(event)=>props.setExpenseDraft((draft)=>({...draft,category:event.target.value as VehicleExpense["category"]}))} className={fieldClass}>{["Fuel","Service","Repair","Tax","Insurance","Breakdown","Tyres","Parking","Other"].map((item)=><option key={item}>{item}</option>)}</select></label>
      <TextField label="Title" value={props.expenseDraft.title} onChange={(value)=>props.setExpenseDraft((draft)=>({...draft,title:value}))}/>
      <TextField label="Provider" value={props.expenseDraft.provider} onChange={(value)=>props.setExpenseDraft((draft)=>({...draft,provider:value}))}/>
      <div className="grid grid-cols-2 gap-3"><TextField label="Amount" type="number" value={props.expenseDraft.amount} onChange={(value)=>props.setExpenseDraft((draft)=>({...draft,amount:value}))}/><TextField label="Date" type="date" value={props.expenseDraft.date} onChange={(value)=>props.setExpenseDraft((draft)=>({...draft,date:value}))}/></div>
      <div className="grid grid-cols-2 gap-3"><TextField label="Mileage (optional)" type="number" value={props.expenseDraft.mileage} onChange={(value)=>props.setExpenseDraft((draft)=>({...draft,mileage:value}))}/><TextField label="Payment method" value={props.expenseDraft.paymentMethod} onChange={(value)=>props.setExpenseDraft((draft)=>({...draft,paymentMethod:value}))}/></div>
      <label className="block text-xs font-semibold text-[#667068]">Linked service or repair<select value={props.expenseDraft.linkedServiceId} onChange={(event)=>props.setExpenseDraft((draft)=>({...draft,linkedServiceId:event.target.value}))} className={fieldClass}><option value="">None</option>{props.vehicleServices.map((service)=><option key={service.id} value={service.id}>{service.title} · {formatDate(service.date)}</option>)}</select></label>
      <label className="block text-xs font-semibold text-[#667068]">Receipt or supporting document<select value={props.expenseDraft.documentId} onChange={(event)=>props.setExpenseDraft((draft)=>({...draft,documentId:event.target.value}))} className={fieldClass}><option value="">None</option>{props.expenseDocuments.map((document)=><option key={document.id} value={document.id}>{cleanText(document.title)}</option>)}</select></label>
      <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/[0.08] bg-[#faf9f4] px-3 text-xs font-semibold text-[#667068]"><input type="checkbox" checked={props.expenseDraft.recurring} onChange={(event)=>props.setExpenseDraft((draft)=>({...draft,recurring:event.target.checked}))} className="h-5 w-5 accent-[#355540]" />This is a recurring expense</label>
      <TextArea label="Notes" value={props.expenseDraft.notes} onChange={(value)=>props.setExpenseDraft((draft)=>({...draft,notes:value}))}/>
      <div className={`grid gap-2 ${props.editingExpenseId ? "grid-cols-2" : "grid-cols-1"}`}><SubmitButton label={props.editingExpenseId ? "Save changes" : "Save expense"} />{props.editingExpenseId ? <button type="button" onClick={props.deleteExpense} className="min-h-12 rounded-[15px] border border-[#a4473d]/25 bg-[#fff2ef] px-4 text-sm font-semibold text-[#a4473d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a4473d]">Delete expense</button> : null}</div>
      <Link href="/capture?room=garage" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#6f8e72]/30 bg-white px-4 text-xs font-semibold text-[#45604d]"><UiIcon name="camera" className="h-4 w-4" />Scan a new receipt</Link>
    </form> : null}
    {props.dialog === "note" ? <form onSubmit={props.saveNote} className="space-y-4"><label className="text-xs font-semibold text-[#667068]">Note type<select value={props.noteDraft.kind} onChange={(event)=>props.setNoteDraft((draft)=>({...draft,kind:event.target.value as VehicleNote["kind"]}))} className={fieldClass}><option value="general">General note</option><option value="emergency">Emergency information</option></select></label><TextField label="Title" value={props.noteDraft.title} onChange={(value)=>props.setNoteDraft((draft)=>({...draft,title:value}))}/><TextArea label="Details" value={props.noteDraft.content} onChange={(value)=>props.setNoteDraft((draft)=>({...draft,content:value}))}/><SubmitButton label="Save note" /></form> : null}
    {props.dialog === "reminder" ? <form onSubmit={(event)=>void props.saveReminder(event)} className="space-y-4"><TextField label="Reminder title" value={props.reminderDraft.title} onChange={(value)=>props.setReminderDraft((draft)=>({...draft,title:value}))}/><TextField label="Due date" type="date" value={props.reminderDraft.date} onChange={(value)=>props.setReminderDraft((draft)=>({...draft,date:value}))}/><TextArea label="Note (optional)" value={props.reminderDraft.note} onChange={(value)=>props.setReminderDraft((draft)=>({...draft,note:value}))}/><SubmitButton label="Save reminder" /></form> : null}
  </ModalShell>;
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) { return <fieldset className="space-y-3"><legend className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">{title}</legend>{children}</fieldset>; }
function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "date" | "number" }) { return <label className="block text-xs font-semibold text-[#667068]">{label}<input type={type} value={value} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} onChange={(event)=>onChange(event.target.value)} className={fieldClass} /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-semibold text-[#667068]">{label}<textarea value={value} onChange={(event)=>onChange(event.target.value)} rows={4} className={`${fieldClass} resize-y`} /></label>; }
function SubmitButton({ label }: { label: string }) { return <button type="submit" className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2">{label}</button>; }
