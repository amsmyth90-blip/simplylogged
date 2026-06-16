"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

type InternalPageShellProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  action?: ReactNode;
  backHref?: string;
};

export function InternalPageShell({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  children,
  action,
  backHref = "/dashboard",
}: InternalPageShellProps) {
  return (
    <main className="min-h-svh bg-[#f6efe5] text-[#241a12]">
      <div className="mx-auto flex min-h-svh max-w-md flex-col px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="rounded-[1.75rem] bg-white/88 p-4 shadow-[0_18px_45px_rgba(64,45,26,0.10)] ring-1 ring-white/70 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              aria-label="Back to estate"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f7f0e7] text-stone-800 shadow-inner shadow-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f4e5cf] text-violet-700 ring-1 ring-amber-100">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                {eyebrow}
              </p>
              <h1 className="truncate text-2xl font-black tracking-normal">{title}</h1>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-600">{subtitle}</p>
        </header>

        <div className="mt-4 space-y-4">{children}</div>
      </div>
      <BottomNav />
    </main>
  );
}

export function EstateCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.5rem] bg-white p-4 shadow-[0_14px_34px_rgba(64,45,26,0.08)] ring-1 ring-stone-100 ${className}`}
    >
      {children}
    </section>
  );
}
