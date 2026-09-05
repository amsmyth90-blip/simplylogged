import { UiIcon, type IconName } from "@/components/UiIcon";
import { ADDITIONAL_DASHBOARD_AREAS } from "@/lib/dashboard-areas";
import { estateAreas } from "@/lib/mock-data";

import type { OnboardingViewModel } from "./useOnboarding";

export function AreasStep({ view }: { view: OnboardingViewModel }) {
  return (
    <section className="space-y-4">
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c67a5]">
          Optional spaces
        </p>
        <h1 className="mt-2 font-serif text-3xl text-[#123f34]">
          Would you like anything else?
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#55756c]">
          Your earlier answers selected the relevant areas. Add either of
          these if useful.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ADDITIONAL_DASHBOARD_AREAS.map((question) => {
          const area = estateAreas.find((item) => item.id === question.roomId);
          const selected = view.selectedAreaIds.includes(question.roomId);
          if (!area) return null;
          return (
            <button
              key={question.roomId}
              type="button"
              onClick={() => view.toggleArea(question.roomId)}
              role="switch"
              aria-checked={selected}
              className={`estate-sheet flex min-h-28 items-center gap-4 p-4 text-left transition ${selected ? "!border-[#087a59]" : "hover:border-[#8ab9a9]"}`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selected ? "bg-[#087a59] text-white" : "bg-[#def0e9] text-[#087a59]"}`}
              >
                <UiIcon name={area.icon as IconName} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#153f35]">
                  {question.question}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#55756c]">
                  {question.detail}
                </span>
              </span>
              <span
                className={`relative h-7 w-12 shrink-0 rounded-full ${selected ? "bg-[#087a59]" : "bg-[#c4d7d0]"}`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${selected ? "left-[22px]" : "left-0.5"}`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardPreviewStep({ view }: { view: OnboardingViewModel }) {
  return (
    <section className="estate-sheet overflow-hidden">
      <div className="bg-[#0b5f4b] p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
          Ready to begin
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl">Your DiaryDock dashboard</h1>
            <p className="mt-2 text-sm leading-6 text-white/72">
              We’ll show these {view.selectedAreas.length} areas. Hidden areas
              remain safe and can be added from Settings whenever life changes.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="block font-serif text-4xl text-[#d8c2e6]">
              {view.score.score}%
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/60">
              Starting score
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        {view.selectedAreas.map((area) => (
          <div key={area.id} className="rounded-2xl border border-[#d3e7df] bg-[#f2faf7] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#def0e9] text-[#087a59]">
              <UiIcon name={area.icon as IconName} className="h-4 w-4" />
            </span>
            <p className="mt-2 text-sm font-semibold text-[#153f35]">
              {area.dashboardLabel ?? area.name}
            </p>
            <p className="mt-0.5 text-[10px] leading-4 text-[#607e75]">
              {area.domain}
            </p>
          </div>
        ))}
      </div>
      <p className="px-4 pb-4 text-xs leading-5 text-[#607e75]">
        Home, Documents, Inbox and Settings are always available so the
        essentials can never disappear.
      </p>
    </section>
  );
}
