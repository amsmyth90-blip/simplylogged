import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";

import { formatMotDate, vehicleKeyDates } from "./mot-tax-model";
import { useMotTax } from "./MotTaxContext";
import { MotTaxDateCard, MotTaxSectionTitle } from "./MotTaxUi";

export function MotTaxKeyDates() {
  const motTax = useMotTax();
  if (!motTax.vehicle) return null;
  return (
    <BillsCard>
      <MotTaxSectionTitle
        title="Upcoming key dates"
        detail="Dates recorded across this vehicle"
        action={
          <Link
            href="/reminders"
            className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#45604d]"
          >
            Open reminders
          </Link>
        }
      />
      <div className="mt-4 space-y-2">
        {vehicleKeyDates(motTax.vehicle).map((item) => (
          <MotTaxDateCard key={item.label} {...item} />
        ))}
      </div>
      {motTax.garageReminders.length ? (
        <div className="mt-5 border-t border-[#20352a]/[0.07] pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f8e72]">
            Existing Garage reminders
          </p>
          <div className="mt-2 space-y-2">
            {motTax.garageReminders.slice(0, 5).map((reminder) => (
              <Link
                key={reminder.id}
                href="/reminders"
                className="flex min-h-[62px] items-center gap-3 rounded-[16px] bg-[#faf9f4] px-3"
              >
                <UiIcon name="bell" className="h-4 w-4 text-[#52705a]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-[#20352a]">
                    {reminder.title}
                  </span>
                  <span className="text-[10px] text-[#667068]">
                    {reminder.dueDate
                      ? formatMotDate(reminder.dueDate)
                      : reminder.timeLabel}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </BillsCard>
  );
}
