import Link from "next/link";
import type { ReactNode } from "react";

import { UiIcon, type IconName } from "@/components/UiIcon";

import type { BedroomSection } from "./health-home-model";

export function SectionCard({
  section,
  count,
}: {
  section: BedroomSection;
  count: number;
}) {
  const tone =
    section.tone === "lavender"
      ? "bg-[#efebf3] text-[#665c72]"
      : section.tone === "blush"
        ? "bg-[#f4e9e5] text-[#765f58]"
        : "bg-[#e8eee3] text-[#48604e]";
  return (
    <Link
      href={section.href}
      className="group flex min-h-[96px] items-center gap-3 rounded-[22px] border border-[#20352a]/[0.07] bg-white/92 p-4 shadow-[0_16px_36px_-30px_rgba(32,53,42,0.55)] transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] ${tone}`}
      >
        <UiIcon name={section.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#20352a]">
          {section.title}
        </span>
        <span className="mt-1 block text-[11px] leading-4 text-[#667068]">
          {section.description}
        </span>
      </span>
      {count > 0 ? (
        <span className="rounded-full bg-[#eef2e9] px-2 py-1 text-[10px] font-semibold text-[#52705a]">
          {count}
        </span>
      ) : null}
      <UiIcon
        name="chevron-right"
        className="h-4 w-4 shrink-0 text-[#7b847d] transition group-hover:translate-x-0.5 motion-reduce:transform-none"
      />
    </Link>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[24px] border border-[#20352a]/[0.07] bg-white/90 p-4 shadow-[0_18px_42px_-34px_rgba(32,53,42,0.6)] ${className}`}
    >
      {children}
    </section>
  );
}

export function PanelHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="font-serif text-xl text-[#20352a]">{title}</h2>
        {detail ? (
          <p className="mt-1 text-[11px] leading-4 text-[#667068]">{detail}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyPreview({
  icon,
  title,
  detail,
}: {
  icon: IconName;
  title: string;
  detail: string;
}) {
  return (
    <div className="mt-4 rounded-[18px] border border-dashed border-[#6f8e72]/25 bg-[#faf9f4] p-5 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#e8eee3] text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-[#20352a]">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p>
    </div>
  );
}

export function ViewAllLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="min-h-11 px-2 py-3 text-[11px] font-semibold text-[#52705a]"
    >
      {children}
    </Link>
  );
}
