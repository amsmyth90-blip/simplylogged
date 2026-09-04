import { UiIcon } from "@/components/UiIcon";
import type { TravelChecklistItem } from "@/lib/travel-checklist-records";

export function ChecklistItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: TravelChecklistItem;
  onToggle: (item: TravelChecklistItem) => void;
  onDelete: (itemId: string) => void;
}) {
  return (
    <li className="flex min-h-[58px] items-center gap-3 border-b border-[#20352a]/[0.06] py-2 last:border-0">
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-label={`${item.completed ? "Mark not packed" : "Mark packed"}: ${item.label}`}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${item.completed ? "border-[#6f8e72]/30 bg-[#6f8e72] text-white" : "border-[#20352a]/15 bg-white text-transparent"}`}
      >
        <UiIcon name="check" className="h-4 w-4" />
      </button>
      <span
        className={`min-w-0 flex-1 text-sm ${item.completed ? "text-[#667068] line-through" : "font-medium text-[#20352a]"}`}
      >
        {item.label}
      </span>
      <span
        className={`hidden text-[10px] font-semibold sm:block ${item.completed ? "text-[#52705a]" : "text-[#b07938]"}`}
      >
        {item.completed ? "Packed" : "Still to pack"}
      </span>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label={`Delete ${item.label}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#667068] hover:bg-[#f4ebe6] hover:text-[#8a5145] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
      >
        <UiIcon name="plus" className="h-4 w-4 rotate-45" />
      </button>
    </li>
  );
}
