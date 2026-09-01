"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { DesktopDashboard } from "@/components/DesktopDashboard";
import { EstateDashboard } from "@/components/EstateDashboard";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { getOnboardingProgress } from "@/lib/diarydock-data";
import { readinessScore } from "@/lib/mock-data";

export function DashboardHome() {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const [greeting, setGreeting] = useState("Welcome");
  const [guardianCount, setGuardianCount] = useState(0);

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

  useEffect(() => {
    let active = true;
    void fetch("/api/guardian", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json() as { findings?: unknown[] };
        if (active) setGuardianCount(payload.findings?.length ?? 0);
      })
      .catch(() => undefined);
    return () => { active = false; };
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
      : null,
    guardianCount > 0
      ? {
          href: "/guardian",
          icon: "shield" as const,
          title: "Guardian",
          detail: `${guardianCount} to check`,
          tone: "bg-[#e8efe5] text-[#52705a]"
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
        <section className="relative h-[100svh] overflow-hidden lg:hidden">
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
        </section>
        <DesktopDashboard greeting={greeting} guardianCount={guardianCount} />
      </div>
      <BottomNav />
    </>
  );
}
