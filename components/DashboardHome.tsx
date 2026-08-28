"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { EstateDashboard } from "@/components/EstateDashboard";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { getOnboardingProgress } from "@/lib/diarydock-data";
import { readinessScore } from "@/lib/mock-data";

export function DashboardHome() {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const updateGreeting = () => {
      const hour = new Date().getHours();
      setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
    };
    updateGreeting();
    const greetingTimer = window.setInterval(updateGreeting, 60_000);

    return () => {
      window.clearInterval(greetingTimer);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const { state } = useDiaryDockData();
  const reviewCount = state.vaultDocuments.filter((document) => document.reviewStatus === "needs-review").length;
  const activeReminderCount = state.reminders.filter((reminder) => reminder.group === "today" || reminder.group === "week").length;
  const onboardingProgress = getOnboardingProgress(state.onboarding);
  const showSetupNudge = !state.onboarding.completed;
  const firstName = state.settingsProfile.name.trim().split(/\s+/)[0] ?? "";
  const todayItems = [
    showSetupNudge
      ? {
          href: "/onboarding",
          icon: "home" as const,
          title: "Setup",
          detail: `${onboardingProgress.completed}/${onboardingProgress.total} done`,
          tone: "bg-sage/70 text-moss"
        }
      : null,
    reviewCount > 0
      ? {
          href: "/review-inbox",
          icon: "alert" as const,
          title: "Review",
          detail: `${reviewCount} capture${reviewCount === 1 ? "" : "s"}`,
          tone: "bg-amber-100 text-amber-700"
        }
      : null,
    activeReminderCount > 0
      ? {
          href: "/reminders",
          icon: "calendar" as const,
          title: "Today",
          detail: `${activeReminderCount} action${activeReminderCount === 1 ? "" : "s"}`,
          tone: "bg-mist text-sky-700"
        }
      : null
  ].filter(Boolean);

  return (
    <>
      <div
        className="fixed inset-0 overflow-hidden overscroll-none"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const distance = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
          touchStartX.current = null;
          if (distance < -72) router.push("/room/kitchen");
        }}
      >
        <section className="relative h-[100svh] overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 sm:px-6 lg:hidden"
            style={{ paddingTop: "max(30px, calc(env(safe-area-inset-top, 0px) + 12px))" }}
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
              <div className="min-w-0 rounded-full border border-white/40 bg-white/45 px-3.5 py-2 shadow-[0_18px_30px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl">
                <p className="truncate text-[14px] font-semibold tracking-tight text-slate-900">
                  {firstName ? `${greeting}, ${firstName}` : greeting}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href="/search"
                  className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/45 text-slate-700 shadow-[0_18px_30px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl transition hover:bg-white/80"
                  aria-label="Search DiaryDock"
                >
                  <UiIcon name="search" className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/emergency"
                  className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/45 text-red-500 shadow-[0_18px_30px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl transition hover:bg-white/80"
                  aria-label="Emergency panel"
                >
                  <UiIcon name="phone" className="h-3.5 w-3.5" />
                </Link>
                <div className="pointer-events-auto rounded-full border border-white/40 bg-white/45 px-2.5 py-1.5 shadow-[0_18px_30px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-lime-500" />
                    <span className="hidden text-[11px] font-semibold text-slate-600 min-[380px]:inline">Ready</span>
                    <span className="text-[12px] font-semibold tracking-tight text-slate-900">
                      {readinessScore.score}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {todayItems.length ? (
            <div
              className="absolute inset-x-0 z-20 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:px-6 lg:hidden"
              style={{ top: "max(76px, calc(env(safe-area-inset-top, 0px) + 58px))" }}
            >
              <div className="mx-auto flex max-w-6xl gap-2">
                {todayItems.map((item) =>
                  item ? (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex min-w-[124px] items-center gap-2 rounded-full border border-white/42 bg-white/48 px-2.5 py-2 text-slate-900 shadow-[0_18px_30px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl transition hover:bg-white/75"
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.tone}`}>
                        <UiIcon name={item.icon} className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold leading-tight">{item.title}</span>
                        <span className="block truncate text-[10px] font-medium text-slate-500">{item.detail}</span>
                      </span>
                    </Link>
                  ) : null
                )}
              </div>
            </div>
          ) : null}
          <EstateDashboard />
          <aside className="absolute bottom-7 right-7 top-7 z-30 hidden w-[19rem] overflow-y-auto rounded-[30px] border border-white/75 bg-[#fffdf8]/[0.92] p-5 shadow-[0_30px_80px_-36px_rgba(32,53,42,0.48)] backdrop-blur-2xl lg:block xl:w-[21rem]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6f8e72]">Your digital home</p>
                <h1 className="mt-2 font-serif text-[30px] leading-tight text-[#20352a]">
                  {firstName ? `${greeting}, ${firstName}` : greeting}
                </h1>
              </div>
              <div className="rounded-2xl bg-[#e8efe3] px-3 py-2 text-center">
                <span className="block text-lg font-bold text-[#315443]">{readinessScore.score}%</span>
                <span className="block text-[9px] font-semibold uppercase tracking-wide text-[#667068]">Ready</span>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {todayItems.length ? todayItems.map((item) => item ? (
                <Link key={item.href} href={item.href} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#20352a]/8 bg-white/75 p-3 transition hover:-translate-y-0.5 hover:bg-white">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
                    <UiIcon name={item.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#20352a]">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-[#667068]">{item.detail}</span>
                  </span>
                  <UiIcon name="chevron-right" className="h-4 w-4 text-[#667068]" />
                </Link>
              ) : null) : (
                <div className="rounded-2xl bg-[#e8efe3]/70 p-4">
                  <p className="text-sm font-semibold text-[#315443]">Everything looks calm</p>
                  <p className="mt-1 text-xs leading-5 text-[#667068]">No urgent reviews or reminders need your attention.</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#667068]">Quick actions</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href="/capture" className="rounded-2xl bg-[#315443] p-3 text-white transition hover:bg-[#20352a]">
                  <UiIcon name="plus" className="h-5 w-5" />
                  <span className="mt-3 block text-sm font-semibold">Add or scan</span>
                  <span className="mt-1 block text-[10px] text-white/65">Save something new</span>
                </Link>
                <Link href="/search" className="rounded-2xl bg-[#edf1e8] p-3 text-[#315443] transition hover:bg-[#e3eadf]">
                  <UiIcon name="search" className="h-5 w-5" />
                  <span className="mt-3 block text-sm font-semibold">Find anything</span>
                  <span className="mt-1 block text-[10px] text-[#667068]">Search DiaryDock</span>
                </Link>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#20352a]/8 bg-white/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#20352a]">Explore your home</p>
                  <p className="mt-1 text-xs leading-5 text-[#667068]">Select any room in the house to open its records and tools.</p>
                </div>
                <UiIcon name="home" className="h-6 w-6 shrink-0 text-[#6f8e72]" />
              </div>
            </div>
          </aside>
        </section>
      </div>
      <BottomNav />
    </>
  );
}
