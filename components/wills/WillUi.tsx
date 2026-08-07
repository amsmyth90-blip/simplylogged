import Link from "next/link";
import type { ReactNode } from "react";

import { UiIcon, type IconName } from "@/components/UiIcon";

export function WillPageHeader({
  title,
  subtitle,
  backHref = "/wills"
}: {
  title: string;
  subtitle: string;
  backHref?: string;
}) {
  return (
    <header className="relative overflow-hidden rounded-[28px] border border-[#20352a]/[0.07] bg-[#f5f4ed] px-5 pb-7 pt-5 shadow-[0_18px_42px_-32px_rgba(32,53,42,0.38)] sm:px-7 sm:pb-8">
      <img
        src="/images/wills-botanical-leaves.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-9 -top-16 h-56 w-56 opacity-40"
      />
      <div className="relative z-10 flex items-center justify-between">
        <Link
          href={backHref}
          aria-label="Go back"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#20352a]/10 bg-white/80 text-[#20352a] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none"
        >
          <UiIcon name="arrow-left" className="h-5 w-5" />
        </Link>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#20352a]/10 bg-white/70 text-[#52705a]" aria-label="Private area">
          <UiIcon name="shield" className="h-5 w-5" />
        </span>
      </div>
      <div className="relative z-10 mt-8 max-w-[31rem]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6f8e72]">Wills & letters of wishes</p>
        <h1 className="mt-2 font-serif text-[38px] font-normal leading-[1.02] tracking-[-0.035em] text-[#20352a] sm:text-[44px]">{title}</h1>
        <p className="mt-3 text-[14px] leading-6 text-[#5f6b63]">{subtitle}</p>
      </div>
    </header>
  );
}
export function WillCard({
  children,
  className = "",
  as: Element = "section"
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  return (
    <Element className={`rounded-[22px] border border-[#20352a]/[0.07] bg-[#fffdf8] p-5 shadow-[0_16px_38px_-30px_rgba(32,53,42,0.5)] ${className}`}>
      {children}
    </Element>
  );
}

export function WillSectionHeading({ icon, title, description }: { icon: IconName; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#dde6d8] text-[#45604d]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-[#20352a]">{title}</h2>
        {description ? <p className="mt-1 text-[13px] leading-5 text-[#667068]">{description}</p> : null}
      </div>
    </div>
  );
}

export function WillActionLink({ href, icon, title, detail }: { href: string; icon: IconName; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="group flex min-h-[78px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#6f8e72]/25 hover:shadow-[0_14px_28px_-24px_rgba(32,53,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#52705a]">
        <UiIcon name={icon} className="h-[19px] w-[19px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#20352a]">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-4 text-[#667068]">{detail}</span>
      </span>
      <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-[#6f8e72] transition group-hover:translate-x-0.5 motion-reduce:transform-none" />
    </Link>
  );
}

export function WillLegalNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock helps you organise and securely store your information. It does not provide legal advice or replace advice from a qualified solicitor.
    </p>
  );
}

export function formatWillDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
