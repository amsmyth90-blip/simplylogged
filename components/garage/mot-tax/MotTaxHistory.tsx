import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";

import { formatMotDate } from "./mot-tax-model";
import { useMotTax } from "./MotTaxContext";
import { MotTaxEmpty, MotTaxSectionTitle } from "./MotTaxUi";

export function MotTaxHistory() {
  const motTax = useMotTax();
  if (!motTax.vehicle) return null;
  const vehicle = motTax.vehicle;
  const history = [...vehicle.motHistory].sort((a, b) =>
    b.testDate.localeCompare(a.testDate),
  );
  return (
    <BillsCard>
      <MotTaxSectionTitle
        title="MOT history"
        detail="Results are shown only when you record them"
        action={
          <button
            type="button"
            onClick={motTax.openMot}
            className="min-h-11 rounded-[12px] bg-[#eef2e9] px-3 text-xs font-semibold text-[#45604d]"
          >
            Add MOT
          </button>
        }
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
                    {formatMotDate(record.testDate)}
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase ${record.result === "pass" ? "bg-[#e5efdf] text-[#45604d]" : "bg-[#fbe5df] text-[#a4473d]"}`}
                  >
                    {record.result}
                  </span>
                </div>
                <p className="text-right text-[11px] text-[#667068]">
                  {record.mileage !== null
                    ? `${record.mileage.toLocaleString("en-GB")} miles`
                    : "Mileage not recorded"}
                  <br />
                  {record.advisoryCount} advisor
                  {record.advisoryCount === 1 ? "y" : "ies"}
                </p>
              </div>
              {record.notes ? (
                <p className="mt-3 text-[11px] leading-5 text-[#667068]">
                  {record.notes}
                </p>
              ) : null}
              {record.documentId ? (
                <Link
                  href={`/document/${record.documentId}?from=vehicle&vehicleId=${vehicle.id}`}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#45604d]"
                >
                  <UiIcon name="file" className="h-4 w-4" />
                  View certificate
                </Link>
              ) : null}
            </article>
          ))
        ) : (
          <MotTaxEmpty
            title="No MOT history recorded"
            detail="Add past or future MOT results when you have confirmed information."
          />
        )}
      </div>
    </BillsCard>
  );
}
