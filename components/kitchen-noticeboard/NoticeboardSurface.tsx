import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import type { KitchenNotice } from "@/lib/diarydock-data";
import {
  noticeCategories,
  noticeColourStyles,
  noticePinStyles,
  noticePlacement,
} from "./noticeboard-rules";

type NoticeboardSurfaceProps = {
  archivedCount: number;
  filter: (typeof noticeCategories)[number];
  hydrated: boolean;
  notices: KitchenNotice[];
  onAdd: () => void;
  onArchive: () => void;
  onEdit: (notice: KitchenNotice) => void;
  onFilter: (filter: (typeof noticeCategories)[number]) => void;
};

export function NoticeboardSurface(props: NoticeboardSurfaceProps) {
  return (
    <main className="mx-auto flex h-[calc(100svh-72px)] w-full max-w-lg flex-col px-4 pb-2 pt-[max(14px,env(safe-area-inset-top))]">
      <header className="flex shrink-0 items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/room/kitchen"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/90 bg-white/72 text-slate-700 shadow-sm backdrop-blur-xl"
            aria-label="Back to Kitchen"
          >
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#66805c]">
              Kitchen
            </p>
            <h1 className="truncate text-[22px] font-semibold tracking-[-0.03em]">
              Family noticeboard
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={props.onArchive}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/72 text-slate-600 shadow-sm backdrop-blur-xl"
            aria-label="Open notice archive and weekly summary"
          >
            <UiIcon name="archive" className="h-4 w-4" />
            {props.archivedCount ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#718b62] px-1 text-[8px] font-bold text-white">
                {props.archivedCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={props.onAdd}
            disabled={!props.hydrated}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#263b35] text-white shadow-[0_12px_24px_-12px_rgba(38,59,53,0.75)] disabled:cursor-wait disabled:opacity-45"
            aria-label={props.hydrated ? "Add a note" : "Loading noticeboard"}
          >
            <UiIcon name="plus" className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mt-3 flex shrink-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {noticeCategories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => props.onFilter(category)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition ${props.filter === category ? "border-[#263b35] bg-[#263b35] text-white" : "border-white/90 bg-white/72 text-slate-600 shadow-sm backdrop-blur-xl"}`}
          >
            {category}
          </button>
        ))}
      </div>

      <section className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-[30px] border-[7px] border-[#9b7453] bg-[#b9885f] p-4 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.16),0_20px_45px_-26px_rgba(53,39,25,0.7)]">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_30%,#6c4328_0_1px,transparent_1.5px),radial-gradient(circle_at_75%_60%,#f2d2aa_0_1px,transparent_1.5px)] [background-size:13px_15px,17px_19px]" />
        <div className="relative h-full">
          {props.notices.map((notice, index) => {
            const compact = props.notices.length > 4 && index >= 4;
            return (
              <button
                type="button"
                key={notice.id}
                onClick={() => props.onEdit(notice)}
                style={noticePlacement(index, props.notices.length)}
                className={`absolute flex min-h-0 flex-col overflow-hidden rounded-[4px] border text-left shadow-[0_10px_18px_-10px_rgba(48,31,18,0.72)] transition hover:z-50 active:brightness-95 ${compact ? "p-2.5 pt-4" : "p-3 pt-5"} ${noticeColourStyles[notice.colour]} ${notice.completed ? "opacity-70" : ""}`}
              >
                <span
                  className={`absolute left-1/2 top-1.5 -translate-x-1/2 rounded-full border-2 border-white/65 shadow-[0_3px_4px_rgba(31,24,18,0.35)] ${compact ? "h-3 w-3" : "h-3.5 w-3.5"} ${noticePinStyles[notice.colour]}`}
                />
                <span
                  className={`${compact ? "text-[7px]" : "text-[8px]"} font-bold uppercase tracking-[0.16em] text-slate-500`}
                >
                  {notice.category}
                </span>
                <strong
                  className={`line-clamp-2 leading-[1.16] tracking-[-0.02em] text-slate-800 ${compact ? "mt-1 text-[11px]" : "mt-1.5 text-[14px]"} ${notice.completed ? "line-through" : ""}`}
                >
                  {notice.title}
                </strong>
                {notice.detail && !compact ? (
                  <span className="mt-1 line-clamp-2 text-[9px] leading-3.5 text-slate-600">
                    {notice.detail}
                  </span>
                ) : null}
                <span
                  className={`mt-auto flex items-end justify-between gap-1 pt-1 font-semibold text-slate-500 ${compact ? "text-[7px]" : "text-[8px]"}`}
                >
                  <span className="truncate">{notice.assignedTo}</span>
                  <span className="shrink-0">{notice.due}</span>
                </span>
                {notice.completed ? (
                  <span className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#607b55] text-white">
                    <UiIcon name="check" className="h-3 w-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
          {!props.notices.length ? (
            <button
              type="button"
              onClick={props.onAdd}
              className="absolute left-1/2 top-1/2 flex w-[220px] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-[22px] bg-white/80 p-6 text-center shadow-lg backdrop-blur-xl"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#263b35] text-white">
                <UiIcon name="plus" className="h-5 w-5" />
              </span>
              <strong className="mt-3 text-sm">Pin the first note</strong>
              <span className="mt-1 text-[11px] text-slate-500">
                Nothing is pinned in{" "}
                {props.filter === "All" ? "the board" : props.filter} yet.
              </span>
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
