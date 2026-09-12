import type { Metadata } from "next";
import Link from "next/link";

import { PRICING_PLANS, formatPlanPrice } from "@/lib/pricing";

export const metadata: Metadata = { title: "Plans & pricing" };

export default function PricingPage() {
  return (
    <section className="mx-auto w-full max-w-5xl py-8 text-[#20352a] sm:py-14">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
        Back to DiaryDock
      </Link>
      <header className="mb-10 mt-6 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#667068]">DiaryDock plans</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">A plan for your everyday life</h1>
        <p className="mt-5 text-lg text-[#667068]">Three paid plans, with simple monthly pricing in pounds sterling.</p>
      </header>
      <div className="grid gap-5 md:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <article key={plan.id} className="rounded-[28px] border border-[#20352a]/15 bg-[#fffdf8] p-7 shadow-sm">
            <h2 className="text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-7">
              <span className="text-4xl font-semibold tracking-tight">{formatPlanPrice(plan.monthlyPricePence)}</span>
              <span className="ml-1 text-sm text-[#667068]">/ month</span>
            </p>
            <p className="mt-6 text-lg font-semibold">{plan.storageGb} GB document storage</p>
            <p className="mt-8 rounded-2xl bg-[#edf1e9] px-4 py-3 text-sm font-medium">Coming soon</p>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-3xl border border-[#20352a]/10 bg-white/60 p-6">
        <h2 className="text-lg font-semibold">Subscriptions are not available to purchase yet</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667068]">
          Each plan includes a different document storage allowance.
          There is no free subscription tier.
        </p>
        <Link href="/support" className="mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
          Questions? Contact support
        </Link>
      </div>
    </section>
  );
}
