import type { ReactNode } from "react";

import { fieldClass } from "@/components/bills/BillsUi";
import { UiIcon, type IconName } from "@/components/UiIcon";

import { dateStatus, formatMotDate } from "./mot-tax-model";

export function MotTaxSectionTitle({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[16px] font-semibold text-[#20352a]">{title}</h2>
        <p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

export function MotTaxDateCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: IconName;
}) {
  const status = dateStatus(value);
  return (
    <div className="flex min-h-[74px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.06] bg-[#faf9f4] px-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6f8e72]">
          {label}
        </span>
        <span className="mt-1 block text-xs font-semibold text-[#20352a]">
          {formatMotDate(value)}
        </span>
      </span>
      <span
        className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${status.tone}`}
      >
        {status.text}
      </span>
    </div>
  );
}

export function MotTaxDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-[#20352a]/[0.06] py-2.5 last:border-0">
      <dt className="text-xs text-[#667068]">{label}</dt>
      <dd className="max-w-[60%] text-right text-xs font-semibold text-[#20352a]">
        {value}
      </dd>
    </div>
  );
}

export function MotTaxEmpty({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#6f8e72]/35 bg-[#f7f7f1] px-5 py-8 text-center">
      <UiIcon name="file" className="mx-auto h-6 w-6 text-[#6f8e72]" />
      <p className="mt-3 text-sm font-semibold text-[#20352a]">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p>
    </div>
  );
}

export function MotTaxField({
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

export function MotTaxArea({
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

export function MotTaxSubmit({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
    >
      {label}
    </button>
  );
}
