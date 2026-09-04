import { fieldClass } from "@/components/bills/BillsUi";
import type { InsuranceTriState } from "@/components/garage/vehicle-insurance-model";

export function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number" | "tel";
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

export function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-[#667068]">
      {label}
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClass} resize-y`}
      />
    </label>
  );
}

export function TriField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: InsuranceTriState;
  onChange: (value: InsuranceTriState) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-[#667068]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as InsuranceTriState)}
        className={fieldClass}
      >
        <option value="unknown">Not recorded</option>
        <option value="yes">Included</option>
        <option value="no">Not included</option>
      </select>
    </label>
  );
}

export function DocumentSelect({
  label,
  value,
  documents,
  onChange,
}: {
  label: string;
  value: string;
  documents: { id: string; title: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-[#667068]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      >
        <option value="">None</option>
        {documents.map((document) => (
          <option key={document.id} value={document.id}>
            {document.title}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Submit({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
    >
      {label}
    </button>
  );
}
