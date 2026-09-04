import Link from "next/link";
import type { ReactNode } from "react";

import { BillsCard } from "@/components/bills/BillsUi";
import { GarageVehicleSectionNav } from "@/components/garage/GarageVehicleSectionNav";
import { UiIcon } from "@/components/UiIcon";
import type { VaultDocument } from "@/lib/mock-data";
import type { VehicleExpense, VehicleRecord } from "@/lib/vehicle-records";

import { categoryIcons, formatReceiptDate, money } from "./receipt-model";

export function ReceiptShell({
  vehicle,
  name,
  mileage,
  title,
  backHref,
  action,
  children,
}: {
  vehicle: VehicleRecord;
  name: string;
  mileage: number | null;
  title: string;
  backHref: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28">
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
      <GarageVehicleSectionNav vehicleId={vehicle.id} />
      <VehicleSummary vehicle={vehicle} name={name} mileage={mileage} />
      {children}
      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">
        Receipt details and extracted suggestions must be checked against the
        original. DiaryDock does not confirm purchases, tax treatment or
        reimbursement eligibility.
      </p>
    </div>
  );
}

function VehicleSummary({
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

export function ReceiptRow({
  expense,
  href,
}: {
  expense: VehicleExpense;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[72px] items-center gap-3 rounded-[16px] border border-[#20352a]/[0.06] bg-[#faf9f4] px-3"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
        <UiIcon name={categoryIcons[expense.category]} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-[#20352a]">
          {expense.title}
        </span>
        <span className="mt-1 block truncate text-[10px] text-[#667068]">
          {expense.provider || "Merchant not recorded"} ·{" "}
          {formatReceiptDate(expense.date)}
          {expense.mileage
            ? ` · ${expense.mileage.toLocaleString("en-GB")} miles`
            : ""}
        </span>
      </span>
      <span className="text-xs font-semibold text-[#20352a]">
        {money(expense.amount)}
      </span>
      <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
    </Link>
  );
}

export function ReceiptDocumentRow({
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
      <UiIcon name="file" className="h-5 w-5 text-[#52705a]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-[#20352a]">
          {document.title}
        </span>
        <span className="text-[10px] text-[#667068]">
          {document.kind} · {document.size}
        </span>
      </span>
      <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
    </Link>
  );
}

export function ReceiptMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <BillsCard className="!p-4">
      <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#667068]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[#20352a]">{value}</p>
      <p className="mt-1 text-[9px] text-[#315d45]">{helper}</p>
    </BillsCard>
  );
}

export function ReceiptSectionTitle({
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
        <h2 className="text-[15px] font-semibold text-[#20352a]">{title}</h2>
        <p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

export function ReceiptEmpty({
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
