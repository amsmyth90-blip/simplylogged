import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillSectionHeading } from "@/components/wills/WillUi";

import { willFieldClass } from "./WillDetailsUi";
import type { WillDetailsViewModel } from "./useWillDetails";

export function WillExecutorsCard({ view }: { view: WillDetailsViewModel }) {
  return (
    <WillCard>
      <WillSectionHeading
        icon="users"
        title="Executor information"
        description="Recording a person here does not grant them DiaryDock access."
      />
      {(["primaryExecutor", "backupExecutor"] as const).map((key, index) => (
        <fieldset
          key={key}
          className={`${index ? "mt-6 border-t border-[#20352a]/[0.07] pt-5" : "mt-5"}`}
        >
          <legend className="text-sm font-semibold text-[#20352a]">
            {index ? "Backup executor" : "Primary executor"}
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {(["name", "phone", "email"] as const).map((field) => (
              <label key={field} className="block">
                <span className="text-xs font-semibold capitalize text-[#59655d]">
                  {field}
                </span>
                <input
                  type={
                    field === "phone"
                      ? "tel"
                      : field === "email"
                        ? "email"
                        : "text"
                  }
                  value={view.draft[key][field]}
                  onChange={(event) =>
                    view.updateField(key, {
                      ...view.draft[key],
                      [field]: event.target.value,
                    })
                  }
                  className={willFieldClass}
                />
              </label>
            ))}
            <label className="flex min-h-12 items-center gap-3 self-end rounded-[15px] bg-[#f1f3ec] px-3 text-sm text-[#294436]">
              <input
                type="checkbox"
                checked={view.draft[key].informed}
                onChange={(event) =>
                  view.updateField(key, {
                    ...view.draft[key],
                    informed: event.target.checked,
                  })
                }
                className="h-5 w-5 accent-[#52705a]"
              />
              This person has been informed
            </label>
          </div>
        </fieldset>
      ))}
      <label className="mt-5 flex min-h-12 items-center gap-3 rounded-[15px] bg-[#f1f3ec] px-3 text-sm text-[#294436]">
        <input
          type="checkbox"
          checked={view.draft.trustedPersonInformed}
          onChange={(event) =>
            view.updateField("trustedPersonInformed", event.target.checked)
          }
          className="h-5 w-5 accent-[#52705a]"
        />
        A trusted person knows where the original is held
      </label>
      <Link
        href="/family"
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/25 px-4 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
      >
        <UiIcon name="shield" className="h-4 w-4" /> Open trusted-person
        settings
      </Link>
      <p className="mt-3 text-[11px] leading-5 text-[#758078]">
        Access is never granted automatically. Use the existing Family Room
        permissions to manage verified access separately.
      </p>
    </WillCard>
  );
}
