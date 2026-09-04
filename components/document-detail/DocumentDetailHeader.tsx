import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import type { VaultDocument } from "@/lib/mock-data";

export function DocumentDetailHeader({ backHref, backLabel, canManage, document, isOpening, onEdit, onOpen }: { backHref: string; backLabel: string; canManage: boolean; document: VaultDocument; isOpening: boolean; onEdit: () => void; onOpen: () => void }) {
  const needsReview = document.reviewStatus === "needs-review";
  return (
    <header className="rounded-[22px] border border-white/70 bg-white/86 p-3 shadow-soft backdrop-blur-md sm:p-3.5">
      <div className="flex items-center justify-between gap-2">
        <Link href={backHref} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white/82 px-2.5 text-[11px] font-semibold text-ink/70 transition hover:bg-white"><UiIcon name="arrow-left" className="h-3.5 w-3.5" />{backLabel}</Link>
        <div className="flex items-center gap-2">
          {canManage ? <button type="button" onClick={onEdit} className="inline-flex min-h-9 items-center rounded-full border border-black/10 bg-white/82 px-3 text-[11px] font-semibold text-ink/70 shadow-sm transition hover:bg-white">Edit</button> : <span className="rounded-full bg-sage/60 px-3 py-1.5 text-[11px] font-semibold text-moss">Shared with you</span>}
          {document.storagePath ? <button type="button" onClick={onOpen} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-[11px] font-semibold text-white shadow-soft"><UiIcon name="file" className="h-3.5 w-3.5" />{isOpening ? "Opening" : "Open"}</button> : null}
        </div>
      </div>
      <div className="mt-2.5 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/42">{document.category}</p>
        <h1 className="mt-0.5 line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-ink sm:text-[20px]">{document.title}</h1>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-sage/60 px-2.5 py-1 text-[11px] font-semibold text-moss">{document.kind}</span><span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-ink/55">{document.size}</span>
          {document.roomName ? <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-ink/55">{document.roomName}</span> : null}
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${needsReview ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{needsReview ? "Needs review" : "Reviewed"}</span>
        </div>
      </div>
    </header>
  );
}
