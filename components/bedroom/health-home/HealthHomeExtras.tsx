import Link from "next/link";

import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";

import { addHealthLinks, secondarySections } from "./health-home-model";
import { Panel } from "./HealthHomeUi";
import type { BedroomHealthViewModel } from "./useBedroomHealth";

export function EmergencyProfile({ view }: { view: BedroomHealthViewModel }) {
  const complete =
    view.profileProgress.completed === view.profileProgress.total;
  return (
    <Panel className="mt-5 bg-[linear-gradient(135deg,#eef2e9,#fffdf8)]">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white text-[#52705a]">
          <UiIcon name="shield" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-xl">Emergency profile</h2>
          <p className="mt-1 text-xs leading-5 text-[#667068]">
            {complete
              ? "Your emergency information is organised. It has not been medically verified."
              : `${view.profileProgress.total - view.profileProgress.completed} important details still need to be added.`}
          </p>
          <Link
            href="/bedroom/emergency"
            className="mt-3 inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white"
          >
            Review emergency information
          </Link>
        </div>
      </div>
    </Panel>
  );
}

export function SecondaryHealthSections({
  view,
}: {
  view: BedroomHealthViewModel;
}) {
  return (
    <section className="mt-7">
      <h2 className="font-serif text-3xl">More health records</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {secondarySections.map((section) => {
          const count = view.sectionCounts[section.title] ?? 0;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="min-h-[118px] rounded-[20px] border border-[#20352a]/[0.07] bg-white/90 p-4 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e8eee3] text-[#52705a]">
                <UiIcon name={section.icon} className="h-4 w-4" />
              </span>
              <span className="mt-3 block text-xs font-semibold">
                {section.title}
              </span>
              <span className="mt-1 block text-[10px] leading-4 text-[#667068]">
                {count ? `${count} recorded` : section.description}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function AddHealthModal({ view }: { view: BedroomHealthViewModel }) {
  return (
    <ModalShell
      open={view.addOpen}
      title="Add to My Health"
      subtitle="Choose what you want to organise. DiaryDock will not create clinical conclusions automatically."
      onClose={() => view.setAddOpen(false)}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {addHealthLinks.map(([label, href, icon]) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#20352a]/[0.07] bg-white px-3 text-xs font-semibold"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8eee3] text-[#52705a]">
              <UiIcon name={icon} className="h-4 w-4" />
            </span>
            {label}
            <UiIcon
              name="chevron-right"
              className="ml-auto h-4 w-4 text-[#7b847d]"
            />
          </Link>
        ))}
      </div>
    </ModalShell>
  );
}
