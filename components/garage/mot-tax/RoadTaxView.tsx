import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";

import { formatMotDate, formatMotMoney } from "./mot-tax-model";
import { useMotTax } from "./MotTaxContext";
import { MotTaxDetail, MotTaxSectionTitle } from "./MotTaxUi";

export function RoadTaxView() {
  const motTax = useMotTax();
  if (!motTax.vehicle) return null;
  const { vehicle } = motTax;
  return (
    <div className="space-y-4">
      <BillsCard className="bg-[linear-gradient(135deg,#eef1e4,#fffdf8)]">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#52705a]">
            <UiIcon name="check" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[#20352a]">
              {vehicle.taxDueDate
                ? "Road-tax renewal recorded"
                : "Add your road-tax details"}
            </h2>
            <p className="mt-1 text-[11px] text-[#667068]">
              {vehicle.taxDueDate
                ? `Renewal date ${formatMotDate(vehicle.taxDueDate)}`
                : "DiaryDock does not check DVLA status automatically."}
            </p>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <MotTaxSectionTitle
          title="Road-tax details"
          detail="Payment information you have chosen to store"
          action={
            <button
              type="button"
              onClick={motTax.openTax}
              className="min-h-11 rounded-[12px] bg-[#eef2e9] px-3 text-xs font-semibold text-[#45604d]"
            >
              Update
            </button>
          }
        />
        <dl className="mt-4">
          <MotTaxDetail
            label="Renewal date"
            value={formatMotDate(vehicle.taxDueDate)}
          />
          <MotTaxDetail
            label="Payment frequency"
            value={vehicle.roadTax.paymentFrequency || "Not recorded"}
          />
          <MotTaxDetail
            label="Amount"
            value={formatMotMoney(vehicle.roadTax.amount)}
          />
          <MotTaxDetail
            label="Paid on"
            value={formatMotDate(vehicle.roadTax.paidDate)}
          />
          <MotTaxDetail
            label="Payment reference"
            value={vehicle.roadTax.paymentReference || "Not recorded"}
          />
          <MotTaxDetail
            label="Vehicle class"
            value={vehicle.roadTax.vehicleClass || "Not recorded"}
          />
        </dl>
        {vehicle.roadTax.documentId ? (
          <Link
            href={`/document/${vehicle.roadTax.documentId}?from=vehicle&vehicleId=${vehicle.id}`}
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-[#6f8e72]/30 text-xs font-semibold text-[#45604d]"
          >
            <UiIcon name="file" className="h-4 w-4" />
            View tax document
          </Link>
        ) : null}
      </BillsCard>
      <p className="rounded-[18px] bg-[#f0f2e9] px-4 py-3 text-[11px] leading-5 text-[#667068]">
        DiaryDock organises the information you enter. Always check official
        vehicle-tax status and payment requirements with DVLA.
      </p>
    </div>
  );
}
