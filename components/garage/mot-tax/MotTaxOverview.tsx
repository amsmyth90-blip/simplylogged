import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";

import { vehicleKeyDates } from "./mot-tax-model";
import { useMotTax } from "./MotTaxContext";
import { MotTaxDateCard, MotTaxSectionTitle } from "./MotTaxUi";

export function MotTaxOverview() {
  const motTax = useMotTax();
  if (!motTax.vehicle) return null;
  const dates = vehicleKeyDates(motTax.vehicle);
  return (
    <div className="space-y-4">
      <BillsCard>
        <MotTaxSectionTitle
          title="Key legal dates"
          detail="A clear summary of what is recorded for this vehicle"
        />
        <div className="mt-4 space-y-2">
          {dates.slice(0, 3).map((item) => (
            <MotTaxDateCard key={item.label} {...item} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href="/reminders"
            className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#355540] px-3 text-xs font-semibold text-white"
          >
            <UiIcon name="plus" className="h-4 w-4" />
            Add reminder
          </Link>
          <Link
            href={`${motTax.base}/key-dates`}
            className="flex min-h-12 items-center justify-center rounded-[14px] border border-[#6f8e72]/30 px-3 text-xs font-semibold text-[#45604d]"
          >
            View all dates
          </Link>
        </div>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <OverviewLink
          href={`${motTax.base}/history`}
          icon="clock"
          title="MOT history"
          detail={`${motTax.vehicle.motHistory.length} recorded test${motTax.vehicle.motHistory.length === 1 ? "" : "s"}`}
        />
        <OverviewLink
          href={`${motTax.base}/documents`}
          icon="folder"
          title="Documents"
          detail={`${motTax.complianceDocuments.length} linked file${motTax.complianceDocuments.length === 1 ? "" : "s"}`}
        />
      </div>
    </div>
  );
}

function OverviewLink({
  href,
  icon,
  title,
  detail,
}: {
  href: string;
  icon: "clock" | "folder";
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[82px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#e8ede3] text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-[#20352a]">
          {title}
        </span>
        <span className="text-[11px] text-[#667068]">{detail}</span>
      </span>
      <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
    </Link>
  );
}
