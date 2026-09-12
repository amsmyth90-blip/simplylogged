import Image from "next/image";
import Link from "next/link";
import { PRICING_PLANS, formatPlanPrice } from "@/lib/pricing";

const spaces = [
  { title: "A place for every document", text: "Find your bills, policies, contracts and important records together.", image: "/images/office-interactive-v1.webp" },
  { title: "Keep everyday life in order", text: "Plan meals, keep reminders and organise your household calendar.", image: "/images/kitchen-command-centre.webp" },
  { title: "Ready for the people you trust", text: "Manage household sharing, emergency information and your wishes.", image: "/images/family-fireside-clean.webp" },
];

export function WebsiteHome() {
  return <div className="pb-8 text-[#20352a]">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#20352a]/10 py-4">
      <Link href="/" className="flex items-center gap-3 font-serif text-2xl"><Image src="/icons/icon-192-green.png" alt="" width={42} height={42} className="rounded-xl" />DiaryDock</Link>
      <nav aria-label="Website navigation" className="flex flex-wrap items-center gap-4 text-sm font-semibold">
        <Link href="#spaces" className="inline-flex min-h-11 items-center">Explore</Link>
        <Link href="/pricing" className="inline-flex min-h-11 items-center">Pricing</Link>
        <Link href="/login" className="inline-flex min-h-11 items-center rounded-full bg-[#20352a] px-5 text-white">Sign in</Link>
      </nav>
    </header>
    <section className="grid items-center gap-8 py-12 lg:grid-cols-2 lg:gap-12 lg:py-20">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5d745f]">Your digital home</p>
        <h1 className="mt-5 font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl">Life feels lighter<br />when it has a place.</h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-[#667068]">Your documents, family plans and everyday reminders, together in DiaryDock. Pick up on your computer where you left off on your phone.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="inline-flex min-h-12 items-center rounded-2xl bg-[#20352a] px-6 font-semibold text-white">Open my DiaryDock</Link>
          <Link href="/signup" className="inline-flex min-h-12 items-center rounded-2xl border border-[#20352a]/20 bg-white px-6 font-semibold">Create an account</Link>
        </div>
        <p className="mt-4 text-sm text-[#667068]">Already use the app? Sign in with the same email and password.</p>
      </div>
      <div className="relative aspect-[5/4] overflow-hidden rounded-[36px] border border-[#20352a]/10 bg-[#e7ecdf] shadow-xl">
        <Image src="/images/estate-dashboard-country.webp" alt="An illustrated home with spaces for family, documents, vehicles and everyday life" fill priority sizes="(min-width: 1024px) 520px, 100vw" className="object-cover" />
      </div>
    </section>
    <section id="spaces" className="scroll-mt-8 border-t border-[#20352a]/10 py-12">
      <h2 className="font-serif text-3xl sm:text-4xl">The same home. A little more room to work.</h2>
      <div className="mt-7 grid gap-6 md:grid-cols-3">
        {spaces.map((space) => <article key={space.title} className="overflow-hidden rounded-3xl border border-[#20352a]/10 bg-white">
          <div className="relative aspect-[16/10]"><Image src={space.image} alt="" fill sizes="(min-width: 768px) 350px, 100vw" className="object-cover" /></div>
          <div className="p-6"><h3 className="text-xl font-semibold">{space.title}</h3><p className="mt-3 text-base leading-7 text-[#667068]">{space.text}</p></div>
        </article>)}
      </div>
      <p className="mt-7 max-w-3xl text-base leading-7 text-[#667068]">Your account also brings together health records, vehicles, travel, garden plans, family memories, Home Handover and Physical Links. Sign in to browse every space.</p>
    </section>
    <section className="rounded-[30px] bg-[#20352a] p-7 text-white sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm text-white/70">Monthly storage plans</p><h2 className="mt-2 font-serif text-3xl">Space that fits your life.</h2></div><Link href="/pricing" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Compare plans</Link></div>
      <div className="mt-7 grid gap-5 sm:grid-cols-3">{PRICING_PLANS.map((plan) => <div key={plan.id} className="rounded-2xl border border-white/20 p-5">
        <h3 className="text-lg font-semibold">{plan.name}</h3><p className="mt-3 text-3xl font-semibold">{formatPlanPrice(plan.monthlyPricePence)}<span className="text-sm font-normal"> / month</span></p><p className="mt-3 text-white/80">{plan.storageGb} GB document storage</p>
      </div>)}</div>
      <p className="mt-6 text-sm leading-6 text-white/75">Subscriptions are coming soon. Purchases will launch in the mobile app. Storage is per account.</p>
    </section>
    <footer className="mt-8 flex flex-wrap justify-between gap-4 border-t border-[#20352a]/10 pt-5 text-sm text-[#667068]">
      <span>DiaryDock · Your digital home</span><nav aria-label="Footer" className="flex flex-wrap gap-5"><Link href="/support">Support</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
    </footer>
  </div>;
}
