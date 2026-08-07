import Link from "next/link";
import type { ReactNode } from "react";

import { UiIcon } from "@/components/UiIcon";

export function LettersLegalNotice() {
  return (
    <aside className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      Letters of Wishes are personal records and are not a substitute for a legal will. DiaryDock does not provide legal advice. Seek advice from a qualified solicitor where legal wording or estate instructions matter.
    </aside>
  );
}
export function LetterSafetyNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-[17px] border border-[#8a744d]/15 bg-[#f6f0e5] px-4 py-3.5 text-[12px] leading-5 text-[#6d624e]">
      <UiIcon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

export function LetterSubpageNav({ letterId }: { letterId: string }) {
  const items = [
    { href: `/wills/letters-of-wishes/${letterId}`, label: "Letter", icon: "mail" as const },
    { href: `/wills/letters-of-wishes/${letterId}/preview`, label: "Preview", icon: "heart" as const },
    { href: `/wills/letters-of-wishes/${letterId}/delivery`, label: "Delivery", icon: "clock" as const },
    { href: `/wills/letters-of-wishes/${letterId}/versions`, label: "Versions", icon: "archive" as const }
  ];
  return (
    <nav aria-label="Letter sections" className="grid grid-cols-4 gap-1 rounded-[18px] border border-[#20352a]/[0.07] bg-white/80 p-1.5">
      {items.map((item) => <Link key={item.href} href={item.href} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-[13px] px-1 text-[10px] font-semibold text-[#45604d] transition hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transition-none"><UiIcon name={item.icon} className="h-4 w-4" />{item.label}</Link>)}
    </nav>
  );
}
