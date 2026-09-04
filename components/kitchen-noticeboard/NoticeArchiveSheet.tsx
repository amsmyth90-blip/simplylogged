import type { KitchenNotice } from "@/lib/diarydock-data";
import { noticePinStyles } from "./noticeboard-rules";

type NoticeArchiveSheetProps = {
  completed: KitchenNotice[];
  notices: KitchenNotice[];
  onClose: () => void;
  onRestore: (id: string) => void;
};

export function NoticeArchiveSheet(props: NoticeArchiveSheetProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/25 p-2 backdrop-blur-[2px]" onClick={props.onClose}>
      <section role="dialog" aria-modal="true" aria-label="Notice archive and weekly summary" onClick={(event) => event.stopPropagation()} className="max-h-[calc(100svh-12px)] w-full max-w-lg overflow-y-auto rounded-[30px] border border-white/90 bg-[#fbfcf9]/98 p-4 pb-[max(18px,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#66805c]">This week at home</p>
            <h2 className="mt-0.5 text-lg font-semibold">Family board summary</h2>
          </div>
          <button type="button" onClick={props.onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500" aria-label="Close archive">x</button>
        </div>
        <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-2">
          <div className="rounded-[20px] bg-[#e8f0df] p-3">
            <strong className="block text-2xl tracking-tight text-[#4f6947]">{props.completed.length}</strong>
            <span className="text-[10px] font-semibold text-[#607b55]">completed this week</span>
          </div>
          <div className="rounded-[20px] bg-[#f3eadf] p-3">
            <strong className="block text-xs text-slate-800">
              {props.completed.length
                ? `${props.completed.slice(0, 2).map((notice) => notice.title).join(" and ")} moved forward.`
                : "The board is ready for the week ahead."}
            </strong>
            <span className="mt-1 block text-[9px] text-slate-500">Completed notes fade for a day, then move here automatically.</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Archive</h3>
          <span className="text-[10px] text-slate-400">{props.notices.length} notes</span>
        </div>
        <div className="mt-2 max-h-[38svh] space-y-2 overflow-y-auto">
          {props.notices.map((notice) => (
            <article key={notice.id} className="flex items-center gap-3 rounded-[18px] border border-[#e4e8e1] bg-white p-3">
              <span className={`h-3 w-3 shrink-0 rounded-full ${noticePinStyles[notice.colour]}`} />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-xs font-semibold text-slate-700">{notice.title}</h4>
                <p className="mt-0.5 text-[9px] text-slate-400">{notice.category} · {notice.assignedTo}</p>
              </div>
              <button type="button" onClick={() => props.onRestore(notice.id)} className="rounded-full bg-[#edf4e9] px-3 py-1.5 text-[9px] font-semibold text-[#58704f]">Restore</button>
            </article>
          ))}
          {!props.notices.length ? <p className="rounded-[18px] bg-slate-50 px-4 py-6 text-center text-[11px] text-slate-500">Completed notes will collect here automatically.</p> : null}
        </div>
      </section>
    </div>
  );
}
