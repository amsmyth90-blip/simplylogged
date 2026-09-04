import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { BillsCard } from "@/components/bills/BillsUi";
import {
  DetailRow,
  EmptyState,
  SectionHeading,
} from "@/components/garage/VehicleProfileUi";
import {
  formatDate,
  formatMoney,
} from "@/components/garage/vehicle-profile-model";
import type {
  VehicleMileageEntry,
  VehicleRecord,
  VehicleServiceEntry,
} from "@/lib/vehicle-records";

function ServiceEntryCard({
  entry,
  repair = false,
}: {
  entry: VehicleServiceEntry;
  repair?: boolean;
}) {
  return (
    <article className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${repair ? "bg-[#e6efe1] text-[#45604d]" : "bg-[#eef2e9] text-[#52705a]"}`}
          >
            {repair ? "Completed" : entry.kind}
          </span>
          <h3 className="mt-2 text-sm font-semibold text-[#20352a]">
            {entry.title}
          </h3>
          <p className="mt-1 text-[11px] text-[#667068]">
            {[
              repair ? formatDate(entry.date) : entry.provider,
              repair ? entry.provider : formatDate(entry.date),
              entry.mileage !== null
                ? `${entry.mileage.toLocaleString("en-GB")} miles`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className="text-sm font-semibold text-[#20352a]">
          {formatMoney(entry.cost)}
        </span>
      </div>
      {entry.notes ? (
        <p className="mt-3 text-[12px] leading-5 text-[#667068]">
          {entry.notes}
        </p>
      ) : null}
      {repair && entry.documentIds.length ? (
        <p className="mt-3 text-[10px] font-semibold text-[#52705a]">
          {entry.documentIds.length} linked document
          {entry.documentIds.length === 1 ? "" : "s"}
        </p>
      ) : null}
    </article>
  );
}

export function VehicleServicingView({
  vehicle,
  mileage,
  onAddService,
  onUpdateService,
  onReminder,
}: {
  vehicle: VehicleRecord;
  mileage?: VehicleMileageEntry;
  onAddService: () => void;
  onUpdateService: () => void;
  onReminder: () => void;
}) {
  const services = vehicle.services.filter((entry) => entry.kind !== "repair");
  const repairs = vehicle.services.filter((entry) => entry.kind === "repair");
  const sortedServices = [...services].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return (
    <div className="space-y-4">
      <BillsCard>
        <SectionHeading
          icon="calendar"
          title="Service summary"
          detail="Your most recent service and the next date you have recorded"
          action={
            <button
              type="button"
              onClick={onUpdateService}
              className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
            >
              Update
            </button>
          }
        />
        <dl className="mt-4">
          <DetailRow
            label="Last service"
            value={
              sortedServices.length
                ? formatDate(sortedServices[0].date)
                : "Not recorded"
            }
          />
          <DetailRow
            label="Next service (date)"
            value={formatDate(vehicle.nextServiceDate)}
          />
          <DetailRow
            label="Current mileage"
            value={
              mileage
                ? `${mileage.mileage.toLocaleString("en-GB")} miles`
                : "Not recorded"
            }
          />
        </dl>
      </BillsCard>
      <BillsCard>
        <SectionHeading
          icon="gear"
          title="Service history"
          detail="Routine servicing and inspections recorded for this vehicle"
          action={
            <button
              type="button"
              onClick={onAddService}
              className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
            >
              Add service
            </button>
          }
        />
        <div className="mt-4 space-y-3">
          {sortedServices.length ? (
            sortedServices.map((entry) => (
              <ServiceEntryCard key={entry.id} entry={entry} />
            ))
          ) : (
            <EmptyState
              icon="gear"
              title="No service records yet"
              detail="Add routine services and inspections to build a reliable history."
              action={
                <button
                  type="button"
                  onClick={onAddService}
                  className="min-h-11 rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
                >
                  Add first service
                </button>
              }
            />
          )}
        </div>
      </BillsCard>
      <Link
        href={`/garage/vehicles/${vehicle.id}/repairs`}
        className="flex min-h-[74px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
          <UiIcon name="gear" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[#20352a]">
            Repairs
          </span>
          <span className="mt-0.5 block text-[11px] text-[#667068]">
            {repairs.length
              ? `${repairs.length} repair record${repairs.length === 1 ? "" : "s"}`
              : "No repairs recorded"}
          </span>
        </span>
        <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
      </Link>
      <button
        type="button"
        onClick={onReminder}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
      >
        <UiIcon name="bell" className="h-4 w-4" />
        Set a vehicle reminder
      </button>
    </div>
  );
}

export function VehicleRepairsView({
  vehicle,
  onAddRepair,
}: {
  vehicle: VehicleRecord;
  onAddRepair: () => void;
}) {
  const repairs = vehicle.services
    .filter((entry) => entry.kind === "repair")
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-4">
      <BillsCard>
        <SectionHeading
          icon="gear"
          title="Repairs"
          detail="Faults, completed work and supporting details"
          action={
            <button
              type="button"
              onClick={onAddRepair}
              className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
            >
              Add repair
            </button>
          }
        />
        <div className="mt-4 space-y-3">
          {repairs.length ? (
            repairs.map((entry) => (
              <ServiceEntryCard key={entry.id} entry={entry} repair />
            ))
          ) : (
            <EmptyState
              icon="gear"
              title="No repairs recorded"
              detail="When work is needed, record the fault, garage, date, cost and what was completed."
              action={
                <button
                  type="button"
                  onClick={onAddRepair}
                  className="min-h-11 rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
                >
                  Add first repair
                </button>
              }
            />
          )}
        </div>
      </BillsCard>
      <Link
        href={`/garage/vehicles/${vehicle.id}/servicing`}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] border border-[#6f8e72]/35 bg-white px-4 text-sm font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
      >
        <UiIcon name="arrow-left" className="h-4 w-4" />
        Back to servicing
      </Link>
    </div>
  );
}
