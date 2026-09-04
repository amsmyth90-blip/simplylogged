"use client";

import { useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  audit,
  emptyExpenseDraft,
  emptyServiceDraft,
  emptyVehicleDraft,
  expenseDraftFromRecord,
  inputNumber,
  vehicleDraftFromRecord,
  type DialogKind,
  type ExpenseDraft,
  type MileageDraft,
  type NoteDraft,
  type ServiceDraft,
} from "@/components/garage/vehicle-profile-model";
import type {
  VehicleExpense,
  VehicleNote,
  VehicleRecord,
  VehicleServiceEntry,
} from "@/lib/vehicle-records";

export function useVehicleProfileEditor(vehicleId: string) {
  const { state, updateState } = useDiaryDockData();
  const vehicle = state.vehicles.vehicles.find((item) => item.id === vehicleId);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [vehicleDraft, setVehicleDraft] = useState(emptyVehicleDraft);
  const [mileageDraft, setMileageDraft] = useState<MileageDraft>({ mileage: "", date: "", note: "" });
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(emptyServiceDraft);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(emptyExpenseDraft);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<NoteDraft>({ kind: "general", title: "", content: "" });

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
    setVehicleDraft(vehicleDraftFromRecord(vehicle));
    setDialog("vehicle");
    setMoreOpen(false);
  };

  const saveVehicle = (event: FormEvent) => {
    event.preventDefault();
    if (!vehicleDraft.make.trim() && !vehicleDraft.model.trim()) {
      setMessage("Add a make or model before saving.");
      return;
    }
    updateVehicle((current) => ({
      ...current,
      ...vehicleDraft,
      year: inputNumber(vehicleDraft.year),
      seatingCapacity: inputNumber(vehicleDraft.seatingCapacity),
      purchasePrice: inputNumber(vehicleDraft.purchasePrice),
      currentValue: inputNumber(vehicleDraft.currentValue),
      audit: [audit("Vehicle details updated"), ...current.audit],
      updatedAt: new Date().toISOString(),
    }));
    closeDialog();
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
    closeDialog();
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
    closeDialog();
  };

  const saveExpense = (event: FormEvent) => {
    event.preventDefault();
    const amount = inputNumber(expenseDraft.amount);
    if (!expenseDraft.title.trim() || amount === null || amount < 0 || !expenseDraft.date) {
      setMessage("Add a title, valid amount and date.");
      return;
    }
    const duplicateService = expenseDraft.linkedServiceId && vehicle?.expenses.some(
      (expense) => expense.id !== editingExpenseId && expense.linkedServiceId === expenseDraft.linkedServiceId,
    );
    if (duplicateService) {
      setMessage("That service or repair is already linked to another expense.");
      return;
    }
    const existing = vehicle?.expenses.find((expense) => expense.id === editingExpenseId);
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
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    updateVehicle((current) => ({
      ...current,
      expenses: editingExpenseId
        ? current.expenses.map((expense) => expense.id === editingExpenseId ? entry : expense)
        : [entry, ...current.expenses],
      audit: [audit(`Expense ${editingExpenseId ? "updated" : "added"}: ${entry.title}`), ...current.audit],
      updatedAt: new Date().toISOString(),
    }));
    resetExpense();
    closeDialog();
  };

  const openNewExpense = () => {
    resetExpense();
    setMessage("");
    setDialog("expense");
  };

  const openExpenseEditor = (expense: VehicleExpense) => {
    setExpenseDraft(expenseDraftFromRecord(expense));
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
    resetExpense();
    closeDialog();
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
    closeDialog();
  };

  function resetExpense() {
    setExpenseDraft(emptyExpenseDraft);
    setEditingExpenseId(null);
  }

  function closeDialog() {
    setDialog(null);
    setMessage("");
  }

  const closeAndResetDialog = () => {
    closeDialog();
    resetExpense();
  };

  return {
    dialog, setDialog, moreOpen, setMoreOpen, message, setMessage,
    vehicleDraft, setVehicleDraft, mileageDraft, setMileageDraft,
    serviceDraft, setServiceDraft, expenseDraft, setExpenseDraft,
    editingExpenseId, noteDraft, setNoteDraft, updateVehicle,
    openVehicleEditor, saveVehicle, saveMileage, saveService,
    saveExpense, openNewExpense, openExpenseEditor, deleteExpense,
    saveNote, closeAndResetDialog,
  };
}
