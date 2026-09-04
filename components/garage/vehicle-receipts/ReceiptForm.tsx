import type { Dispatch, SetStateAction } from "react";

import { BillsCard, fieldClass } from "@/components/bills/BillsUi";
import type { VehicleRecord } from "@/lib/vehicle-records";

import {
  type ExpenseCategory,
  formatReceiptDate,
  receiptCategories,
  type ReceiptDraft,
} from "./receipt-model";
import { ReceiptSectionTitle } from "./ReceiptShell";

export function ReceiptForm({
  draft,
  setDraft,
  services,
}: {
  draft: ReceiptDraft;
  setDraft: Dispatch<SetStateAction<ReceiptDraft>>;
  services: VehicleRecord["services"];
}) {
  const update = (field: keyof ReceiptDraft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  return (
    <BillsCard>
      <ReceiptSectionTitle
        title="Check receipt details"
        detail="Correct anything the document reader has suggested"
      />
      <div className="mt-4 space-y-4">
        <ReceiptField
          label="Receipt title"
          value={draft.title}
          onChange={(value) => update("title", value)}
        />
        <ReceiptField
          label="Merchant"
          value={draft.provider}
          onChange={(value) => update("provider", value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <ReceiptField
            label="Date"
            type="date"
            value={draft.date}
            onChange={(value) => update("date", value)}
          />
          <ReceiptField
            label="Amount"
            type="number"
            value={draft.amount}
            onChange={(value) => update("amount", value)}
          />
        </div>
        <label className="block text-xs font-semibold text-[#667068]">
          Category
          <select
            value={draft.category}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                category: event.target.value as ExpenseCategory,
              }))
            }
            className={fieldClass}
          >
            {receiptCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <ReceiptField
            label="Mileage"
            type="number"
            value={draft.mileage}
            onChange={(value) => update("mileage", value)}
          />
          <ReceiptField
            label="Payment method"
            value={draft.paymentMethod}
            onChange={(value) => update("paymentMethod", value)}
          />
        </div>
        <ReceiptField
          label="Receipt number"
          value={draft.receiptNumber}
          onChange={(value) => update("receiptNumber", value)}
        />
        <label className="block text-xs font-semibold text-[#667068]">
          Link to service or repair (optional)
          <select
            value={draft.linkedServiceId}
            onChange={(event) => update("linkedServiceId", event.target.value)}
            className={fieldClass}
          >
            <option value="">Not linked</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {formatReceiptDate(service.date)} · {service.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#667068]">
          Notes
          <textarea
            rows={3}
            value={draft.notes}
            onChange={(event) => update("notes", event.target.value)}
            className={`${fieldClass} resize-y`}
          />
        </label>
      </div>
    </BillsCard>
  );
}

function ReceiptField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number";
}) {
  return (
    <label className="block text-xs font-semibold text-[#667068]">
      {label}
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  );
}
