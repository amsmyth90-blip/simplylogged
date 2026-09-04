import Link from "next/link";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import { UiIcon } from "@/components/UiIcon";
import {
  SubmitButton,
  TextArea,
  TextField,
  fieldClass,
} from "@/components/garage/VehicleProfileFields";
import { cleanText, formatDate, type ExpenseDraft } from "@/components/garage/vehicle-profile-model";
import type { VaultDocument } from "@/lib/mock-data";
import type { VehicleExpense, VehicleServiceEntry } from "@/lib/vehicle-records";

type Props = {
  draft: ExpenseDraft;
  setDraft: Dispatch<SetStateAction<ExpenseDraft>>;
  onSubmit: (event: FormEvent) => void;
  editingExpenseId: string | null;
  onDelete: () => void;
  documents: VaultDocument[];
  services: VehicleServiceEntry[];
};

export function VehicleExpenseForm(props: Props) {
  const set = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) => {
    props.setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <form onSubmit={props.onSubmit} className="space-y-4">
      <label className="text-xs font-semibold text-[#667068]">
        Category
        <select value={props.draft.category} onChange={(event) => set("category", event.target.value as VehicleExpense["category"])} className={fieldClass}>
          {["Fuel", "Service", "Repair", "Tax", "Insurance", "Breakdown", "Tyres", "Parking", "Other"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <TextField label="Title" value={props.draft.title} onChange={(value) => set("title", value)} />
      <TextField label="Provider" value={props.draft.provider} onChange={(value) => set("provider", value)} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Amount" type="number" value={props.draft.amount} onChange={(value) => set("amount", value)} />
        <TextField label="Date" type="date" value={props.draft.date} onChange={(value) => set("date", value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Mileage (optional)" type="number" value={props.draft.mileage} onChange={(value) => set("mileage", value)} />
        <TextField label="Payment method" value={props.draft.paymentMethod} onChange={(value) => set("paymentMethod", value)} />
      </div>
      <label className="block text-xs font-semibold text-[#667068]">
        Linked service or repair
        <select value={props.draft.linkedServiceId} onChange={(event) => set("linkedServiceId", event.target.value)} className={fieldClass}>
          <option value="">None</option>
          {props.services.map((service) => <option key={service.id} value={service.id}>{service.title} · {formatDate(service.date)}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold text-[#667068]">
        Receipt or supporting document
        <select value={props.draft.documentId} onChange={(event) => set("documentId", event.target.value)} className={fieldClass}>
          <option value="">None</option>
          {props.documents.map((document) => <option key={document.id} value={document.id}>{cleanText(document.title)}</option>)}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/[0.08] bg-[#faf9f4] px-3 text-xs font-semibold text-[#667068]">
        <input type="checkbox" checked={props.draft.recurring} onChange={(event) => set("recurring", event.target.checked)} className="h-5 w-5 accent-[#355540]" />
        This is a recurring expense
      </label>
      <TextArea label="Notes" value={props.draft.notes} onChange={(value) => set("notes", value)} />
      <div className={`grid gap-2 ${props.editingExpenseId ? "grid-cols-2" : "grid-cols-1"}`}>
        <SubmitButton label={props.editingExpenseId ? "Save changes" : "Save expense"} />
        {props.editingExpenseId ? <button type="button" onClick={props.onDelete} className="min-h-12 rounded-[15px] border border-[#a4473d]/25 bg-[#fff2ef] px-4 text-sm font-semibold text-[#a4473d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a4473d]">Delete expense</button> : null}
      </div>
      <Link href="/capture?room=garage" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#6f8e72]/30 bg-white px-4 text-xs font-semibold text-[#45604d]">
        <UiIcon name="camera" className="h-4 w-4" />
        Scan a new receipt
      </Link>
    </form>
  );
}
