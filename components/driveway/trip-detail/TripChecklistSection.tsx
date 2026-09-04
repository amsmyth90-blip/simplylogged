"use client";
import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";
import { EmptySection, SectionHeading } from "./trip-detail-shared";
import type { TripDetailController } from "./useTripDetailController";
export function TripChecklistSection({
  controller,
}: {
  controller: TripDetailController;
}) {
  const { trip, tripChecklist, toggleChecklist } = controller;
  if (!trip) return null;
  return (
    <section>
      <SectionHeading
        title="Travel checklist"
        detail="This is the existing trip-linked checklist, not a separate list."
        action={
          <Link
            href={`/driveway/travel-checklist?trip=${trip.id}`}
            className="min-h-11 rounded-full bg-[#2f5140] px-4 py-3 text-xs font-semibold text-white"
          >
            Open full checklist
          </Link>
        }
      />
      {tripChecklist.length ? (
        <div className="mt-5 space-y-2">
          {tripChecklist.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleChecklist(item)}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[#20352a]/[0.07] bg-white/90 px-3 text-left"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.completed ? "bg-[#52705a] text-white" : "border border-[#52705a]/20 bg-white text-transparent"}`}
              >
                <UiIcon name="check" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-medium ${item.completed ? "text-[#667068] line-through" : ""}`}
                >
                  {item.label}
                </span>
                <span className="text-[10px] text-[#667068]">
                  {item.category}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptySection
            icon="check"
            title="No checklist items yet"
            detail="Open the full Travel Checklist to add custom items, suggestions or a template."
          />
        </div>
      )}
    </section>
  );
}
