import Link from "next/link";
import type { ReactNode } from "react";

import { UiIcon, type IconName } from "@/components/UiIcon";

export function BillsShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      {children}
    </div>
  );
}

export function BillsHeader({
  title,
  subtitle,
  backHref = "/room/office",
}: {
  title: string;
  subtitle: string;
  backHref?: string;
}) {
  return (
    <header className="relative overflow-hidden rounded-[28px] border border-[#20352a]/[0.07] bg-[#f5f4ed] px-5 pb-7 pt-5 shadow-[0_18px_42px_-32px_rgba(32,53,42,0.38)] sm:px-7">
      <img
        src="/images/wills-botanical-leaves.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 opacity-35"
      />
      <div className="relative z-10 flex items-center justify-between">
        <Link
          href={backHref}
          aria-label="Go back"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#20352a]/10 bg-white/80 text-[#20352a] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
        >
          <UiIcon name="arrow-left" className="h-5 w-5" />
        </Link>
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#20352a]/10 bg-white/70 text-[#52705a]"
          aria-label="Private household area"
        >
          <UiIcon name="lock" className="h-5 w-5" />
        </span>
      </div>
      <div className="relative z-10 mt-7 max-w-[28rem]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6f8e72]">
          Office room
        </p>
        <h1 className="mt-2 font-serif text-[40px] font-normal leading-none tracking-[-0.035em] text-[#20352a]">
          {title}
        </h1>
        <p className="mt-3 max-w-sm text-[14px] leading-6 text-[#5f6b63]">
          {subtitle}
        </p>
        {title === "Insurance Hub" ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/office/insurance/home"
              className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
            >
              <UiIcon name="home" className="h-4 w-4" />
              Home Insurance
            </Link>
            <Link
              href="/office/insurance/life"
              className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/30 bg-white/80 px-4 text-sm font-semibold text-[#45604d] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
            >
              <UiIcon name="heart" className="h-4 w-4" />
              Life Insurance
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function BillsCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const darkOverview = className.includes("bg-[#355540]");
  return (
    <section
      style={darkOverview ? { backgroundColor: "#355540" } : undefined}
      className={`rounded-[22px] border border-[#20352a]/[0.07] bg-[#fffdf8] p-5 shadow-[0_16px_38px_-30px_rgba(32,53,42,0.5)] ${className}`}
    >
      {children}
    </section>
  );
}

export function BillsSectionTitle({
  icon,
  title,
  detail,
}: {
  icon: IconName;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#dde6d8] text-[#45604d]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-[#20352a]">
          {title}
        </h2>
        {detail ? (
          <p className="mt-1 text-[12px] leading-5 text-[#667068]">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}

export function BillsAction({
  href,
  icon,
  title,
  detail,
  badge,
}: {
  href: string;
  icon: IconName;
  title: string;
  detail: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[80px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-24px_rgba(32,53,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#20352a]">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] leading-4 text-[#667068]">
          {detail}
        </span>
      </span>
      {badge ? (
        <span className="rounded-full bg-[#f0eee5] px-2.5 py-1 text-[10px] font-semibold text-[#667068]">
          {badge}
        </span>
      ) : null}
      <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
    </Link>
  );
}

export const fieldClass =
  "mt-1.5 w-full min-h-11 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 py-2.5 text-sm font-normal text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20";

export function BillsNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock helps you organise bill information and reminders. It is not a
      bank and does not provide financial advice. Always confirm amounts, dates
      and payment instructions against the original bill.
    </p>
  );
}
