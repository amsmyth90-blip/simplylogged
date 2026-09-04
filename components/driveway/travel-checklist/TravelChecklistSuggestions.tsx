import { UiIcon } from "@/components/UiIcon";
import { checklistTemplates } from "@/components/driveway/travel-checklist/travel-checklist-model";
import type { TravelChecklistController } from "@/components/driveway/travel-checklist/useTravelChecklistController";

export function TravelChecklistSuggestions({
  controller,
}: {
  controller: TravelChecklistController;
}) {
  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-[20px] border border-[#9fb58f]/45 bg-[#eef4e9] p-4">
        <div className="flex gap-3">
          <UiIcon
            name="star"
            className="mt-0.5 h-5 w-5 shrink-0 text-[#315b42]"
          />
          <div>
            <h2 className="text-sm font-bold">
              Suggestions for your checklist
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-[#667068]">
              Based on common travel preparation. Add only what suits your trip.
            </p>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-[24px] border border-[#b8a071]/25 bg-white/88 shadow-[0_18px_45px_-38px_rgba(32,53,42,0.45)]">
        {controller.availableSuggestions.length ? (
          controller.availableSuggestions.map((suggestion) => (
            <article
              key={suggestion.label}
              className="flex min-h-[76px] items-center gap-3 border-b border-[#173c2b]/[0.06] p-3 last:border-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#315b42]">
                <UiIcon name={suggestion.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-semibold">{suggestion.label}</h3>
                <p className="mt-0.5 text-[10px] leading-4 text-[#667068]">
                  {suggestion.detail}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  controller.saveItems([
                    { label: suggestion.label, category: suggestion.category },
                  ])
                }
                className="min-h-11 rounded-full border border-[#638064]/30 bg-[#f8fbf5] px-3 text-[10px] font-semibold text-[#315b42]"
              >
                + Add
              </button>
            </article>
          ))
        ) : (
          <div className="px-5 py-10 text-center text-sm text-[#667068]">
            All current suggestions have been added.
          </div>
        )}
      </section>
      <section className="rounded-[24px] border border-[#b8a071]/25 bg-white/88 p-4">
        <h2 className="text-sm font-bold">Quick-add templates</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {checklistTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => controller.saveItems(template.items)}
              className="min-h-[84px] rounded-[16px] border border-[#173c2b]/10 bg-[#fffdf8] p-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
            >
              <UiIcon
                name={template.icon}
                className="mx-auto h-5 w-5 text-[#315b42]"
              />
              <span className="mt-2 block text-[10px] font-semibold">
                {template.label}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
