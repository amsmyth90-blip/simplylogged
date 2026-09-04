import type { Dispatch, FormEvent, SetStateAction } from "react";

import {
  SubmitButton,
  TextArea,
  TextField,
  fieldClass,
} from "@/components/garage/VehicleProfileFields";
import type {
  MileageDraft,
  NoteDraft,
  ReminderDraft,
  ServiceDraft,
} from "@/components/garage/vehicle-profile-model";
import type { VehicleNote, VehicleServiceKind } from "@/lib/vehicle-records";

export function MileageForm({
  draft,
  setDraft,
  onSubmit,
}: {
  draft: MileageDraft;
  setDraft: Dispatch<SetStateAction<MileageDraft>>;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextField label="Mileage" type="number" value={draft.mileage} onChange={(value) => setDraft((current) => ({ ...current, mileage: value }))} />
      <TextField label="Date recorded" type="date" value={draft.date} onChange={(value) => setDraft((current) => ({ ...current, date: value }))} />
      <TextArea label="Note (optional)" value={draft.note} onChange={(value) => setDraft((current) => ({ ...current, note: value }))} />
      <SubmitButton label="Save mileage" />
    </form>
  );
}

export function ServiceForm({
  draft,
  setDraft,
  onSubmit,
}: {
  draft: ServiceDraft;
  setDraft: Dispatch<SetStateAction<ServiceDraft>>;
  onSubmit: (event: FormEvent) => void;
}) {
  const set = <K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="text-xs font-semibold text-[#667068]">
        Record type
        <select value={draft.kind} onChange={(event) => set("kind", event.target.value as VehicleServiceKind)} className={fieldClass}>
          <option value="service">Service</option>
          <option value="repair">Repair</option>
          <option value="inspection">Inspection</option>
        </select>
      </label>
      <TextField label="Title" value={draft.title} onChange={(value) => set("title", value)} />
      <TextField label="Garage or provider" value={draft.provider} onChange={(value) => set("provider", value)} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Date" type="date" value={draft.date} onChange={(value) => set("date", value)} />
        <TextField label="Mileage" type="number" value={draft.mileage} onChange={(value) => set("mileage", value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Cost" type="number" value={draft.cost} onChange={(value) => set("cost", value)} />
        <TextField label="Next service date" type="date" value={draft.nextServiceDate} onChange={(value) => set("nextServiceDate", value)} />
      </div>
      <TextArea label="Work completed" value={draft.notes} onChange={(value) => set("notes", value)} />
      <SubmitButton label="Save service record" />
    </form>
  );
}

export function NoteForm({
  draft,
  setDraft,
  onSubmit,
}: {
  draft: NoteDraft;
  setDraft: Dispatch<SetStateAction<NoteDraft>>;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="text-xs font-semibold text-[#667068]">
        Note type
        <select value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as VehicleNote["kind"] }))} className={fieldClass}>
          <option value="general">General note</option>
          <option value="emergency">Emergency information</option>
        </select>
      </label>
      <TextField label="Title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
      <TextArea label="Details" value={draft.content} onChange={(value) => setDraft((current) => ({ ...current, content: value }))} />
      <SubmitButton label="Save note" />
    </form>
  );
}

export function ReminderForm({
  draft,
  setDraft,
  onSubmit,
}: {
  draft: ReminderDraft;
  setDraft: Dispatch<SetStateAction<ReminderDraft>>;
  onSubmit: (event: FormEvent) => Promise<void>;
}) {
  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
      <TextField label="Reminder title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
      <TextField label="Due date" type="date" value={draft.date} onChange={(value) => setDraft((current) => ({ ...current, date: value }))} />
      <TextArea label="Note (optional)" value={draft.note} onChange={(value) => setDraft((current) => ({ ...current, note: value }))} />
      <SubmitButton label="Save reminder" />
    </form>
  );
}
