import type { Dispatch, FormEvent, SetStateAction } from "react";

import { ModalShell } from "@/components/ModalShell";
import { VehicleDetailsForm } from "@/components/garage/VehicleDetailsForm";
import { VehicleExpenseForm } from "@/components/garage/VehicleExpenseForm";
import {
  MileageForm,
  NoteForm,
  ReminderForm,
  ServiceForm,
} from "@/components/garage/VehicleRecordForms";
import type {
  DialogKind,
  ExpenseDraft,
  MileageDraft,
  NoteDraft,
  ReminderDraft,
  ServiceDraft,
  VehicleDraft,
} from "@/components/garage/vehicle-profile-model";
import type { VaultDocument } from "@/lib/mock-data";
import type { VehicleServiceEntry } from "@/lib/vehicle-records";

export type VehicleProfileDialogsProps = {
  dialog: DialogKind;
  title: string;
  message: string;
  close: () => void;
  vehicleDraft: VehicleDraft;
  setVehicleDraft: Dispatch<SetStateAction<VehicleDraft>>;
  saveVehicle: (event: FormEvent) => void;
  mileageDraft: MileageDraft;
  setMileageDraft: Dispatch<SetStateAction<MileageDraft>>;
  saveMileage: (event: FormEvent) => void;
  serviceDraft: ServiceDraft;
  setServiceDraft: Dispatch<SetStateAction<ServiceDraft>>;
  saveService: (event: FormEvent) => void;
  expenseDraft: ExpenseDraft;
  setExpenseDraft: Dispatch<SetStateAction<ExpenseDraft>>;
  saveExpense: (event: FormEvent) => void;
  editingExpenseId: string | null;
  deleteExpense: () => void;
  expenseDocuments: VaultDocument[];
  vehicleServices: VehicleServiceEntry[];
  noteDraft: NoteDraft;
  setNoteDraft: Dispatch<SetStateAction<NoteDraft>>;
  saveNote: (event: FormEvent) => void;
  reminderDraft: ReminderDraft;
  setReminderDraft: Dispatch<SetStateAction<ReminderDraft>>;
  saveReminder: (event: FormEvent) => Promise<void>;
};

export function VehicleProfileDialogs(props: VehicleProfileDialogsProps) {
  const titles: Record<Exclude<DialogKind, null>, string> = {
    vehicle: "Edit vehicle",
    mileage: "Update mileage",
    service: props.serviceDraft.kind === "repair" ? "Add repair" : "Add service record",
    expense: props.editingExpenseId ? "Edit vehicle expense" : "Add vehicle expense",
    note: "Add note",
    reminder: "Set reminder",
  };

  return (
    <ModalShell
      open={props.dialog !== null}
      title={props.dialog ? titles[props.dialog] : props.title}
      subtitle={props.dialog === "vehicle" ? "Keep official details and renewal dates accurate." : `Add this to ${props.title}.`}
      onClose={props.close}
    >
      {props.message ? <p role="alert" className="mb-4 rounded-[14px] bg-[#f7e4df] px-3 py-2.5 text-xs text-[#8c493f]">{props.message}</p> : null}
      {props.dialog === "vehicle" ? <VehicleDetailsForm draft={props.vehicleDraft} setDraft={props.setVehicleDraft} onSubmit={props.saveVehicle} /> : null}
      {props.dialog === "mileage" ? <MileageForm draft={props.mileageDraft} setDraft={props.setMileageDraft} onSubmit={props.saveMileage} /> : null}
      {props.dialog === "service" ? <ServiceForm draft={props.serviceDraft} setDraft={props.setServiceDraft} onSubmit={props.saveService} /> : null}
      {props.dialog === "expense" ? <VehicleExpenseForm draft={props.expenseDraft} setDraft={props.setExpenseDraft} onSubmit={props.saveExpense} editingExpenseId={props.editingExpenseId} onDelete={props.deleteExpense} documents={props.expenseDocuments} services={props.vehicleServices} /> : null}
      {props.dialog === "note" ? <NoteForm draft={props.noteDraft} setDraft={props.setNoteDraft} onSubmit={props.saveNote} /> : null}
      {props.dialog === "reminder" ? <ReminderForm draft={props.reminderDraft} setDraft={props.setReminderDraft} onSubmit={props.saveReminder} /> : null}
    </ModalShell>
  );
}
