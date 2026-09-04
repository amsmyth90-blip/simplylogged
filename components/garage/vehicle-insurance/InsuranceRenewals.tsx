import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";
import {
  formatInsuranceDate,
  formatInsuranceMoney,
  insuranceRenewalMessage,
} from "@/components/garage/vehicle-insurance-model";
import { useVehicleInsuranceModel } from "@/components/garage/vehicle-insurance/VehicleInsuranceContext";
import {
  Empty,
  SectionTitle,
  StatusPill,
} from "@/components/garage/vehicle-insurance/InsuranceUi";

export function InsuranceRenewals() {
  const { openRenewal, vehicle } = useVehicleInsuranceModel();
  if (!vehicle) return null;
  const insurance = vehicle.motorInsurance;
  const renewal = insuranceRenewalMessage(vehicle.insuranceRenewalDate);
  const history = [...insurance.renewals].sort((a, b) =>
    b.renewalDate.localeCompare(a.renewalDate),
  );

  return (
    <div className="space-y-4">
      <BillsCard className="bg-[linear-gradient(135deg,#edf3e9,#fffdf8)]">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#52705a]">
            <UiIcon name="calendar" className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f8e72]">
              Next renewal
            </p>
            <p className="mt-1 text-lg font-semibold text-[#20352a]">
              {formatInsuranceDate(vehicle.insuranceRenewalDate)}
            </p>
            <p className={`mt-1 text-[11px] font-semibold ${renewal.tone}`}>
              {renewal.label}
            </p>
          </div>
        </div>
      </BillsCard>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/reminders"
          className="flex min-h-[76px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-3"
        >
          <UiIcon name="bell" className="h-5 w-5 text-[#52705a]" />
          <span className="text-xs font-semibold text-[#20352a]">
            Manage reminders
          </span>
        </Link>
        <button
          type="button"
          onClick={openRenewal}
          className="flex min-h-[76px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-3 text-left"
        >
          <UiIcon name="plus" className="h-5 w-5 text-[#52705a]" />
          <span className="text-xs font-semibold text-[#20352a]">
            Record renewal
          </span>
        </button>
      </div>
      <BillsCard>
        <SectionTitle
          title="Renewal history"
          detail="Quotes and renewal decisions you have recorded"
        />
        <div className="mt-4 space-y-3">
          {history.length ? (
            history.map((record) => (
              <article
                key={record.id}
                className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#faf9f4] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#20352a]">
                      {formatInsuranceDate(record.renewalDate)}
                    </p>
                    <p className="mt-1 text-[10px] text-[#667068]">
                      {record.provider || "Provider not recorded"}
                    </p>
                  </div>
                  <StatusPill status={record.outcome} />
                </div>
                <p className="mt-3 text-xs font-semibold text-[#20352a]">
                  {formatInsuranceMoney(record.premium)}
                </p>
                {record.notes ? (
                  <p className="mt-2 text-[11px] leading-5 text-[#667068]">
                    {record.notes}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <Empty
              icon="clock"
              title="No renewal history recorded"
              detail="Record a renewal or switch when you have confirmed the details."
            />
          )}
        </div>
      </BillsCard>
    </div>
  );
}
