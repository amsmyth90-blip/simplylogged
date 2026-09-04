"use client";

import { fieldClass } from "@/components/bills/BillsUi";
import { homeInventoryRooms, type HomeInventoryRoom } from "@/lib/insurance-records";

import type { HomeInventoryController } from "./useHomeInventoryController";

export function HomeInventoryForm({ controller }: { controller: HomeInventoryController }) {
  const { draft, setDraft, save } = controller;
  return (
    <div className="mt-5 rounded-[18px] bg-[#f6f5ef] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#667068]">
          Item name
          <input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} className={fieldClass} />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Room
          <select value={draft.room} onChange={event => setDraft({ ...draft, room: event.target.value as HomeInventoryRoom })} className={fieldClass}>
            {homeInventoryRooms.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Category
          <input value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })} className={fieldClass} />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Quantity
          <input type="number" min="1" value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: Math.max(1, Number(event.target.value)) })} className={fieldClass} />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Estimated value each (£)
          <input type="number" min="0" step="0.01" value={draft.estimatedValue || ""} onChange={event => setDraft({ ...draft, estimatedValue: Number(event.target.value) })} className={fieldClass} />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Purchase date
          <input type="date" value={draft.purchaseDate} onChange={event => setDraft({ ...draft, purchaseDate: event.target.value })} className={fieldClass} />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Serial number (masked)
          <input value={draft.serialNumberMasked} onChange={event => setDraft({ ...draft, serialNumberMasked: event.target.value })} className={fieldClass} placeholder="•••• 1234" />
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a]">
          <input type="checkbox" checked={draft.highValue} onChange={event => setDraft({ ...draft, highValue: event.target.checked })} className="h-4 w-4 accent-[#45604d]" />
          Mark as high value
        </label>
      </div>
      <button type="button" onClick={save} className="mt-4 min-h-11 w-full rounded-[14px] bg-[#2f5140] text-sm font-semibold text-white">Save inventory item</button>
    </div>
  );
}
