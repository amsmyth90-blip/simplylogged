import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { gardenSections } from "@/lib/garden-sections";

import { GardenEmptyPreview, GardenPanel } from "./GardenUi";
import type { GardenViewModel } from "./useGardenWorkspace";

export function GardenSectionLinks() {
  return (
    <section aria-labelledby="garden-sections-title" className="mt-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
        Garden sections
      </p>
      <h2 id="garden-sections-title" className="mt-1 font-serif text-3xl">
        Everything outdoors, in its place
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {gardenSections.map((section) => (
          <Link
            key={section.id}
            href={`/garden/${section.id}`}
            className="group flex min-h-[112px] items-center gap-3 rounded-[22px] border border-[#20352a]/[0.07] bg-[#fffdf8] p-4 shadow-[0_22px_44px_-40px_rgba(32,53,42,0.72)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#e8eee3] text-[#52705a]">
              <UiIcon name={section.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {section.title}
              </span>
              <span className="mt-1 block text-[11px] leading-5 text-[#667068]">
                {section.description}
              </span>
            </span>
            <UiIcon
              name="chevron-right"
              className="h-5 w-5 shrink-0 text-[#879087] transition group-hover:translate-x-0.5 motion-reduce:transform-none"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

export function GardenPreviews({ view }: { view: GardenViewModel }) {
  return (
    <section aria-labelledby="garden-previews-title" className="mt-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
        Your outdoor picture
      </p>
      <h2 id="garden-previews-title" className="mt-1 font-serif text-3xl">
        Ready when you are
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <GardenPanel>
          <h3 className="font-serif text-xl">Pets</h3>
          <GardenEmptyPreview
            icon="heart"
            title="No pet profiles connected"
            detail="Pet details will stay private and only appear here when you choose to add them."
            href="/garden/pets"
            action="Open"
          />
        </GardenPanel>
        <GardenPanel>
          <h3 className="font-serif text-xl">Garden jobs</h3>
          {view.gardenReminders.length ? (
            <div className="mt-4 space-y-2">
              {view.gardenReminders.slice(0, 3).map((reminder) => (
                <Link
                  key={reminder.id}
                  href="/reminders"
                  className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#faf9f4] px-3 text-xs"
                >
                  <UiIcon name="calendar" className="h-4 w-4 text-[#52705a]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {reminder.title}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-[#667068]">
                      {reminder.timeLabel}
                    </span>
                  </span>
                  <UiIcon
                    name="chevron-right"
                    className="h-4 w-4 text-[#7b847d]"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <GardenEmptyPreview
              icon="calendar"
              title="No garden jobs recorded"
              detail="Use the existing Reminder system to keep outdoor work and projects visible."
              href="/garden/jobs"
              action="Open"
            />
          )}
        </GardenPanel>
        <GardenPanel>
          <h3 className="font-serif text-xl">Next bin collection</h3>
          <GardenEmptyPreview
            icon="archive"
            title="No collection schedule yet"
            detail="Add schedules only after the dedicated collection workflow is ready."
            href="/garden/bins"
            action="Open"
          />
        </GardenPanel>
        <GardenPanel>
          <h3 className="font-serif text-xl">Outdoor spaces</h3>
          <GardenEmptyPreview
            icon="sun"
            title="No outdoor space notes yet"
            detail="Patio, fence, gate and safety notes can be kept here when needed."
            href="/garden/outdoor-spaces"
            action="Open"
          />
        </GardenPanel>
        <GardenPanel className="sm:col-span-2">
          <h3 className="font-serif text-xl">Tools & Shed</h3>
          <GardenEmptyPreview
            icon="home"
            title="No tools or shed records yet"
            detail="Shed notes, equipment servicing, manuals and warranties can live here."
            href="/garden/tools-shed"
            action="Open"
          />
        </GardenPanel>
      </div>
    </section>
  );
}
