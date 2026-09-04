import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";

import { UiIcon, type IconName } from "@/components/UiIcon";
import { WillCard, WillSectionHeading } from "@/components/wills/WillUi";
import type {
  LetterDeliveryPreferences,
  LetterDeliveryType,
} from "@/lib/letter-records";

const deliveryOptions: Array<{
  value: LetterDeliveryType;
  title: string;
  description: string;
  icon: IconName;
}> = [
  {
    value: "now",
    title: "Available now",
    description: "Record that you are happy to share it now",
    icon: "clock",
  },
  {
    value: "date",
    title: "Choose a date",
    description: "Record a future date and time",
    icon: "calendar",
  },
  {
    value: "event",
    title: "After an event",
    description: "Describe the life event you have in mind",
    icon: "heart",
  },
  {
    value: "after-death",
    title: "When I pass away",
    description: "Requires a future verified post-death process",
    icon: "shield",
  },
];

export function LetterDeliveryTiming({
  delivery,
  setDelivery,
}: {
  delivery: LetterDeliveryPreferences;
  setDelivery: Dispatch<SetStateAction<LetterDeliveryPreferences>>;
}) {
  const update = (
    field: keyof LetterDeliveryPreferences,
    value: string | boolean,
  ) => setDelivery((current) => ({ ...current, [field]: value }));
  return (
    <>
      <WillCard className="relative overflow-hidden bg-[#f5f1e7] text-center">
        <Image
          src="/images/wills-botanical-leaves.svg"
          alt=""
          width={208}
          height={208}
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 -rotate-12 opacity-25"
        />
        <span className="relative mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#6f8e72]/30 bg-white/70 text-[#52705a]">
          <UiIcon name="heart" className="h-6 w-6" />
        </span>
        <h2 className="relative mt-3 font-serif text-2xl text-[#20352a]">
          When should this letter be available?
        </h2>
        <p className="relative mt-1 text-xs text-[#667068]">
          You can change this preference at any time.
        </p>
      </WillCard>
      <fieldset className="space-y-3">
        <legend className="sr-only">Delivery preference</legend>
        {deliveryOptions.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-[76px] cursor-pointer items-center gap-3 rounded-[18px] border bg-white px-4 py-3 shadow-[0_14px_30px_-28px_rgba(32,53,42,0.55)] transition focus-within:ring-2 focus-within:ring-[#6f8e72] motion-reduce:transition-none ${delivery.type === option.value ? "border-[#6f8e72]/45" : "border-[#20352a]/[0.07]"}`}
          >
            <input
              type="radio"
              name="deliveryType"
              value={option.value}
              checked={delivery.type === option.value}
              onChange={(event) =>
                update("type", event.target.value as LetterDeliveryType)
              }
              className="h-5 w-5 accent-[#52705a]"
            />
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#52705a]">
              <UiIcon name={option.icon} className="h-[18px] w-[18px]" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#20352a]">
                {option.title}
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-[#667068]">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {delivery.type === "date" ? (
        <WillCard>
          <WillSectionHeading icon="calendar" title="Date and reminder" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DeliveryInput
              label="Date"
              type="date"
              value={delivery.date}
              onChange={(value) => update("date", value)}
            />
            <DeliveryInput
              label="Time"
              type="time"
              value={delivery.time}
              onChange={(value) => update("time", value)}
            />
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-[#20352a]">
              Remind me to review
            </span>
            <select
              value={delivery.reminder}
              onChange={(event) => update("reminder", event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a]"
            >
              <option value="none">No reminder</option>
              <option value="1-day">1 day before</option>
              <option value="7-days">7 days before</option>
              <option value="30-days">30 days before</option>
            </select>
          </label>
        </WillCard>
      ) : null}
      {delivery.type === "event" ? (
        <WillCard>
          <label className="block">
            <span className="text-sm font-semibold text-[#20352a]">
              Event or milestone
            </span>
            <textarea
              value={delivery.eventDescription}
              onChange={(event) =>
                update("eventDescription", event.target.value)
              }
              rows={4}
              className="mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm leading-6 text-[#20352a]"
              placeholder="For example, their wedding day or eighteenth birthday"
            />
          </label>
        </WillCard>
      ) : null}
    </>
  );
}

function DeliveryInput({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: "date" | "time";
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#20352a]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a]"
      />
    </label>
  );
}
