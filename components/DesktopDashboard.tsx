"use client";

import Image from "next/image";
import Link from "next/link";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { isDashboardAreaVisible } from "@/lib/dashboard-areas";
import { estateAreas } from "@/lib/mock-data";
import { calculateOrganisationScore } from "@/lib/organisation-score";

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

const portalLabels: Record<string, { title: string; eyebrow: string }> = {
  kitchen: { title: "Home", eyebrow: "Food, plans & household" },
  "family-room": { title: "People", eyebrow: "Family & shared life" },
  office: { title: "Documents", eyebrow: "Important records" },
  driveway: { title: "Plans", eyebrow: "Trips & preparation" }
};

export function DesktopDashboard({ greeting, guardianCount }: { greeting: string; guardianCount: number }) {
  const { state, hydrated } = useDiaryDockData();
  const firstName = state.settingsProfile.name.trim().split(/\s+/)[0] || "there";
  const visibleAreas = estateAreas.filter((area) => isDashboardAreaVisible(area.id, state.onboarding));
  const preferredPortalIds = ["kitchen", "family-room", "office", "driveway"];
  const secondaryIds = new Set(["garden", "garage"]);
  const portalCandidates = [
    ...preferredPortalIds.map((id) => visibleAreas.find((area) => area.id === id)),
    ...visibleAreas.filter((area) => !preferredPortalIds.includes(area.id) && !secondaryIds.has(area.id))
  ].filter((area): area is (typeof visibleAreas)[number] => Boolean(area));
  const featuredAreas = [...new Map(portalCandidates.map((area) => [area.id, area])).values()].slice(0, 4);
  const featuredIds = new Set(featuredAreas.map((area) => area.id));
  const secondaryAreas = ["garden", "garage"]
    .map((id) => visibleAreas.find((area) => area.id === id))
    .filter((area): area is (typeof visibleAreas)[number] => area !== undefined)
    .filter((area) => !featuredIds.has(area.id));
  const secondaryAreaIds = new Set(secondaryAreas.map((area) => area.id));
  const remainingAreas = visibleAreas.filter((area) => !featuredIds.has(area.id) && !secondaryAreaIds.has(area.id));
  const reviewDocuments = state.vaultDocuments.filter((document) => document.reviewStatus === "needs-review");
  const activeReminders = state.reminders.filter((reminder) => reminder.group !== "done");
  const latestDocument = state.vaultDocuments.at(-1);
  const nextReminder = activeReminders[0];
  const organisationScore = calculateOrganisationScore(state);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());

  return (
    <main className="hidden h-[100svh] overflow-y-auto bg-[#f3f0e7] text-[#20352a] lg:block">
      <div className="relative min-h-full overflow-hidden bg-[radial-gradient(circle_at_50%_-15%,rgba(255,255,255,0.95),transparent_35%),linear-gradient(115deg,rgba(207,196,167,0.12),transparent_32%,rgba(111,142,114,0.08))]">
        <header className="relative z-10 flex min-h-[86px] items-center justify-between border-b border-[#345143]/10 bg-[#fffdf8]/80 px-8 backdrop-blur-xl xl:px-12">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-4">
            <Image src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-[14px] shadow-sm" priority />
            <span>
              <span className="block font-serif text-[27px] leading-none">DiaryDock</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.25em] text-[#789078]">Your digital home</span>
            </span>
          </Link>

          <nav aria-label="Desktop navigation" className="flex items-center gap-1 rounded-full border border-[#345143]/10 bg-white/65 p-1.5 shadow-sm">
            <Link href="/dashboard" aria-current="page" className="rounded-full bg-[#e5ecdf] px-4 py-2 text-xs font-bold text-[#315443]">Home</Link>
            <Link href="/files" className="rounded-full px-4 py-2 text-xs font-semibold text-[#667068] transition hover:bg-white hover:text-[#20352a]">Files</Link>
            <Link href="/reminders" className="rounded-full px-4 py-2 text-xs font-semibold text-[#667068] transition hover:bg-white hover:text-[#20352a]">Reminders</Link>
            <Link href="/intake" className="rounded-full px-4 py-2 text-xs font-semibold text-[#667068] transition hover:bg-white hover:text-[#20352a]">Inbox</Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href="/search" aria-label="Search DiaryDock" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#345143]/10 bg-white/75 text-[#54705e] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
              <UiIcon name="search" className="h-[18px] w-[18px]" />
            </Link>
            <Link href="/capture" className="flex min-h-11 items-center gap-2 rounded-full bg-[#315443] px-5 text-xs font-bold text-white shadow-[0_16px_30px_-18px_rgba(32,53,42,0.8)] transition hover:bg-[#20352a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2">
              <UiIcon name="plus" className="h-[17px] w-[17px]" /> Add or scan
            </Link>
            <Link href="/settings" aria-label="Open settings" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#b89a5c]/35 bg-[#f1e9d6] text-xs font-bold text-[#315443] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
              {state.settingsProfile.initials || firstName.slice(0, 2).toUpperCase()}
            </Link>
          </div>
        </header>

        <div className="relative z-[1] mx-auto max-w-[1540px] px-8 pb-10 pt-7 xl:px-12">
          <section className="text-center" aria-labelledby="desktop-greeting">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#789078]">{dateLabel}</p>
            <h1 id="desktop-greeting" className="mt-1.5 font-serif text-[clamp(34px,3vw,48px)] leading-tight">{greeting}, {firstName}</h1>
            <div className="mx-auto mt-3 flex w-36 items-center gap-3 text-[#b89a5c]" aria-hidden="true">
              <span className="h-px flex-1 bg-current/60" /><span className="text-sm">◆</span><span className="h-px flex-1 bg-current/60" />
            </div>
            <Link href="/life-check" className="mx-auto mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-[#345143]/10 bg-white/65 px-4 text-[11px] font-semibold text-[#54705e] shadow-sm transition hover:bg-white"><UiIcon name="chart" className="h-3.5 w-3.5" />{organisationScore.score}% organised · Life Check</Link>
          </section>

          <section aria-label="Your main DiaryDock spaces" className="mx-auto mt-5 grid max-w-[1430px] grid-cols-4 items-center gap-4 xl:grid-cols-[150px_repeat(4,minmax(0,1fr))_150px] xl:gap-5">
            {secondaryAreas[0] ? <SecondarySpace area={secondaryAreas[0]} side="left" /> : <span className="hidden xl:block" />}

            {featuredAreas.map((area) => {
              const label = portalLabels[area.id] || { title: area.dashboardLabel || area.name, eyebrow: area.domain };
              const documentCount = state.vaultDocuments.filter((document) => document.roomId === area.id).length;
              return (
                <Link key={area.id} href={area.href} className="group relative min-h-[310px] overflow-hidden rounded-b-[26px] rounded-t-[999px] border border-[#b89a5c]/45 bg-[#20352a] shadow-[0_28px_60px_-34px_rgba(32,53,42,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-4 xl:min-h-[370px]">
                  <Image src={areaImages[area.id]} alt="" fill sizes="(min-width: 1280px) 20vw, 24vw" className="object-cover transition duration-700 group-hover:scale-[1.035]" />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#12231c]/95 via-[#20352a]/20 to-white/5" />
                  <span className="absolute inset-x-0 bottom-0 p-5 text-center text-white xl:p-6">
                    <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-[#e7d7ae]">{label.eyebrow}</span>
                    <span className="mt-1 block font-serif text-[27px] leading-tight xl:text-[31px]">{label.title}</span>
                    <span className="mx-auto mt-2 flex w-fit items-center gap-1.5 text-[10px] font-semibold text-white/75">
                      {hydrated && documentCount > 0 ? `${documentCount} saved ${documentCount === 1 ? "item" : "items"}` : "Open space"}
                      <UiIcon name="chevron-right" className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>
              );
            })}

            {secondaryAreas[1] ? <SecondarySpace area={secondaryAreas[1]} side="right" /> : <span className="hidden xl:block" />}
          </section>

          {secondaryAreas.length ? (
            <div className="mx-auto mt-4 flex max-w-[1100px] justify-center gap-3 xl:hidden">
              {secondaryAreas.map((area) => <SpaceChip key={area.id} area={area} />)}
            </div>
          ) : null}

          <section aria-label="DiaryDock activity" className="mx-auto mt-6 grid max-w-[1430px] grid-cols-4 divide-x divide-[#345143]/10 overflow-hidden rounded-[24px] border border-[#b89a5c]/30 bg-[#fffdf8]/90 shadow-[0_24px_55px_-42px_rgba(32,53,42,0.65)] backdrop-blur-lg">
            <ActivityItem icon="file" title="Recent file" href="/files" primary={latestDocument?.title || "No files yet"} secondary={latestDocument ? [latestDocument.kind, latestDocument.updated].filter(Boolean).join(" · ") : "Your saved documents will appear here."} />
            <ActivityItem icon="calendar" title="Next reminder" href="/reminders" primary={nextReminder?.title || "Nothing coming up"} secondary={nextReminder ? [nextReminder.timeLabel, nextReminder.roomName].filter(Boolean).join(" · ") : "Your reminder list is clear."} />
            <ActivityItem icon="alert" title="Review items" href="/review-inbox" primary={reviewDocuments.length ? `${reviewDocuments.length} ${reviewDocuments.length === 1 ? "item" : "items"} to check` : "Nothing waiting"} secondary="Check captured details before filing." />
            <ActivityItem icon="shield" title="Guardian" href="/guardian" primary={guardianCount ? `${guardianCount} ${guardianCount === 1 ? "thing needs" : "things need"} attention` : "Everything looks settled"} secondary="A calm check of your saved dates." />
          </section>

          {remainingAreas.length ? (
            <section aria-label="More DiaryDock spaces" className="mx-auto mt-5 flex max-w-[1100px] flex-wrap items-center justify-center gap-2.5">
              <span className="mr-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#789078]">More spaces</span>
              {remainingAreas.map((area) => <SpaceChip key={area.id} area={area} />)}
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function SecondarySpace({ area, side }: { area: (typeof estateAreas)[number]; side: "left" | "right" }) {
  return (
    <Link href={area.href} className={`group hidden flex-col items-center xl:flex ${side === "left" ? "-rotate-2" : "rotate-2"}`}>
      <span className="relative h-[142px] w-[142px] overflow-hidden rounded-full border-2 border-[#b89a5c]/50 bg-[#20352a] p-2 shadow-[0_22px_44px_-26px_rgba(32,53,42,0.85)] transition group-hover:-translate-y-1">
        <Image src={areaImages[area.id]} alt="" fill sizes="142px" className="object-cover" />
        <span className="absolute inset-0 bg-[#20352a]/18" />
      </span>
      <span className="-mt-3 rounded-full border border-[#b89a5c]/40 bg-[#fffdf8] px-5 py-2 text-center font-serif text-lg shadow-sm">{area.dashboardLabel || area.name}</span>
    </Link>
  );
}

function SpaceChip({ area }: { area: (typeof estateAreas)[number] }) {
  return (
    <Link href={area.href} className="flex min-h-10 items-center gap-2 rounded-full border border-[#345143]/10 bg-[#fffdf8]/85 px-4 text-xs font-bold text-[#315443] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
      <UiIcon name={area.icon} className="h-4 w-4 text-[#789078]" /> {area.dashboardLabel || area.name}
    </Link>
  );
}

function ActivityItem({ icon, title, href, primary, secondary }: { icon: "file" | "calendar" | "alert" | "shield"; title: string; href: string; primary: string; secondary: string }) {
  return (
    <Link href={href} className="group flex min-h-[118px] items-center gap-4 px-5 py-4 transition hover:bg-[#f7f5ed] xl:px-7">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e5ecdf] text-[#54705e]"><UiIcon name={icon} className="h-[19px] w-[19px]" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#789078]">{title}</span>
        <span className="mt-1 block truncate text-sm font-bold text-[#20352a]">{primary}</span>
        <span className="mt-1 block truncate text-[11px] text-[#667068]">{secondary}</span>
      </span>
      <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-[#8e968f] transition group-hover:translate-x-1" />
    </Link>
  );
}
