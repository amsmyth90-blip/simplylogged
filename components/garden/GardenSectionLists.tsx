import Link from "next/link";
import type { ReactNode } from "react";

import type { GardenSectionMeta } from "@/components/garden/garden-section-model";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { GardenSection } from "@/lib/garden-sections";
import type { Reminder, VaultDocument } from "@/lib/mock-data";

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[24px] border border-[#20352a]/[0.07] bg-[#fffdf8]/95 p-4 shadow-[0_20px_48px_-38px_rgba(32,53,42,0.68)] sm:p-5 ${className}`}>{children}</section>;
}

function EmptyPrompt({ icon, title, detail, action }: { icon: IconName; title: string; detail: string; action: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#6f8e72]/25 bg-[#faf9f4] p-5 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#e8eee3] text-[#52705a]"><UiIcon name={icon} className="h-5 w-5" /></span>
      <h2 className="mt-3 font-serif text-xl text-[#20352a]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#667068]">{detail}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}

type GardenSectionListsProps = {
  documents: VaultDocument[];
  meta: GardenSectionMeta;
  onAdd: () => void;
  reminders: Reminder[];
  section: GardenSection;
};

export function GardenSectionLists({ documents, meta, onAdd, reminders, section }: GardenSectionListsProps) {
  return (
    <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Reminders</p><h2 className="mt-1 font-serif text-2xl">Things to do</h2></div>
          <button type="button" onClick={onAdd} className="inline-flex min-h-11 items-center rounded-full px-2 text-xs font-semibold text-[#52705a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Add</button>
        </div>
        {reminders.length ? (
          <div className="mt-4 space-y-2">
            {reminders.slice(0, 6).map((reminder) => (
              <Link key={reminder.id} href="/reminders" className="flex min-h-16 items-center gap-3 rounded-[18px] bg-[#f7f5ef] p-3 transition hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]"><UiIcon name="calendar" className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{reminder.title}</span><span className="mt-1 block truncate text-[10px] text-[#667068]">{[reminder.timeLabel, reminder.repeat, reminder.note].filter(Boolean).join(" · ")}</span></span>
                <UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyPrompt icon="calendar" title={meta.emptyTitle} detail={meta.emptyDetail} action={<button type="button" onClick={onAdd} className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white">Add first reminder</button>} />
        )}
      </Card>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Files</p><h2 className="mt-1 font-serif text-2xl">Stored records</h2></div>
          <Link href={`/capture?room=garden&section=${section.id}`} className="inline-flex min-h-11 items-center rounded-full px-2 text-xs font-semibold text-[#52705a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Upload</Link>
        </div>
        {documents.length ? (
          <div className="mt-4 space-y-2">
            {documents.slice(0, 6).map((document) => (
              <Link key={document.id} href={`/document/${document.id}?from=garden`} className="flex min-h-16 items-center gap-3 rounded-[18px] bg-[#f7f5ef] p-3 transition hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]"><UiIcon name={document.reviewStatus === "needs-review" ? "alert" : "file"} className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{document.title}</span>
                  <span className="mt-1 block truncate text-[10px] text-[#667068]">
                    {document.kind} · {document.updated} ·
                    {` ${document.reviewStatus === "needs-review" ? "Check details" : "Stored"}`}
                  </span>
                </span>
                <UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyPrompt
            icon="folder"
            title="No files linked yet"
            detail="Upload a document, photo or note when you have something real to store. DiaryDock will not create sample records here."
            action={(
              <Link href={`/capture?room=garden&section=${section.id}`}
                className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white">
                Upload a file
              </Link>
            )}
          />
        )}
      </Card>
    </section>
  );
}

export { Card as GardenCard };
