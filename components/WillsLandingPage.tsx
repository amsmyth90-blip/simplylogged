import Image from "next/image";
import Link from "next/link";

import { UiIcon, type IconName } from "@/components/UiIcon";

type WillsMenuItem = {
  title: string;
  description: string;
  href: string;
  icon: IconName;
};

const willsMenuItems: WillsMenuItem[] = [
  {
    title: "My Will",
    description: "View, upload or organise your will",
    href: "/wills/my-will",
    icon: "file",
  },
  {
    title: "Letters of Wishes",
    description: "Write personal messages and guidance",
    href: "/wills/letters-of-wishes",
    icon: "mail",
  },
  {
    title: "My Wishes & Preferences",
    description: "Record medical, ethical and personal wishes",
    href: "/wills/preferences",
    icon: "leaf",
  },
  {
    title: "Trusted People",
    description: "Manage access and permissions",
    href: "/family",
    icon: "users",
  },
];

const menuCardClass = [
  "group flex min-h-[92px] w-full items-center gap-4 rounded-[21px] border",
  "border-[#20352a]/[0.08] bg-[#fffdf8] p-4 shadow-[0_18px_40px_-28px_rgba(32,53,42,0.38)]",
  "transition-[transform,box-shadow,background-color] duration-200 motion-reduce:transition-none",
  "hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_22px_44px_-26px_rgba(32,53,42,0.42)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]",
  "focus-visible:ring-offset-2 active:translate-y-0 active:bg-[#f7f8f2] sm:min-h-[98px] sm:p-5",
].join(" ");

function WillsPageHeader() {
  return (
    <header className="relative min-h-[390px] overflow-hidden rounded-[32px] border border-[#20352a]/[0.06] bg-[#f5f4ed] px-6 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))] shadow-[0_24px_65px_-45px_rgba(32,53,42,0.34)] sm:min-h-[420px] sm:px-10 sm:pb-14">
      <Image
        src="/images/wills-botanical-leaves.svg"
        alt=""
        aria-hidden="true"
        width={320}
        height={520}
        priority
        className="pointer-events-none absolute -right-16 -top-10 h-[420px] w-auto opacity-70 sm:-right-5 sm:h-[470px]"
      />
      <div className="relative z-10 flex items-center justify-between">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 items-center justify-center text-[#20352a]"
        >
          <UiIcon name="heart" className="h-8 w-8" />
        </span>
        <Link
          href="/family"
          aria-label="Open trusted people and access"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#20352a] transition-colors hover:bg-[#dde6d8]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 active:bg-[#d2dfce]"
        >
          <UiIcon name="users" className="h-7 w-7" />
        </Link>
      </div>

      <div className="relative z-10 mt-16 max-w-[31rem] sm:mt-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6f8e72]">
          Private planning
        </p>
        <h1 className="mt-4 max-w-[28rem] font-serif text-[43px] font-normal leading-[0.98] tracking-[-0.045em] text-[#20352a] sm:text-[56px]">
          Wills &amp; Letters of Wishes
        </h1>
        <div className="mt-6 space-y-1 text-[16px] leading-7 text-[#526057] sm:text-[17px]">
          <p>Plan today. Protect tomorrow.</p>
          <p>Give your loved ones peace of mind.</p>
        </div>
      </div>
    </header>
  );
}

function WillsMenuCard({ item }: { item: WillsMenuItem }) {
  return (
    <Link
      href={item.href}
      aria-label={`${item.title}: ${item.description}`}
      className={menuCardClass}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[17px] bg-[#dde6d8] text-[#20352a] transition-colors group-hover:bg-[#d3dfcf]">
        <UiIcon name={item.icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold tracking-[-0.01em] text-[#20352a] sm:text-[17px]">
          {item.title}
        </span>
        <span className="mt-1 block text-[13px] leading-5 text-[#667068] sm:text-[14px]">
          {item.description}
        </span>
      </span>
      <UiIcon
        name="chevron-right"
        className="h-5 w-5 shrink-0 text-[#6f786f] transition-transform duration-200 motion-reduce:transition-none group-hover:translate-x-0.5"
      />
    </Link>
  );
}

export function WillsLandingPage() {
  return (
    <div className="mx-auto w-full max-w-[760px] pb-6">
      <WillsPageHeader />

      <section
        aria-labelledby="wills-menu-heading"
        className="mt-5 space-y-3 sm:mt-6 sm:space-y-4"
      >
        <h2 id="wills-menu-heading" className="sr-only">
          Wills and wishes sections
        </h2>
        {willsMenuItems.map((item) => (
          <WillsMenuCard key={item.href} item={item} />
        ))}
      </section>

      <aside className="mt-5 rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068] sm:px-5">
        DiaryDock helps you organise and securely store your information. It
        does not provide legal advice or replace advice from a qualified
        solicitor.
      </aside>
    </div>
  );
}
