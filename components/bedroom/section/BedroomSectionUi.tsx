import type { ReactNode } from "react";

import { UiIcon, type IconName } from "@/components/UiIcon";

export function HealthCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[24px] border border-[#20352a]/[0.07] bg-white/92 p-4 shadow-[0_18px_42px_-34px_rgba(32,53,42,0.6)] ${className}`}
    >
      {children}
    </section>
  );
}

export function HealthEmpty({
  icon,
  title,
  detail,
  action,
}: {
  icon: IconName;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#6f8e72]/25 bg-[#faf9f4] p-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e8eee3] text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <h2 className="mt-3 font-serif text-xl text-[#20352a]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#667068]">
        {detail}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function HealthAddButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#315443] px-4 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
    >
      <UiIcon name="plus" className="h-4 w-4" />
      {label}
    </button>
  );
}

export function HealthRecordRow({
  icon,
  title,
  meta,
  notes,
}: {
  icon: IconName;
  title: string;
  meta: string;
  notes?: string;
}) {
  return (
    <div className="flex min-h-16 items-start gap-3 rounded-[18px] bg-[#f7f5ef] p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
        <UiIcon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#20352a]">{title}</p>
        <p className="mt-1 text-[10px] text-[#667068]">{meta}</p>
        {notes ? (
          <p className="mt-2 text-xs leading-5 text-[#526057]">{notes}</p>
        ) : null}
      </div>
    </div>
  );
}

export function HealthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold text-[#20352a]">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
