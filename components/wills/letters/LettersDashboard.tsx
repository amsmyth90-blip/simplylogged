"use client";

import Link from "next/link";

import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillPageHeader, WillSectionHeading, formatWillDate } from "@/components/wills/WillUi";
import { LettersLegalNotice, LetterSafetyNotice } from "@/components/wills/letters/LettersUi";
import { hydrateLettersRecord, purposeLabel, recipientLabel } from "@/lib/letter-records";

export function LettersDashboard() {
  const { state, hydrated } = useLifeDockData();
  const record = hydrateLettersRecord(state.willsWishes.lettersOfWishes);
  const letters = [...record.letters].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const readyCount = letters.filter((letter) => letter.status === "ready").length;
  const scheduledCount = letters.filter((letter) => letter.delivery.type !== "not-set").length;

  if (!hydrated) return <div className="mx-auto w-full max-w-[760px] rounded-[28px] bg-white/70 p-8 text-sm text-[#667068] sm:max-w-[680px] xl:max-w-[760px]">Opening your private letters…</div>;

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader title="Letters of Wishes" subtitle="Share your thoughts, love and guidance with the people who matter most." backHref="/wills" />

      <section className="relative min-h-[180px] overflow-hidden rounded-[24px] border border-[#20352a]/[0.07] bg-[#eae5d8] p-5 shadow-[0_20px_42px_-34px_rgba(32,53,42,0.5)] sm:p-6">
        <img src="/images/wills-botanical-leaves.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -right-8 -top-14 h-60 w-60 rotate-6 opacity-45" />
        <div className="relative z-10 max-w-[25rem]"><p className="font-serif text-[25px] leading-[1.18] tracking-[-0.025em] text-[#20352a]">The words we leave behind can be the greatest gift of all.</p><div className="mt-5 flex items-center gap-2 text-[#52705a]"><span className="h-px w-10 bg-[#6f8e72]/50" /><UiIcon name="heart" className="h-5 w-5" /></div></div>
      </section>

      <WillCard>
        <div className="flex items-center justify-between gap-4"><WillSectionHeading icon="mail" title="Your letters" description={letters.length ? `${letters.length} private letter${letters.length === 1 ? "" : "s"} saved` : "Create a personal letter for someone important"} /><Link href="/wills/letters-of-wishes/new" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2f5140] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2" aria-label="Create a new letter"><UiIcon name="plus" className="h-5 w-5" /></Link></div>
        {letters.length ? (
          <div className="mt-5 space-y-3">{letters.map((letter) => <Link key={letter.id} href={`/wills/letters-of-wishes/${letter.id}`} className="group flex min-h-[82px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-24px_rgba(32,53,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]"><UiIcon name="leaf" className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#20352a]">{letter.title || recipientLabel(letter.recipientType)}</span><span className="mt-0.5 block truncate text-[12px] text-[#667068]">{letter.recipientName || recipientLabel(letter.recipientType)} · {purposeLabel(letter.purpose)}</span><span className="mt-1 block text-[10px] text-[#879088]">Updated {formatWillDate(letter.updatedAt)}</span></span><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${letter.status === "ready" ? "bg-[#dde6d8] text-[#45604d]" : "bg-[#f1eee5] text-[#806b45]"}`}>{letter.status}</span><UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" /></Link>)}</div>
        ) : (
          <div className="mt-5 rounded-[18px] bg-[#f6f5ef] px-5 py-7 text-center"><UiIcon name="mail" className="mx-auto h-8 w-8 text-[#6f8e72]" /><h3 className="mt-3 text-sm font-semibold text-[#20352a]">No letters yet</h3><p className="mx-auto mt-1 max-w-xs text-[12px] leading-5 text-[#667068]">Start with a message for today, a future milestone or some important personal guidance.</p></div>
        )}
        <Link href="/wills/letters-of-wishes/new" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"><UiIcon name="plus" className="h-4 w-4" />Create new letter</Link>
      </WillCard>

      {letters.length ? <div className="grid gap-3 sm:grid-cols-3"><WillCard className="p-4"><p className="text-2xl font-semibold text-[#20352a]">{letters.length}</p><p className="mt-1 text-[11px] text-[#667068]">Total letters</p></WillCard><WillCard className="p-4"><p className="text-2xl font-semibold text-[#20352a]">{readyCount}</p><p className="mt-1 text-[11px] text-[#667068]">Marked ready</p></WillCard><WillCard className="p-4"><p className="text-2xl font-semibold text-[#20352a]">{scheduledCount}</p><p className="mt-1 text-[11px] text-[#667068]">Delivery preferences</p></WillCard></div> : null}

      <WillCard>
        <WillSectionHeading icon="star" title="Memory box" description="Bring together personal notes, photos and documents attached to your letters." />
        <p className="mt-3 text-[12px] leading-5 text-[#667068]">Photos and PDFs can be stored securely now. Encrypted voice and video storage needs a separate media-security review before it is enabled.</p>
      </WillCard>

      <LetterSafetyNotice>Delivery choices are saved as your preferences only. DiaryDock does not currently send, unlock or release letters automatically after a date, event or death.</LetterSafetyNotice>
      <LettersLegalNotice />
    </div>
  );
}
