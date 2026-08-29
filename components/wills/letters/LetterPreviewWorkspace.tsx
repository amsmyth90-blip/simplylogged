"use client";

import Link from "next/link";
import Image from "next/image";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillPageHeader } from "@/components/wills/WillUi";
import { LettersLegalNotice, LetterSubpageNav } from "@/components/wills/letters/LettersUi";
import { hydrateLettersRecord, recipientLabel } from "@/lib/letter-records";

export function LetterPreviewWorkspace({ letterId }: { letterId: string }) {
  const { state, hydrated } = useDiaryDockData();
  const letter = hydrateLettersRecord(state.willsWishes.lettersOfWishes).letters.find((item) => item.id === letterId) ?? null;
  if (!hydrated) return <div className="mx-auto w-full max-w-[680px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068]">Preparing the envelope preview…</div>;
  if (!letter) return <div className="mx-auto w-full max-w-[680px]"><WillPageHeader title="Letter not found" subtitle="This letter is not available in your private records." backHref="/wills/letters-of-wishes" /></div>;
  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader title="Envelope preview" subtitle="A calm preview of how this personal letter could be presented." backHref={`/wills/letters-of-wishes/${letterId}`} />
      <LetterSubpageNav letterId={letterId} />
      <section className="relative overflow-hidden rounded-[28px] border border-[#20352a]/10 bg-[#ece7db] px-5 py-12 text-center shadow-[0_28px_60px_-42px_rgba(32,53,42,0.6)] sm:px-10 sm:py-16">
        <Image src="/images/wills-botanical-leaves.svg" alt="" width={288} height={288} aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-72 w-72 opacity-35" />
        <div className="relative mx-auto max-w-md rounded-[22px] border border-white/70 bg-[#fffdf8] px-6 py-10 shadow-[0_22px_45px_-34px_rgba(32,53,42,0.6)]">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#dde6d8] text-[#45604d]"><UiIcon name="heart" className="h-6 w-6" /></span>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f8e72]">For {letter.recipientName || recipientLabel(letter.recipientType)}</p>
          <h1 className="mt-3 font-serif text-[30px] leading-tight text-[#20352a]">{letter.envelopeTitle || letter.title}</h1>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-[#667068]">{letter.envelopeMessage || "A personal letter, kept safely for you."}</p>
          <span className="mt-7 inline-flex min-h-11 items-center rounded-full bg-[#2f5140] px-5 text-sm font-semibold text-white">Open letter</span>
        </div>
      </section>
      <WillCard><h2 className="font-serif text-2xl text-[#20352a]">Letter preview</h2><p className="mt-4 whitespace-pre-wrap font-serif text-[17px] leading-8 text-[#394b40]">{letter.content}</p></WillCard>
      <Link href={`/wills/letters-of-wishes/${letterId}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-[15px] border border-[#6f8e72]/30 bg-white px-4 text-sm font-semibold text-[#294436]">Edit letter or envelope</Link>
      <LettersLegalNotice />
    </div>
  );
}
