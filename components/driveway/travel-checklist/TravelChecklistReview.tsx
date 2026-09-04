import { UiIcon } from "@/components/UiIcon";
import { ChecklistTotals } from "@/components/driveway/travel-checklist/TravelChecklistOverview";
import type { TravelChecklistController } from "@/components/driveway/travel-checklist/useTravelChecklistController";

export function TravelChecklistReview({
  controller,
}: {
  controller: TravelChecklistController;
}) {
  const complete = controller.totalCount > 0 && controller.remainingCount === 0;
  return (
    <div className="mt-5 space-y-4">
      <section
        className={`rounded-[22px] border p-4 ${complete ? "border-[#80a477]/45 bg-[#e9f1e5]" : "border-[#d9bc82]/45 bg-[#fff5df]"}`}
      >
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/75 text-[#315b42]">
            <UiIcon
              name={complete ? "check" : "briefcase"}
              className="h-5 w-5"
            />
          </span>
          <div>
            <h2 className="text-sm font-bold">
              {controller.totalCount === 0
                ? "Build your checklist first"
                : complete
                  ? "You're ready to travel"
                  : "You're almost ready"}
            </h2>
            <p className="mt-1 text-[11px] text-[#667068]">
              {controller.totalCount === 0
                ? "Add items or choose a template before final review."
                : complete
                  ? "Every checklist item is complete."
                  : `Review ${controller.remainingCount} remaining item${controller.remainingCount === 1 ? "" : "s"} before you go.`}
            </p>
          </div>
        </div>
      </section>
      <section className="rounded-[24px] border border-[#b8a071]/25 bg-white/88 p-4 shadow-[0_18px_45px_-38px_rgba(32,53,42,0.45)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#a55443]">
              Still to pack ({controller.remainingCount})
            </h2>
            <p className="mt-1 text-[10px] text-[#667068]">
              Everything not yet confirmed.
            </p>
          </div>
          <div
            className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#3f704e ${controller.progress * 3.6}deg, #e5e7df 0deg)`,
            }}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-base font-bold">
              {controller.progress}%
            </span>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {controller.missingItems.length ? (
            controller.missingItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-[13px] bg-[#fff8ef] px-3 py-2 text-xs"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b45a47]" />
                <span className="min-w-0 flex-1">{item.label}</span>
                <span className="text-[9px] text-[#667068]">
                  {item.category}
                </span>
              </li>
            ))
          ) : (
            <li className="rounded-[14px] bg-[#eef4e9] px-3 py-4 text-center text-xs text-[#315b42]">
              No outstanding items.
            </li>
          )}
        </ul>
        <ChecklistTotals controller={controller} />
      </section>
      <button
        type="button"
        disabled={!complete}
        className="min-h-12 w-full rounded-[15px] bg-[#205238] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        Ready to travel
      </button>
    </div>
  );
}
