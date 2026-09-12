"use client";

import { useState } from "react";
import Link from "next/link";
import { PRICING_PLANS, formatPlanPrice, type PaidPlanId } from "@/lib/pricing";

export function WebSubscriptions({ storage }: { storage?: { usedBytes: number; limitBytes: number } | null }) {
  const [selected, setSelected] = useState<PaidPlanId>("STARTER");
  const [review, setReview] = useState(false);
  const [message, setMessage] = useState("");
  const plan = PRICING_PLANS.find((item) => item.id === selected)!;
  return <div className="space-y-6 text-[#20352a]">
    <aside className="rounded-2xl border border-[#d9dfcf] bg-[#edf1e7] p-5">
      <strong>Subscriptions are coming soon</strong>
      <p className="mt-2 text-sm leading-6">Explore the plans below. Selecting a plan does not take payment or change your storage.</p>
    </aside>
    {review ? <section className="rounded-3xl border border-[#20352a]/15 bg-white p-7" aria-label="Selected plan">
      <h2 className="text-2xl font-semibold">{plan.name}</h2>
      <p className="mt-4 text-4xl font-semibold">{formatPlanPrice(plan.monthlyPricePence)} <span className="text-base font-normal">/ month</span></p>
      <p className="mt-4 text-lg">{plan.storageGb} GB document storage per account</p>
      <p className="mt-3 text-sm text-[#667068]">No charge today. Purchasing will be available in the mobile app when subscriptions launch.</p>
      <div className="mt-6 flex flex-wrap gap-4">
        <button type="button" disabled className="min-h-12 rounded-xl bg-[#20352a] px-5 text-white opacity-60">Purchasing available at launch</button>
        <button type="button" onClick={() => setReview(false)} className="min-h-12 rounded-xl border border-[#20352a]/20 px-5 font-semibold">Back to plans</button>
      </div>
    </section> : <>
      <fieldset>
        <legend className="mb-4 text-lg font-semibold">Choose a monthly plan</legend>
        <div className="grid gap-5 md:grid-cols-3">
          {PRICING_PLANS.map((item) => <label key={item.id}
            className={`cursor-pointer rounded-3xl border-2 p-6 focus-within:ring-2 focus-within:ring-[#486a50] ${selected === item.id ? "border-[#486a50] bg-[#edf1e7]" : "border-[#20352a]/10 bg-white"}`}>
            <span className="flex items-center gap-3"><input type="radio" name="web-plan" value={item.id}
              checked={selected === item.id} onChange={() => setSelected(item.id)} className="h-5 w-5 accent-[#486a50]" />
              <strong className="text-xl">{item.name}</strong></span>
            <span className="mt-7 block text-3xl font-semibold">{formatPlanPrice(item.monthlyPricePence)} <span className="text-sm font-normal">/ month</span></span>
            <span className="mt-5 block font-medium">{item.storageGb} GB document storage</span>
          </label>)}
        </div>
      </fieldset>
      <p className="text-sm text-[#667068]">All prices in GBP. Storage is per account, including Family. No free subscription tier.</p>
      <button type="button" onClick={() => setReview(true)} className="min-h-12 rounded-2xl bg-[#20352a] px-7 font-semibold text-white">Review {plan.name} plan</button>
    </>}
    {storage ? <section className="rounded-2xl border border-[#20352a]/10 bg-white p-5">
      <h2 className="font-semibold">Your current storage</h2>
      <p className="mt-2">{(storage.usedBytes / 1024 ** 3).toFixed(2)} GB used of {(storage.limitBytes / 1024 ** 3).toFixed(2)} GB</p>
    </section> : null}
    <div className="flex flex-wrap gap-4">
      <button type="button" onClick={() => setMessage("Restore purchases will be available in the mobile app when App Store and Google Play subscriptions launch. No restore was attempted.")}
        className="min-h-11 text-sm font-semibold underline underline-offset-4">Restore purchases</button>
      <button type="button" onClick={() => setMessage("Subscription management will be available when purchasing launches. No subscription has been changed.")}
        className="min-h-11 text-sm font-semibold underline underline-offset-4">Manage subscription</button>
      <Link href="/terms" className="inline-flex min-h-11 items-center text-sm underline">Terms</Link>
      <Link href="/privacy" className="inline-flex min-h-11 items-center text-sm underline">Privacy</Link>
    </div>
    <p role="status" className="text-sm text-[#486a50]">{message}</p>
  </div>;
}
