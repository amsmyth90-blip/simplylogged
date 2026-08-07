"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { gardenSections } from "@/lib/garden-sections";

const gardenDocumentTerms = ["garden", "outdoor", "pet", "vet", "vaccination", "shed", "fence", "equipment"];

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[24px] border border-[#20352a]/[0.07] bg-[#fffdf8] p-4 shadow-[0_24px_48px_-42px_rgba(32,53,42,0.72)] sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

function EmptyPreview({ icon, title, detail, href, action }: { icon: IconName; title: string; detail: string; href: string; action: string }) {
  return (
    <div className="mt-4 flex min-h-[92px] items-center gap-3 rounded-[18px] border border-dashed border-[#6f8e72]/25 bg-[#faf9f4] p-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e8eee3] text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#20352a]">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-[#667068]">{detail}</p>
      </div>
      <Link href={href} className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-white px-3 text-[10px] font-semibold text-[#52705a] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
        {action}
      </Link>
    </div>
  );
}

export function GardenWorkspace() {
  const { state, hydrated } = useLifeDockData();
  const [addOpen, setAddOpen] = useState(false);

  const gardenReminders = useMemo(
    () => state.reminders.filter((reminder) => reminder.roomId === "garden" && reminder.group !== "done"),
    [state.reminders],
  );
  const gardenDocuments = useMemo(
    () =>
      state.vaultDocuments.filter((document) => {
        if (document.roomId === "garden") return true;
        const searchable = `${document.category} ${document.title}`.toLowerCase();
        return gardenDocumentTerms.some((term) => searchable.includes(term));
      }),
    [state.vaultDocuments],
  );
  const reviewDocuments = gardenDocuments.filter((document) => document.reviewStatus === "needs-review");
  const attentionItems = [
    ...gardenReminders.slice(0, 3).map((reminder) => ({
      id: `reminder-${reminder.id}`,
      href: "/reminders",
      icon: "calendar" as const,
      title: reminder.title,
      detail: [reminder.timeLabel, reminder.note].filter(Boolean).join(" · "),
    })),
    ...reviewDocuments.slice(0, 3).map((document) => ({
      id: `document-${document.id}`,
      href: `/document/${document.id}?from=garden`,
      icon: "file" as const,
      title: document.title,
      detail: "Check the extracted details against the original file.",
    })),
  ].slice(0, 4);

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-[#f5f2ea] px-4 pb-32 pt-4">
        <div className="mx-auto max-w-[760px] animate-pulse space-y-4">
          <div className="h-[520px] rounded-[30px] bg-[#dfe6d8]" />
          <div className="h-48 rounded-[24px] bg-white/70" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f2ea] pb-32 text-[#20352a]">
      <div className="mx-auto max-w-[760px] px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <header className="relative min-h-[520px] overflow-hidden rounded-[30px] border border-white/80 bg-[#304534] shadow-[0_30px_70px_-42px_rgba(25,44,33,0.78)] sm:min-h-[560px]">
          <Image
            src="/images/pages/garden-command-centre-v2.webp"
            alt="A leafy Garden workspace with a cat, a dog and an open planning notebook"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 760px"
            className="object-cover object-center"
          />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/65" />
          <div className="relative z-10 flex min-h-[520px] flex-col p-4 text-white sm:min-h-[560px] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard" aria-label="Back to Home" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/20 shadow-lg backdrop-blur-xl transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <UiIcon name="arrow-left" className="h-5 w-5" />
              </Link>
              <span className="rounded-full border border-white/50 bg-white/20 px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur-xl">Garden</span>
              <div className="flex gap-2">
                <Link href="/search" aria-label="Search DiaryDock" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/20 shadow-lg backdrop-blur-xl transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <UiIcon name="search" className="h-5 w-5" />
                </Link>
                <button type="button" onClick={() => setAddOpen(true)} aria-label="Add to Garden" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/20 shadow-lg backdrop-blur-xl transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <UiIcon name="plus" className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-auto max-w-[560px] rounded-[24px] border border-white/30 bg-[#20352a]/45 p-4 shadow-xl backdrop-blur-md sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.23em] text-white/75">Outdoor life</p>
              <h1 className="mt-2 font-serif text-[38px] leading-none tracking-[-0.04em] sm:text-5xl">Everything beyond the back door</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/90">Keep pets, outdoor spaces, jobs and everything beyond the back door organised in one place.</p>
            </div>
          </div>
        </header>

        <Panel className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Your Garden at a glance</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              [gardenReminders.length, "Active reminders"],
              [gardenDocuments.length, "Garden files"],
              [reviewDocuments.length, "To review"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[18px] bg-[#eef2e9] px-2 py-4 text-center">
                <p className="font-serif text-3xl leading-none text-[#315443]">{value}</p>
                <p className="mt-2 text-[10px] font-semibold leading-4 text-[#667068]">{label}</p>
              </div>
            ))}
          </div>
          {!gardenReminders.length && !gardenDocuments.length ? (
            <p className="mt-4 rounded-2xl bg-[#faf9f4] px-4 py-3 text-[11px] leading-5 text-[#667068]">Your Garden starts quietly. Add a reminder or upload an outdoor record when you are ready.</p>
          ) : null}
        </Panel>

        <Panel className="mt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Things to review</p>
              <h2 className="mt-1 font-serif text-2xl">What needs your attention</h2>
            </div>
            {attentionItems.length ? <Link href="/reminders" className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#52705a]">View all</Link> : null}
          </div>
          {attentionItems.length ? (
            <div className="mt-4 space-y-2">
              {attentionItems.map((item) => (
                <Link key={item.id} href={item.href} className="flex min-h-[68px] items-center gap-3 rounded-[18px] bg-[#faf9f4] p-3 transition hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]"><UiIcon name={item.icon} className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-[#667068]">{item.detail}</span></span>
                  <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-[#7b847d]" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPreview icon="check" title="Nothing needs review" detail="Recorded Garden reminders and documents that need checking will appear here." href="/reminders" action="Reminders" />
          )}
        </Panel>

        <section aria-labelledby="garden-sections-title" className="mt-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Garden sections</p>
          <h2 id="garden-sections-title" className="mt-1 font-serif text-3xl">Everything outdoors, in its place</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {gardenSections.map((section) => (
              <Link key={section.id} href={`/garden/${section.id}`} className="group flex min-h-[112px] items-center gap-3 rounded-[22px] border border-[#20352a]/[0.07] bg-[#fffdf8] p-4 shadow-[0_22px_44px_-40px_rgba(32,53,42,0.72)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#e8eee3] text-[#52705a]"><UiIcon name={section.icon} className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{section.title}</span><span className="mt-1 block text-[11px] leading-5 text-[#667068]">{section.description}</span></span>
                <UiIcon name="chevron-right" className="h-5 w-5 shrink-0 text-[#879087] transition group-hover:translate-x-0.5 motion-reduce:transform-none" />
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="garden-previews-title" className="mt-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Your outdoor picture</p>
          <h2 id="garden-previews-title" className="mt-1 font-serif text-3xl">Ready when you are</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Panel><h3 className="font-serif text-xl">Pets</h3><EmptyPreview icon="heart" title="No pet profiles connected" detail="Pet details will stay private and only appear here when you choose to add them." href="/garden/pets" action="Open" /></Panel>
            <Panel><h3 className="font-serif text-xl">Outdoor jobs</h3>{gardenReminders.length ? <div className="mt-4 space-y-2">{gardenReminders.slice(0, 3).map((reminder) => <Link key={reminder.id} href="/reminders" className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#faf9f4] px-3 text-xs"><UiIcon name="calendar" className="h-4 w-4 text-[#52705a]" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{reminder.title}</span><span className="mt-1 block truncate text-[10px] text-[#667068]">{reminder.timeLabel}</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" /></Link>)}</div> : <EmptyPreview icon="calendar" title="No outdoor jobs recorded" detail="Use the existing Reminder system to keep outdoor work visible." href="/garden/jobs" action="Open" />}</Panel>
            <Panel><h3 className="font-serif text-xl">Next bin collection</h3><EmptyPreview icon="archive" title="No collection schedule yet" detail="Add schedules only after the dedicated collection workflow is ready." href="/garden/bins" action="Open" /></Panel>
            <Panel><h3 className="font-serif text-xl">Garden projects</h3><EmptyPreview icon="briefcase" title="No projects recorded" detail="Quotes, tasks and project files will be organised here without duplicating documents." href="/garden/projects" action="Open" /></Panel>
            <Panel className="sm:col-span-2"><h3 className="font-serif text-xl">Tools & equipment</h3><EmptyPreview icon="gear" title="No equipment needs attention" detail="Equipment servicing, manuals and warranties will use DiaryDock's existing files and reminder patterns." href="/garden/equipment" action="Open" /></Panel>
          </div>
        </section>

        <p className="mt-5 rounded-[18px] border border-[#20352a]/[0.07] bg-[#eef2e9] px-4 py-3.5 text-[11px] leading-5 text-[#667068]">DiaryDock organises information you provide. It does not determine legal boundary ownership, certify outdoor safety or replace veterinary, legal or qualified professional advice.</p>
      </div>

      <ModalShell open={addOpen} title="Add to Garden" subtitle="Only actions already supported by DiaryDock are shown here." onClose={() => setAddOpen(false)}>
        <div className="space-y-2">
          <Link href="/capture?room=garden" onClick={() => setAddOpen(false)} className="flex min-h-16 items-center gap-3 rounded-[18px] bg-[#eef2e9] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-[#52705a]"><UiIcon name="camera" className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#20352a]">Upload a Garden document</span><span className="mt-1 block text-[11px] text-[#667068]">Securely scan or upload an outdoor record.</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" /></Link>
          <Link href="/reminders" onClick={() => setAddOpen(false)} className="flex min-h-16 items-center gap-3 rounded-[18px] bg-[#faf9f4] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-[#52705a]"><UiIcon name="calendar" className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#20352a]">Add an outdoor reminder</span><span className="mt-1 block text-[11px] text-[#667068]">Use DiaryDock's existing reminder system.</span></span><UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" /></Link>
        </div>
      </ModalShell>
    </main>
  );
}
