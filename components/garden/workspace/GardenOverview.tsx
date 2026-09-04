import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

import { GardenEmptyPreview, GardenPanel } from "./GardenUi";
import type { GardenViewModel } from "./useGardenWorkspace";

export function GardenOverview({ view }: { view: GardenViewModel }) {
  return (
    <>
      <GardenPanel className="mt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
          Your Pets & Garden at a glance
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            [view.gardenReminders.length, "Active reminders"],
            [view.gardenDocuments.length, "Outdoor files"],
            [view.reviewDocuments.length, "To review"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="rounded-[18px] bg-[#eef2e9] px-2 py-4 text-center"
            >
              <p className="font-serif text-3xl leading-none text-[#315443]">
                {value}
              </p>
              <p className="mt-2 text-[10px] font-semibold leading-4 text-[#667068]">
                {label}
              </p>
            </div>
          ))}
        </div>
        {!view.gardenReminders.length && !view.gardenDocuments.length ? (
          <p className="mt-4 rounded-2xl bg-[#faf9f4] px-4 py-3 text-[11px] leading-5 text-[#667068]">
            Your Pets & Garden area starts quietly. Add a reminder or upload an
            outdoor record when you are ready.
          </p>
        ) : null}
      </GardenPanel>
      <GardenPanel className="mt-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
              Things to review
            </p>
            <h2 className="mt-1 font-serif text-2xl">
              What needs your attention
            </h2>
          </div>
          {view.attentionItems.length ? (
            <Link
              href="/reminders"
              className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#52705a]"
            >
              View all
            </Link>
          ) : null}
        </div>
        {view.attentionItems.length ? (
          <div className="mt-4 space-y-2">
            {view.attentionItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex min-h-[68px] items-center gap-3 rounded-[18px] bg-[#faf9f4] p-3 transition hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
                  <UiIcon name={item.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">
                    {item.title}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-[#667068]">
                    {item.detail}
                  </span>
                </span>
                <UiIcon
                  name="chevron-right"
                  className="h-4 w-4 shrink-0 text-[#7b847d]"
                />
              </Link>
            ))}
          </div>
        ) : (
          <GardenEmptyPreview
            icon="check"
            title="Nothing needs review"
            detail="Pet, garden and outdoor records that need checking will appear here."
            href="/reminders"
            action="Reminders"
          />
        )}
      </GardenPanel>
    </>
  );
}
