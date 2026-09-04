import Link from "next/link";

import { BillsCard, fieldClass } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";

import { formatServiceDate } from "./service-model";
import { useServiceRecords } from "./ServiceRecordsContext";
import { ServiceEmpty, ServiceRow, ServiceSectionTitle } from "./ServiceUi";

export function ServiceHistory() {
  const service = useServiceRecords();
  const records = [...service.serviceRecords]
    .filter(
      (entry) =>
        service.historyFilter === "all" || entry.kind === service.historyFilter,
    )
    .sort((a, b) =>
      service.historyAscending
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date),
    );

  return (
    <div className="space-y-4">
      <BillsCard>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-[#667068]">
            Filter
            <select
              value={service.historyFilter}
              onChange={(event) =>
                service.setHistoryFilter(
                  event.target.value as typeof service.historyFilter,
                )
              }
              className={fieldClass}
            >
              <option value="all">All records</option>
              <option value="service">Services</option>
              <option value="inspection">Maintenance</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => service.setHistoryAscending((value) => !value)}
            className="mt-[18px] min-h-11 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] text-xs font-semibold text-[#45604d]"
          >
            {service.historyAscending ? "Oldest first" : "Newest first"}
          </button>
        </div>
      </BillsCard>
      <BillsCard>
        <ServiceSectionTitle
          title="Service history"
          detail={`${records.length} record${records.length === 1 ? "" : "s"}`}
        />
        <div className="mt-4 space-y-3">
          {records.length ? (
            records.map((entry) => (
              <ServiceRow
                key={entry.id}
                entry={entry}
                href={`${service.base}/${entry.id}`}
              />
            ))
          ) : (
            <ServiceEmpty
              icon="clock"
              title="No matching records"
              detail="Change the filter or add a confirmed service record."
            />
          )}
        </div>
      </BillsCard>
    </div>
  );
}

export function ServiceMaintenance() {
  const service = useServiceRecords();
  if (!service.vehicle) return null;
  const maintenance = service.serviceRecords
    .filter((entry) => entry.kind === "inspection")
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <BillsCard>
        <ServiceSectionTitle
          title="Maintenance records"
          detail="Tyres, brakes, battery, oil, wipers and routine checks"
          action={
            <button
              type="button"
              onClick={() => service.openNewService("inspection")}
              className="min-h-11 rounded-[12px] bg-[#355540] px-3 text-xs font-semibold text-white"
            >
              Add
            </button>
          }
        />
        <div className="mt-4 space-y-3">
          {maintenance.length ? (
            maintenance.map((entry) => (
              <ServiceRow
                key={entry.id}
                entry={entry}
                href={`${service.base}/${entry.id}`}
              />
            ))
          ) : (
            <ServiceEmpty
              icon="gear"
              title="No maintenance records"
              detail="Add a confirmed tyre, brake, battery or other maintenance record."
            />
          )}
        </div>
      </BillsCard>
      <Link
        href={`/garage/vehicles/${service.vehicle.id}/repairs`}
        className="flex min-h-[78px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
          <UiIcon name="gear" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[#20352a]">
            Repairs
          </span>
          <span className="text-[11px] text-[#667068]">
            {service.repairRecords.length
              ? `${service.repairRecords.length} separate repair record${service.repairRecords.length === 1 ? "" : "s"}`
              : "Faults and repairs stay in their own list"}
          </span>
        </span>
        <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
      </Link>
    </div>
  );
}

export function ServiceReminders() {
  const service = useServiceRecords();
  return (
    <BillsCard>
      <ServiceSectionTitle
        title="Service reminders"
        detail="Upcoming Garage reminders connected with maintenance"
        action={
          <button
            type="button"
            onClick={service.openReminder}
            className="min-h-11 rounded-[12px] bg-[#355540] px-3 text-xs font-semibold text-white"
          >
            Add
          </button>
        }
      />
      <div className="mt-4 space-y-3">
        {service.serviceReminders.length ? (
          service.serviceReminders.map((reminder) => (
            <Link
              key={reminder.id}
              href="/reminders"
              className="flex min-h-[70px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7ebe1] text-[#52705a]">
                <UiIcon name="bell" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-[#20352a]">
                  {reminder.title}
                </span>
                <span className="text-[10px] text-[#667068]">
                  {reminder.dueDate
                    ? formatServiceDate(reminder.dueDate)
                    : reminder.timeLabel}
                </span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
            </Link>
          ))
        ) : (
          <ServiceEmpty
            icon="bell"
            title="No service reminders"
            detail="Set a reminder using a confirmed date from your garage or service plan."
          />
        )}
      </div>
    </BillsCard>
  );
}
