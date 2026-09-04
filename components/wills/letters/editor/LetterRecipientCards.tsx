import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillSectionHeading } from "@/components/wills/WillUi";
import {
  letterPurposeOptions,
  letterRecipientOptions,
  type LetterPurpose,
  type LetterRecipientType,
} from "@/lib/letter-records";

import type { LetterEditorViewModel } from "./useLetterEditor";

export const letterInputClass =
  "mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/15";

export function LetterRecipientCard({ view }: { view: LetterEditorViewModel }) {
  return (
    <WillCard>
      <WillSectionHeading
        icon="users"
        title="Who is this letter for?"
        description="This records your intention; it does not grant the person access."
      />
      <fieldset className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <legend className="sr-only">Recipient type</legend>
        {letterRecipientOptions.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-[84px] cursor-pointer flex-col items-center justify-center rounded-[17px] border px-2 py-3 text-center transition focus-within:ring-2 focus-within:ring-[#6f8e72] motion-reduce:transition-none ${view.draft.recipientType === option.value ? "border-[#6f8e72]/40 bg-[#eef2e9]" : "border-[#20352a]/[0.07] bg-white"}`}
          >
            <input
              type="radio"
              name="recipientType"
              value={option.value}
              checked={view.draft.recipientType === option.value}
              onChange={(event) =>
                view.updateField(
                  "recipientType",
                  event.target.value as LetterRecipientType,
                )
              }
              className="sr-only"
            />
            <UiIcon
              name={
                option.value === "partner"
                  ? "heart"
                  : option.value === "future-me"
                    ? "clock"
                    : "users"
              }
              className="h-5 w-5 text-[#52705a]"
            />
            <span className="mt-2 text-[12px] font-semibold text-[#20352a]">
              {option.label}
            </span>
          </label>
        ))}
      </fieldset>
      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#20352a]">
          Name or relationship{" "}
          <span className="font-normal text-[#667068]">
            (optional unless Other)
          </span>
        </span>
        <input
          value={view.draft.recipientName}
          onChange={(event) =>
            view.updateField("recipientName", event.target.value)
          }
          className={letterInputClass}
          placeholder="For example, my children"
        />
      </label>
    </WillCard>
  );
}

export function LetterPurposeCard({ view }: { view: LetterEditorViewModel }) {
  return (
    <WillCard>
      <WillSectionHeading
        icon="heart"
        title="Letter type"
        description="Choose the purpose that best fits this message."
      />
      <fieldset className="mt-5 space-y-2.5">
        <legend className="sr-only">Letter purpose</legend>
        {letterPurposeOptions.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-[66px] cursor-pointer items-center gap-3 rounded-[16px] border px-4 py-3 transition focus-within:ring-2 focus-within:ring-[#6f8e72] motion-reduce:transition-none ${view.draft.purpose === option.value ? "border-[#6f8e72]/40 bg-[#eef2e9]" : "border-[#20352a]/[0.07] bg-white"}`}
          >
            <input
              type="radio"
              name="purpose"
              value={option.value}
              checked={view.draft.purpose === option.value}
              onChange={(event) =>
                view.updateField("purpose", event.target.value as LetterPurpose)
              }
              className="h-4 w-4 accent-[#52705a]"
            />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-[#20352a]">
                {option.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-[#667068]">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </WillCard>
  );
}
