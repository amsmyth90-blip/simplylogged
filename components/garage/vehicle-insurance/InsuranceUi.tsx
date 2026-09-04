import Link from "next/link";
import type { ReactNode } from "react";

import { UiIcon, type IconName } from "@/components/UiIcon";
import { humanInsuranceStatus } from "@/components/garage/vehicle-insurance-model";
import type { VehicleRecord } from "@/lib/vehicle-records";

export function VehicleSummary({
  vehicle,
  name,
  mileage,
}: {
  vehicle: VehicleRecord;
  name: string;
  mileage: number | null;
}) {
  const details = [
    vehicle.registration || "No registration",
    vehicle.year?.toString(),
    vehicle.fuelType,
    mileage === null
      ? "Mileage not recorded"
      : `${mileage.toLocaleString("en-GB")} miles`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <section className="flex min-h-[92px] items-center gap-4 rounded-[22px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-3 shadow-sm">
      <span className="flex h-[68px] w-[92px] shrink-0 items-center justify-center rounded-[16px] bg-[#e8ede3] text-[#526b52]">
        <UiIcon name="car" className="h-9 w-9" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#20352a]">{name}</p>
        <p className="mt-1 truncate text-[11px] text-[#667068]">{details}</p>
      </div>
    </section>
  );
}

export function SectionTitle({
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

export function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[82px] rounded-[18px] border border-[#20352a]/[0.07] bg-white p-3">
      <p className="text-[10px] font-medium text-[#667068]">{label}</p>
      <p className="mt-2 break-words text-xs font-semibold leading-5 text-[#20352a]">
        {value}
      </p>
    </div>
  );
}

export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-[#20352a]/[0.06] py-2.5 last:border-0">
      <dt className="text-xs text-[#667068]">{label}</dt>
      <dd className="max-w-[60%] text-right text-xs font-semibold text-[#20352a]">
        {value}
      </dd>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const positive = ["active", "settled", "closed", "renewed"].includes(status);
  const attention = ["expired", "cancelled"].includes(status);
  const tone = positive
    ? "bg-[#e5efdf] text-[#45604d]"
    : attention
      ? "bg-[#fbe5df] text-[#a4473d]"
      : "bg-[#f1ecdf] text-[#806b45]";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${tone}`}
    >
      {humanInsuranceStatus(status)}
    </span>
  );
}

export function ActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: IconName;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center gap-3 rounded-[14px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3 text-xs font-semibold text-[#20352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
    >
      <UiIcon name={icon} className="h-4 w-4 text-[#52705a]" />
      <span className="flex-1">{label}</span>
      <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
    </Link>
  );
}

export function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 rounded-[14px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3 text-left text-xs font-semibold text-[#20352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
    >
      <UiIcon name={icon} className="h-4 w-4 text-[#52705a]" />
      <span className="flex-1">{label}</span>
      <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
    </button>
  );
}

export function DocumentRow({
  document,
  vehicleId,
  badge,
}: {
  document: { id: string; title: string; kind: string; updated: string };
  vehicleId: string;
  badge?: string;
}) {
  return (
    <Link
      href={`/document/${document.id}?from=vehicle&vehicleId=${vehicleId}`}
      className="flex min-h-[72px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
        <UiIcon name="file" className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-[#20352a]">
          {document.title}
        </span>
        <span className="text-[10px] text-[#667068]">
          {document.kind} · {document.updated}
        </span>
      </span>
      {badge ? (
        <span className="rounded-full bg-[#e5efdf] px-2 py-1 text-[9px] font-semibold text-[#45604d]">
          {badge}
        </span>
      ) : null}
      <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
    </Link>
  );
}

export function Empty({
  icon,
  title,
  detail,
}: {
  icon: IconName;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#6f8e72]/35 bg-[#f7f7f1] px-5 py-8 text-center">
      <UiIcon name={icon} className="mx-auto h-6 w-6 text-[#6f8e72]" />
      <p className="mt-3 text-sm font-semibold text-[#20352a]">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p>
    </div>
  );
}

export function Alert({ text }: { text: string }) {
  return (
    <p
      role="alert"
      className="mb-3 rounded-[12px] bg-[#fbe5df] p-3 text-xs text-[#a4473d]"
    >
      {text}
    </p>
  );
}
