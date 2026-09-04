import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";

import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillSectionHeading } from "@/components/wills/WillUi";
import type { LetterDeliveryPreferences } from "@/lib/letter-records";

export function LetterDeliveryPeople({
  delivery,
  setDelivery,
}: {
  delivery: LetterDeliveryPreferences;
  setDelivery: Dispatch<SetStateAction<LetterDeliveryPreferences>>;
}) {
  return (
    <WillCard>
      <WillSectionHeading
        icon="users"
        title="Intended people"
        description="Names here record your wishes; they do not create access permissions."
      />
      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#20352a]">
          Who should receive or access it?
        </span>
        <input
          value={delivery.intendedPeople}
          onChange={(event) =>
            setDelivery((current) => ({
              ...current,
              intendedPeople: event.target.value,
            }))
          }
          className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a]"
          placeholder="Names or relationships"
        />
      </label>
      <label className="mt-4 flex min-h-12 items-start gap-3 rounded-[15px] bg-[#f1f3ec] px-3 py-3 text-[12px] leading-5 text-[#294436]">
        <input
          type="checkbox"
          checked={delivery.trustedSettingsReviewed}
          onChange={(event) =>
            setDelivery((current) => ({
              ...current,
              trustedSettingsReviewed: event.target.checked,
            }))
          }
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#52705a]"
        />
        I have reviewed my trusted-person settings. This does not activate
        delivery or grant access.
      </label>
      <Link
        href="/family"
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/30 px-4 text-sm font-semibold text-[#294436]"
      >
        <UiIcon name="shield" className="h-4 w-4" />
        Open trusted-person settings
      </Link>
    </WillCard>
  );
}
