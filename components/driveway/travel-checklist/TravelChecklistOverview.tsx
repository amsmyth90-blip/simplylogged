import { UiIcon } from "@/components/UiIcon";
import { categoryDetails } from "@/components/driveway/travel-checklist/travel-checklist-model";
import type { TravelChecklistController } from "@/components/driveway/travel-checklist/useTravelChecklistController";
import { travelChecklistCategories } from "@/lib/travel-checklist-records";

export function TravelChecklistOverview({
  controller,
}: {
  controller: TravelChecklistController;
}) {
  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-[24px] border border-[#b8a071]/25 bg-white/88 p-4 shadow-[0_18px_45px_-38px_rgba(32,53,42,0.45)]">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#edf2e8] text-[#205238]">
            <UiIcon name="map-pin" className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-xl">
              {controller.selectedTrip
                ? controller.selectedTrip.title
                : "Your travel checklist"}
            </h2>
            <p className="mt-1 truncate text-xs text-[#667068]">
              {controller.selectedTrip
                ? controller.selectedTrip.destination
                : "Build a checklist for any journey"}
            </p>
          </div>
          <div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#3f704e ${controller.progress * 3.6}deg, #e5e7df 0deg)`,
            }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-bold text-[#205238]">
              {controller.progress}%
            </span>
          </div>
        </div>
        <ChecklistTotals controller={controller} />
      </section>

      <section className="rounded-[24px] border border-[#b8a071]/25 bg-white/88 p-4 shadow-[0_18px_45px_-38px_rgba(32,53,42,0.45)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Checklist groups</h2>
            <p className="mt-1 text-[10px] text-[#667068]">
              Open a group to pack its items.
            </p>
          </div>
          <button
            type="button"
            onClick={() => controller.setStage("suggestions")}
            className="min-h-11 text-xs font-semibold text-[#315b42]"
          >
            Get suggestions
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {travelChecklistCategories.map((category) => {
            const items = controller.selectedItems.filter(
              (item) => item.category === category,
            );
            const packed = items.filter((item) => item.completed).length;
            const progress = items.length
              ? Math.round((packed / items.length) * 100)
              : 0;
            return (
              <button
                key={category}
                type="button"
                onClick={() => controller.openCategory(category)}
                className="flex min-h-[64px] w-full items-center gap-3 rounded-[16px] border border-[#173c2b]/[0.07] bg-[#fffdf9] p-3 text-left transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#315b42]">
                  <UiIcon
                    name={categoryDetails[category].icon}
                    className="h-4 w-4"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold">
                      {category}
                    </span>
                    <span className="text-[9px] font-semibold text-[#667068]">
                      {packed}/{items.length}
                    </span>
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#e7e6df]">
                    <span
                      className="block h-full rounded-full bg-[#4f7655]"
                      style={{ width: `${progress}%` }}
                    />
                  </span>
                </span>
                <UiIcon
                  name="chevron-right"
                  className="h-4 w-4 shrink-0 text-[#667068]"
                />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function ChecklistTotals({
  controller,
}: {
  controller: TravelChecklistController;
}) {
  return (
    <div className="mt-4 grid grid-cols-3 divide-x divide-[#173c2b]/10 rounded-[16px] bg-[#f6f3eb] py-3 text-center">
      <div>
        <p className="text-lg font-bold">{controller.totalCount}</p>
        <p className="text-[9px] uppercase tracking-wide text-[#667068]">
          Items
        </p>
      </div>
      <div>
        <p className="text-lg font-bold text-[#3f704e]">
          {controller.completedCount}
        </p>
        <p className="text-[9px] uppercase tracking-wide text-[#667068]">
          Packed
        </p>
      </div>
      <div>
        <p className="text-lg font-bold text-[#b07938]">
          {controller.remainingCount}
        </p>
        <p className="text-[9px] uppercase tracking-wide text-[#667068]">
          Still to pack
        </p>
      </div>
    </div>
  );
}
