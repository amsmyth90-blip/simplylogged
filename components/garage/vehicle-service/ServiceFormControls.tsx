import { fieldClass } from "@/components/bills/BillsUi";

export function ServiceField({
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

export function ServiceArea({
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

export function ServiceSubmit({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
    >
      {label}
    </button>
  );
}

export function ServiceAlert({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="mb-3 rounded-[12px] bg-[#f1ecdf] p-3 text-xs text-[#806b45]"
    >
      {text}
    </p>
  );
}
