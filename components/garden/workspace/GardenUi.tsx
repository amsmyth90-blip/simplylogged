import Link from "next/link";
import type { ReactNode } from "react";

import { UiIcon, type IconName } from "@/components/UiIcon";

export function GardenPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[24px] border border-[#20352a]/[0.07] bg-[#fffdf8] p-4 shadow-[0_24px_48px_-42px_rgba(32,53,42,0.72)] sm:p-5 ${className}`}
    >
      {children}
    </section>
  );
}

export function GardenEmptyPreview({
  icon,
  title,
  detail,
  href,
  action,
}: {
  icon: IconName;
  title: string;
  detail: string;
  href: string;
  action: string;
}) {
  return (
    <div className="mt-4 flex min-h-[92px] items-center gap-3 rounded-[18px] border border-dashed border-[#6f8e72]/25 bg-[#faf9f4] p-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e8eee3] text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#20352a]">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p>
      </div>
      <Link
        href={href}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-white px-3 text-[10px] font-semibold text-[#52705a] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
      >
        {action}
      </Link>
    </div>
  );
}
