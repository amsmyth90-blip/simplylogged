import Link from "next/link";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/BottomNav";
import { UiIcon } from "@/components/UiIcon";

export function KitchenFeatureShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative -mx-4 -mt-5 min-h-[100svh] overflow-x-hidden bg-[linear-gradient(180deg,#e6efe3_0%,#f8faf6_38%,#eef4ec_100%)] pb-28 text-slate-900 sm:-mx-6">
      <div className="relative mx-auto w-full max-w-lg px-5 pt-5">
        <header className="flex items-center gap-3">
          <Link href="/room/kitchen" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/90 bg-white/72 text-slate-700 shadow-sm backdrop-blur-xl" aria-label="Back to Kitchen">
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#66805c]">Kitchen</p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          </div>
        </header>
        <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">{subtitle}</p>
        <main className="mt-5">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
