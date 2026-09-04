import { UiIcon } from "@/components/UiIcon";
import { ChecklistItemRow } from "@/components/driveway/travel-checklist/ChecklistItemRow";
import { categoryDetails } from "@/components/driveway/travel-checklist/travel-checklist-model";
import type { TravelChecklistController } from "@/components/driveway/travel-checklist/useTravelChecklistController";
import { travelChecklistCategories } from "@/lib/travel-checklist-records";

export function TravelChecklistCategoryView({
  controller,
}: {
  controller: TravelChecklistController;
}) {
  const items = controller.selectedItems.filter(
    (item) => item.category === controller.category,
  );
  return (
    <section className="mt-5 rounded-[24px] border border-[#b8a071]/25 bg-white/88 p-4 shadow-[0_18px_45px_-38px_rgba(32,53,42,0.45)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#315b42]">
          <UiIcon
            name={categoryDetails[controller.category].icon}
            className="h-[18px] w-[18px]"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-xl">{controller.category}</h2>
          <p className="mt-0.5 text-[10px] text-[#667068]">
            {categoryDetails[controller.category].hint}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {travelChecklistCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => {
              controller.setCategory(category);
              controller.setItemCategory(category);
            }}
            className={`min-h-11 shrink-0 rounded-full px-3 text-[10px] font-semibold ${controller.category === category ? "bg-[#205238] text-white" : "border border-[#173c2b]/10 bg-[#fffdf8] text-[#315b42]"}`}
          >
            {category}
          </button>
        ))}
      </div>
      <ul className="mt-2">
        {items.length ? (
          items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              onToggle={controller.toggleItem}
              onDelete={controller.deleteItem}
            />
          ))
        ) : (
          <li className="rounded-[18px] border border-dashed border-[#6f8e72]/30 bg-[#eef2e9]/65 px-4 py-8 text-center text-xs leading-5 text-[#667068]">
            No items in {controller.category.toLowerCase()} yet.
          </li>
        )}
      </ul>
      <button
        type="button"
        onClick={() => {
          controller.setItemCategory(controller.category);
          controller.setAddOpen(true);
        }}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] border border-dashed border-[#9b8254]/45 bg-[#fffaf0] text-xs font-semibold text-[#315b42]"
      >
        <UiIcon name="plus" className="h-4 w-4" />
        Add custom item
      </button>
      <div className="mt-4 rounded-[16px] bg-[#eef2e9] p-3">
        <div className="flex items-center justify-between text-[10px] font-semibold text-[#315b42]">
          <span>
            {controller.completedCount} / {controller.totalCount} packed
          </span>
          <span>{controller.progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-[#3f704e]"
            style={{ width: `${controller.progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
