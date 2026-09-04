import Link from "next/link";
import type { ReactNode } from "react";

import { UiIcon, type IconName } from "@/components/UiIcon";
import type { VaultDocument } from "@/lib/mock-data";
import type { VehicleRecord, VehicleServiceEntry } from "@/lib/vehicle-records";

import { formatServiceDate, formatServiceMoney } from "./service-model";

export function ServiceHeader({
  title,
  backHref,
  action,
}: {
  title: string;
  backHref: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex min-h-14 items-center rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 px-2.5 shadow-sm">
      <Link
        href={backHref}
        aria-label="Go back"
        className="flex h-11 w-11 items-center justify-center rounded-full text-[#20352a]"
      >
        <UiIcon name="arrow-left" className="h-5 w-5" />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[#20352a]">
        {title}
      </h1>
      {action ?? <span className="h-11 w-11" />}
    </header>
  );
}

export function ServiceVehicleSummary({
  vehicle,
  name,
  mileage,
}: {
  vehicle: VehicleRecord;
  name: string;
  mileage: number | null;
}) {
  const facts = [
    vehicle.registration || "No registration",
    vehicle.year?.toString(),
    vehicle.fuelType,
    mileage === null
      ? "Mileage not recorded"
      : `${mileage.toLocaleString("en-GB")} miles`,
  ];
  return (
    <section className="flex min-h-[92px] items-center gap-4 rounded-[22px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-3 shadow-sm">
      <span className="flex h-[68px] w-[92px] shrink-0 items-center justify-center rounded-[16px] bg-[#e8ede3] text-[#526b52]">
        <UiIcon name="car" className="h-9 w-9" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#20352a]">{name}</p>
        <p className="mt-1 truncate text-[11px] text-[#667068]">
          {facts.filter(Boolean).join(" · ")}
        </p>
      </div>
    </section>
  );
}

export function ServiceSectionTitle({
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

export function ServiceInfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-h-[78px] rounded-[17px] border border-[#20352a]/[0.06] bg-white p-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#6f8e72]">
        {label}
      </p>
      <p className="mt-2 break-words text-xs font-semibold leading-5 text-[#20352a]">
        {value}
      </p>
    </div>
  );
}

export function ServiceRow({
  entry,
  href,
}: {
  entry: VehicleServiceEntry;
  href: string;
}) {
  return (
    <article className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#faf9f4] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold text-[#315d45]">
            {formatServiceDate(entry.date)}
          </p>
          <h3 className="mt-2 text-sm font-semibold text-[#20352a]">
            {entry.title}
          </h3>
          <p className="mt-1 text-[11px] text-[#667068]">
            {[
              entry.provider,
              entry.mileage !== null
                ? `${entry.mileage.toLocaleString("en-GB")} miles`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <p className="text-sm font-semibold text-[#20352a]">
          {formatServiceMoney(entry.cost)}
        </p>
      </div>
      {entry.notes ? (
        <p className="mt-3 line-clamp-2 text-[11px] leading-5 text-[#667068]">
          {entry.notes}
        </p>
      ) : null}
      <Link
        href={href}
        className="mt-3 flex min-h-11 items-center justify-between rounded-[13px] border border-[#20352a]/[0.07] bg-white px-3 text-xs font-semibold text-[#45604d]"
      >
        View details
        <UiIcon name="chevron-right" className="h-4 w-4" />
      </Link>
    </article>
  );
}

export function ServiceAction({
  href,
  icon,
  label,
  onClick,
}: {
  href?: string;
  icon: IconName;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <UiIcon name={icon} className="h-4 w-4 text-[#52705a]" />
      <span className="flex-1">{label}</span>
      <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
    </>
  );
  const classes =
    "flex min-h-12 w-full items-center gap-3 rounded-[14px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3 text-left text-xs font-semibold text-[#20352a]";
  return href ? (
    <Link href={href} className={classes}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

export function ServiceDocumentRow({
  document,
  vehicleId,
}: {
  document: VaultDocument;
  vehicleId: string;
}) {
  return (
    <Link
      href={`/document/${document.id}?from=vehicle&vehicleId=${vehicleId}`}
      className="flex min-h-[70px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white text-[#52705a]">
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
      <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
    </Link>
  );
}

export function ServiceEmpty({
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
