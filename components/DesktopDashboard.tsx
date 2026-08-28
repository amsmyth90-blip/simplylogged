"use client";

import Image from "next/image";
import Link from "next/link";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { isDashboardAreaVisible } from "@/lib/dashboard-areas";
import { estateAreas } from "@/lib/mock-data";

const areaImages: Record<string, string> = {
  attic: "/images/pages/attic-memory-room-v1.webp",
  bedroom: "/images/pages/bedroom-health-room-clean.webp",
  office: "/images/office-interactive-v1.webp",
  "family-room": "/images/family-fireside-clean.webp",
  kitchen: "/images/kitchen-command-centre.webp",
  garage: "/images/pages/garage-folio-hero-v5.webp",
  mailbox: "/images/pages/mailbox-hero.webp",
  garden: "/images/pages/garden-command-centre-v2.webp",
  driveway: "/images/designs/driveway/08-car-boot-departure.webp",
  "front-gate": "/images/pages/settings-hero.webp"
};

function PanelHeading({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-serif text-[22px] text-[#20352a]">{title}</h2>
      <Link href={href} className="text-xs font-semibold text-[#54705e] transition hover:text-[#20352a]">
        {linkLabel}
      </Link>
    </div>
  );
}

export function DesktopDashboard({ greeting }: { greeting: string }) {
  const { state, household, hydrated } = useDiaryDockData();
  const firstName = state.settingsProfile.name.trim().split(/\s+/)[0] || "there";
  const visibleAreas = estateAreas.filter((area) => isDashboardAreaVisible(area.id, state.onboarding));
  const reviewDocuments = state.vaultDocuments.filter((document) => document.reviewStatus === "needs-review");
  const activeReminders = state.reminders.filter((reminder) => reminder.group !== "done");
  const recentDocuments = [...state.vaultDocuments].reverse().slice(0, 5);
  const newMailCount = state.mailboxItems.filter((item) => item.routeStatus === "new").length;
  const householdName = household?.householdName || "Your DiaryDock";
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());

  const summaryItems = [
    { label: "Documents", value: state.vaultDocuments.length, icon: "folder" as const, href: "/files" },
    { label: "To review", value: reviewDocuments.length, icon: "alert" as const, href: "/review-inbox" },
    { label: "Reminders", value: activeReminders.length, icon: "calendar" as const, href: "/reminders" },
    { label: "New inbox", value: newMailCount, icon: "mail" as const, href: "/intake" }
  ];

  return (
    <main className="hidden h-[100svh] overflow-y-auto bg-[#f5f4ed] lg:block">
      <div className="mx-auto min-h-full max-w-[1540px] px-8 py-7 xl:px-10 xl:py-9">
        <header className="flex items-start justify-between gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">{dateLabel}</p>
            <h1 className="mt-2 font-serif text-[38px] leading-tight text-[#20352a]">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 text-sm text-[#667068]">Everything important, organised in one calm place.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="flex min-h-11 min-w-[220px] items-center gap-3 rounded-2xl border border-[#20352a]/10 bg-white/80 px-4 text-sm text-[#667068] shadow-sm transition hover:bg-white"
            >
              <UiIcon name="search" className="h-[18px] w-[18px]" />
              Search DiaryDock
            </Link>
            <Link
              href="/capture"
              className="flex min-h-11 items-center gap-2 rounded-2xl bg-[#315443] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(32,53,42,0.7)] transition hover:bg-[#20352a]"
            >
              <UiIcon name="plus" className="h-[18px] w-[18px]" />
              Add or scan
            </Link>
          </div>
        </header>

        <section aria-label="DiaryDock summary" className="mt-7 grid grid-cols-4 gap-3">
          {summaryItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group flex min-h-[92px] items-center gap-4 rounded-[22px] border border-[#20352a]/[0.08] bg-[#fffdf8] px-5 shadow-[0_18px_38px_-30px_rgba(32,53,42,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-28px_rgba(32,53,42,0.5)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8efe3] text-[#54705e]">
                <UiIcon name={item.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-2xl font-semibold text-[#20352a]">{hydrated ? item.value : "–"}</span>
                <span className="block text-xs font-medium text-[#667068]">{item.label}</span>
              </span>
              <UiIcon name="chevron-right" className="ml-auto h-4 w-4 text-[#879188] transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </section>

        <div className="mt-7 grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
          <section className="min-w-0">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">{householdName}</p>
                <h2 className="mt-1 font-serif text-[28px] text-[#20352a]">Your spaces</h2>
              </div>
              <Link href="/settings" className="mb-1 text-xs font-semibold text-[#54705e] hover:text-[#20352a]">
                Manage spaces
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-3">
              {visibleAreas.map((area) => (
                <Link
                  key={area.id}
                  href={area.href}
                  className="group relative min-h-[190px] overflow-hidden rounded-[24px] border border-white/80 bg-[#20352a] shadow-[0_24px_55px_-34px_rgba(32,53,42,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
                >
                  <Image
                    src={areaImages[area.id]}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 24vw, 34vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.035]"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#15241d]/95 via-[#20352a]/25 to-black/5" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-5 text-white">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md">
                      <UiIcon name={area.icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold">{area.dashboardLabel || area.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-white/70">{area.domain}</span>
                    </span>
                    <UiIcon name="chevron-right" className="mb-1 h-4 w-4 text-white/75 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>

            <section className="mt-6 rounded-[26px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-5 shadow-[0_22px_46px_-36px_rgba(32,53,42,0.48)]">
              <PanelHeading title="Recent documents" href="/files" linkLabel="View all files" />
              <div className="mt-3 divide-y divide-[#20352a]/[0.07]">
                {recentDocuments.length ? recentDocuments.map((document) => (
                  <Link key={document.id} href={`/document/${document.id}`} className="group flex min-h-[64px] items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf1e8] text-[#54705e]">
                      <UiIcon name="file" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#20352a]">{document.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-[#667068]">
                        {[document.roomName || document.category, document.kind, document.updated].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {document.reviewStatus === "needs-review" ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800">Check details</span>
                    ) : null}
                    <UiIcon name="chevron-right" className="h-4 w-4 text-[#879188] transition group-hover:translate-x-0.5" />
                  </Link>
                )) : (
                  <div className="flex min-h-[112px] items-center gap-4 py-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf1e8] text-[#54705e]"><UiIcon name="folder" className="h-5 w-5" /></span>
                    <div><p className="text-sm font-semibold text-[#20352a]">No documents yet</p><p className="mt-1 text-xs text-[#667068]">Add or scan your first file when you are ready.</p></div>
                  </div>
                )}
              </div>
            </section>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[26px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-5 shadow-[0_22px_46px_-36px_rgba(32,53,42,0.48)]">
              <PanelHeading title="Review inbox" href="/review-inbox" linkLabel="Open inbox" />
              <div className="mt-4 space-y-2">
                {reviewDocuments.length ? reviewDocuments.slice(0, 3).map((document) => (
                  <Link key={document.id} href={`/document/${document.id}`} className="flex items-center gap-3 rounded-2xl bg-[#f7f5ee] p-3 transition hover:bg-[#f0eee5]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><UiIcon name="alert" className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#20352a]">{document.title}</span><span className="mt-0.5 block text-[11px] text-[#667068]">Please check the captured details</span></span>
                    <UiIcon name="chevron-right" className="h-4 w-4 text-[#879188]" />
                  </Link>
                )) : (
                  <div className="rounded-2xl bg-[#edf1e8] p-4"><p className="text-sm font-semibold text-[#315443]">Nothing waiting</p><p className="mt-1 text-xs leading-5 text-[#667068]">New captures that need checking will appear here.</p></div>
                )}
              </div>
            </section>

            <section className="rounded-[26px] border border-[#20352a]/[0.08] bg-[#fffdf8] p-5 shadow-[0_22px_46px_-36px_rgba(32,53,42,0.48)]">
              <PanelHeading title="Coming up" href="/reminders" linkLabel="All reminders" />
              <div className="mt-4 space-y-2">
                {activeReminders.length ? activeReminders.slice(0, 4).map((reminder) => (
                  <Link key={reminder.id} href="/reminders" className="flex gap-3 rounded-2xl border border-[#20352a]/[0.06] p-3 transition hover:bg-[#f7f5ee]">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${reminder.priority === "high" ? "bg-orange-500" : reminder.priority === "normal" ? "bg-[#6f8e72]" : "bg-slate-300"}`} />
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#20352a]">{reminder.title}</span><span className="mt-1 block text-[11px] text-[#667068]">{reminder.timeLabel}{reminder.roomName ? ` · ${reminder.roomName}` : ""}</span></span>
                  </Link>
                )) : (
                  <div className="rounded-2xl bg-[#f7f5ee] p-4"><p className="text-sm font-semibold text-[#315443]">Your list is clear</p><p className="mt-1 text-xs leading-5 text-[#667068]">Reminders and important dates will appear here.</p></div>
                )}
              </div>
              <Link href="/reminders" className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#315443]/20 text-xs font-semibold text-[#315443] transition hover:bg-[#edf1e8]">
                <UiIcon name="plus" className="h-4 w-4" /> Add reminder
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
