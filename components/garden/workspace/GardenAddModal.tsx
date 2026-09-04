import Link from "next/link";

import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";

import type { GardenViewModel } from "./useGardenWorkspace";

const actions = [
  {
    href: "/capture?room=garden",
    icon: "camera",
    title: "Upload a Pets & Garden document",
    detail: "Securely scan or upload a pet or outdoor record.",
    tone: "bg-[#eef2e9]",
  },
  {
    href: "/reminders",
    icon: "calendar",
    title: "Add an outdoor reminder",
    detail: "Use DiaryDock's existing reminder system.",
    tone: "bg-[#faf9f4]",
  },
] as const satisfies ReadonlyArray<{
  href: string;
  icon: IconName;
  title: string;
  detail: string;
  tone: string;
}>;

export function GardenAddModal({ view }: { view: GardenViewModel }) {
  return (
    <ModalShell
      open={view.addOpen}
      title="Add to Garden"
      subtitle="Only actions already supported by DiaryDock are shown here."
      onClose={() => view.setAddOpen(false)}
    >
      <div className="space-y-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            onClick={() => view.setAddOpen(false)}
            className={`flex min-h-16 items-center gap-3 rounded-[18px] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${action.tone}`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
              <UiIcon name={action.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[#20352a]">
                {action.title}
              </span>
              <span className="mt-1 block text-[11px] text-[#667068]">
                {action.detail}
              </span>
            </span>
            <UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" />
          </Link>
        ))}
      </div>
    </ModalShell>
  );
}
