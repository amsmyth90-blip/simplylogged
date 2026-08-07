"use client";

import { useState } from "react";

import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillPageHeader, formatWillDate } from "@/components/wills/WillUi";
import { LettersLegalNotice, LetterSubpageNav } from "@/components/wills/letters/LettersUi";
import { hydrateLettersRecord } from "@/lib/letter-records";

export function LetterVersionsWorkspace({ letterId }: { letterId: string }) {
  const { state, hydrated, updateState } = useLifeDockData();
  const record = hydrateLettersRecord(state.willsWishes.lettersOfWishes);
  const letter = record.letters.find((item) => item.id === letterId) ?? null;
  const [message, setMessage] = useState("");

  const restore = (versionId: string) => {
    if (!letter) return;
    const selected = letter.versions.find((version) => version.id === versionId);
    if (!selected || !window.confirm("Use this wording as a new version? Your existing versions will remain available.")) return;
    const now = new Date().toISOString();
    const nextNumber = letter.versions.length + 1;
    updateState((current) => {
      const currentRecord = hydrateLettersRecord(current.willsWishes.lettersOfWishes);
      return {
        ...current,
        willsWishes: {
          ...current.willsWishes,
          lettersOfWishes: {
            letters: currentRecord.letters.map((item) => item.id === letterId ? {
              ...item,
              title: selected.title,
              content: selected.content,
              envelopeTitle: selected.envelopeTitle,
              envelopeMessage: selected.envelopeMessage,
              updatedAt: now,
              versions: [...item.versions, { ...selected, id: crypto.randomUUID(), versionNumber: nextNumber, createdAt: now }]
            } : item),
            updatedAt: now
          }
        }
      };
    });
    setMessage(`Version ${selected.versionNumber} was restored as new version ${nextNumber}.`);
  };

  if (!hydrated) return <div className="mx-auto w-full max-w-[680px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068]">Opening letter history…</div>;
  if (!letter) return <div className="mx-auto w-full max-w-[680px]"><WillPageHeader title="Letter not found" subtitle="This letter is not available in your private records." backHref="/wills/letters-of-wishes" /></div>;
  const versions = [...letter.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader title="Letter versions" subtitle="Earlier wording stays available whenever you save a new version." backHref={`/wills/letters-of-wishes/${letterId}`} />
      <LetterSubpageNav letterId={letterId} />
      {message ? <p role="status" className="rounded-[15px] bg-[#eef2e9] px-4 py-3 text-sm text-[#45604d]">{message}</p> : null}
      <ol className="space-y-3">{versions.map((version, index) => <li key={version.id}><WillCard as="article"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#20352a]">Version {version.versionNumber}</p><p className="mt-1 text-[11px] text-[#667068]">Saved {formatWillDate(version.createdAt)}</p></div>{index === 0 ? <span className="rounded-full bg-[#dde6d8] px-2.5 py-1 text-[10px] font-semibold text-[#45604d]">Current wording</span> : null}</div><details className="mt-4"><summary className="flex min-h-11 cursor-pointer items-center justify-between rounded-[13px] bg-[#f3f4ed] px-3 text-sm font-semibold text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Read this version <UiIcon name="chevron-down" className="h-4 w-4" /></summary><div className="mt-3 rounded-[14px] border border-[#20352a]/[0.06] bg-white p-4"><h3 className="font-serif text-xl text-[#20352a]">{version.title}</h3><p className="mt-3 whitespace-pre-wrap font-serif text-[15px] leading-7 text-[#59655d]">{version.content}</p></div></details>{index !== 0 ? <button type="button" onClick={() => restore(version.id)} className="mt-3 min-h-11 rounded-[14px] border border-[#6f8e72]/30 px-4 text-sm font-semibold text-[#294436]">Use as a new version</button> : null}</WillCard></li>)}</ol>
      <LettersLegalNotice />
    </div>
  );
}
