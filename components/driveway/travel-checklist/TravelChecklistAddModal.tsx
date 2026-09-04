import { ModalShell } from "@/components/ModalShell";
import type { TravelChecklistController } from "@/components/driveway/travel-checklist/useTravelChecklistController";
import { travelChecklistCategories, type TravelChecklistCategory } from "@/lib/travel-checklist-records";

export function TravelChecklistAddModal({ controller }: { controller: TravelChecklistController }) {
  return (
    <ModalShell
      open={controller.addOpen}
      title="Add a checklist item"
      subtitle={controller.selectedTrip ? `For ${controller.selectedTrip.title}` : "For your general travel checklist"}
      onClose={controller.closeAdd}
      footer={<button type="button" onClick={controller.addItem} className="min-h-12 w-full rounded-2xl bg-[#205238] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2">Save item</button>}
    >
      <div className="space-y-4">
        <label className="block text-xs font-semibold text-[#3c5145]">
          Checklist item *
          <input value={controller.itemLabel} onChange={(event) => { controller.setFormError(""); controller.setItemLabel(event.target.value); }} placeholder="What needs to be done or packed?" className="mt-2 min-h-12 w-full rounded-[15px] border border-[#173c2b]/10 bg-white px-3 text-sm font-normal outline-none focus:border-[#6f8e72]" />
        </label>
        <label className="block text-xs font-semibold text-[#3c5145]">
          Category
          <select value={controller.itemCategory} onChange={(event) => controller.setItemCategory(event.target.value as TravelChecklistCategory)} className="mt-2 min-h-12 w-full rounded-[15px] border border-[#173c2b]/10 bg-white px-3 text-sm font-normal outline-none focus:border-[#6f8e72]">
            {travelChecklistCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        {controller.formError ? <p role="alert" className="rounded-xl bg-[#f8e7e2] px-3 py-2 text-xs font-medium text-[#8a5145]">{controller.formError}</p> : null}
      </div>
    </ModalShell>
  );
}
