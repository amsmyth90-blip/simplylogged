import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";

import {
  daysUntil,
  formatServiceDate,
  formatServiceMoney,
} from "./service-model";
import { useServiceRecords } from "./ServiceRecordsContext";
import {
  ServiceAction,
  ServiceEmpty,
  ServiceInfoTile,
  ServiceSectionTitle,
} from "./ServiceUi";

export function ServiceOverview() {
  const service = useServiceRecords();
  const { vehicle } = service;
  if (!vehicle) return null;

  const lastService = [...service.serviceRecords].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0];
  const totalSpent = service.serviceRecords.reduce(
    (sum, entry) => sum + (entry.cost ?? 0),
    0,
  );
  const dueDays = daysUntil(vehicle.nextServiceDate);
  const mileageRemaining =
    vehicle.nextServiceMileage !== null && service.mileage !== null
      ? vehicle.nextServiceMileage - service.mileage
      : null;
  const needsAttention =
    (dueDays !== null && dueDays < 0) ||
    (mileageRemaining !== null && mileageRemaining < 0);
  const health = !service.serviceRecords.length
    ? {
        label: "Start your history",
        detail: "Add your first confirmed service record.",
        tone: "bg-[#f2efe5] text-[#806b45]",
      }
    : needsAttention
      ? {
          label: "Needs attention",
          detail: "A recorded service date or mileage has passed.",
          tone: "bg-[#fbe5df] text-[#a4473d]",
        }
      : {
          label: "On track",
          detail:
            "Your recorded service history and next-service details are up to date.",
          tone: "bg-[#e9f0e4] text-[#45604d]",
        };

  return (
    <div className="space-y-4">
      <BillsCard className="bg-[linear-gradient(135deg,#edf3e9,#fffdf8)]">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#52705a]">
            <UiIcon name="gear" className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f8e72]">
              Next service due
            </p>
            <p className="mt-1 text-lg font-semibold text-[#20352a]">
              {formatServiceDate(vehicle.nextServiceDate)}
            </p>
            <p
              className={`mt-1 text-[11px] font-semibold ${dueDays !== null && dueDays < 0 ? "text-[#a4473d]" : "text-[#315d45]"}`}
            >
              {dueDays === null
                ? "Add a date or mileage"
                : dueDays < 0
                  ? `${Math.abs(dueDays)} days overdue`
                  : `in ${dueDays} days`}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ServiceInfoTile
            label="Due at"
            value={
              vehicle.nextServiceMileage === null
                ? "Not recorded"
                : `${vehicle.nextServiceMileage.toLocaleString("en-GB")} miles`
            }
          />
          <ServiceInfoTile
            label="Mileage remaining"
            value={mileageText(mileageRemaining)}
          />
        </div>
      </BillsCard>
      <BillsCard>
        <ServiceSectionTitle
          title="Service summary"
          detail="Based on the records saved in DiaryDock"
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ServiceInfoTile
            label="Total spent"
            value={formatServiceMoney(totalSpent)}
          />
          <ServiceInfoTile
            label="Records"
            value={`${service.serviceRecords.length}`}
          />
          <ServiceInfoTile
            label="Last service mileage"
            value={
              lastService?.mileage == null
                ? "Not recorded"
                : `${lastService.mileage.toLocaleString("en-GB")} miles`
            }
          />
          <ServiceInfoTile
            label="Most recent garage"
            value={lastService?.provider || "Not recorded"}
          />
        </div>
      </BillsCard>
      <BillsCard>
        <ServiceSectionTitle
          title="Last service"
          detail={
            lastService
              ? `${formatServiceDate(lastService.date)} · ${formatServiceMoney(lastService.cost)}`
              : "No service history yet"
          }
        />
        {lastService ? (
          <div className="mt-4">
            <p className="text-sm font-semibold text-[#20352a]">
              {lastService.title}
            </p>
            <p className="mt-1 text-[11px] text-[#667068]">
              {[
                lastService.provider,
                lastService.mileage !== null
                  ? `${lastService.mileage.toLocaleString("en-GB")} miles`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <Link
              href={`${service.base}/${lastService.id}`}
              className="mt-4 flex min-h-12 items-center justify-center rounded-[14px] border border-[#6f8e72]/30 text-xs font-semibold text-[#45604d]"
            >
              View service details
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            <ServiceEmpty
              icon="gear"
              title="No service recorded"
              detail="Add your first confirmed service to begin the history."
            />
          </div>
        )}
      </BillsCard>
      <BillsCard className={health.tone}>
        <div className="flex items-start gap-3">
          <UiIcon name="shield" className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{health.label}</p>
            <p className="mt-1 text-[11px] leading-5 opacity-80">
              {health.detail}
            </p>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <ServiceSectionTitle
          title="Quick actions"
          detail="Add information or open the right Garage area"
        />
        <div className="mt-4 space-y-2">
          <ServiceAction
            icon="plus"
            label="Add a service"
            onClick={() => service.openNewService("service")}
          />
          <ServiceAction
            icon="gear"
            label="Add maintenance record"
            onClick={() => service.openNewService("inspection")}
          />
          <ServiceAction
            href={`${service.base}?view=history`}
            icon="clock"
            label="View full service history"
          />
          <ServiceAction
            icon="bell"
            label="Set service reminder"
            onClick={service.openReminder}
          />
          <ServiceAction
            icon="file"
            label={
              service.exporting
                ? "Preparing summary…"
                : "Download service summary"
            }
            onClick={() => void service.exportSummary()}
          />
        </div>
      </BillsCard>
    </div>
  );
}

function mileageText(value: number | null) {
  if (value === null) return "Not recorded";
  return value < 0
    ? `${Math.abs(value).toLocaleString("en-GB")} miles overdue`
    : `${value.toLocaleString("en-GB")} miles`;
}
