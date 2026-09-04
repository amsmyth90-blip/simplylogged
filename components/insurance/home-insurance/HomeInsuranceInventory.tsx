"use client";

import { UiIcon } from "@/components/UiIcon";
import { BillsCard, BillsHeader, BillsSectionTitle, BillsShell, fieldClass } from "@/components/bills/BillsUi";
import { formatMoney } from "@/lib/bill-records";
import { homeInventoryRooms } from "@/lib/insurance-records";

import { HomeInsuranceNotice, NoHomePolicy } from "./home-insurance-shared";
import { HomeInventoryForm } from "./HomeInventoryForm";
import { useHomeInventoryController } from "./useHomeInventoryController";

export function HomeInsuranceInventory({ highValueOnly = false }: { highValueOnly?: boolean }) {
  const controller = useHomeInventoryController(highValueOnly);
  const {
    policy, showForm, setShowForm, room, setRoom, category, setCategory, working,
    categories, items, total, upload
  } = controller;
  const title = highValueOnly ? "High-Value Items" : "Home Inventory";
  if (!policy) {
    return (
      <BillsShell>
        <BillsHeader title={title} subtitle="Record belongings against your home policy." backHref="/office/insurance/home" />
        <NoHomePolicy />
      </BillsShell>
    );
  }
  return (
    <BillsShell>
      <BillsHeader title={title} subtitle={highValueOnly ? "Review valuable belongings and the evidence stored with them." : "Organise belongings by room with values, photos and receipts."} backHref="/office/insurance/home" />
      <BillsCard>
        <div className="flex items-center justify-between gap-3">
          <BillsSectionTitle icon={highValueOnly ? "star" : "archive"} title={highValueOnly ? "Valuable belongings" : "Your belongings"} detail={`${items.length} item${items.length === 1 ? "" : "s"} shown · ${formatMoney(total)}`} />
          <button type="button" onClick={() => setShowForm(value => !value)} aria-label="Add inventory item" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2f5140] text-white"><UiIcon name="plus" className="h-5 w-5" /></button>
        </div>
        {showForm ? <HomeInventoryForm controller={controller} /> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Room
            <select value={room} onChange={event => setRoom(event.target.value)} className={fieldClass}>
              <option>All</option>
              {homeInventoryRooms.map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Category
            <select value={category} onChange={event => setCategory(event.target.value)} className={fieldClass}>
              <option>All</option>
              {categories.map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-5 space-y-3">
          {items.length ? items.map(item => (
            <article key={item.id} className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#52705a]"><UiIcon name={item.highValue ? "star" : "home"} className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[#20352a]">{item.name}</h3>
                  <p className="mt-0.5 text-[11px] text-[#667068]">{item.room} · {item.category} · Qty {item.quantity}</p>
                </div>
                <span className="text-sm font-semibold text-[#20352a]">{formatMoney(item.estimatedValue * item.quantity)}</span>
              </div>
              <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[13px] border border-[#6f8e72]/30 px-3 text-xs font-semibold text-[#45604d]">
                <UiIcon name="camera" className="h-4 w-4" />
                {working === item.id ? "Storing…" : `Add photo or receipt${item.photoDocumentIds.length ? ` · ${item.photoDocumentIds.length}` : ""}`}
                <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" onChange={event => void upload(item, event)} disabled={Boolean(working)} className="sr-only" />
              </label>
            </article>
          )) : <p className="rounded-[14px] bg-[#f6f5ef] px-3 py-6 text-center text-xs text-[#667068]">No inventory items match this view.</p>}
        </div>
      </BillsCard>
      <HomeInsuranceNotice />
    </BillsShell>
  );
}
