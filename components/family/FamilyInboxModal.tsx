import Link from "next/link";

import type { FamilyInboxItem } from "@/components/family/family-workspace-model";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";

type FamilyInboxModalProps = {
  assignees: string[];
  items: FamilyInboxItem[];
  onClose: () => void;
  onUpdate: (
    item: FamilyInboxItem,
    field: "assignedTo" | "dueDate" | "complete",
    value?: string
  ) => void;
  open: boolean;
};

function InboxActions({
  assignees,
  item,
  onUpdate
}: Pick<FamilyInboxModalProps, "assignees" | "onUpdate"> & { item: FamilyInboxItem }) {
  if (!item.actionable) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3">
      <label className="min-w-0 space-y-1">
        <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-ink/38">Assigned to</span>
        <select
          value={item.assignedTo ?? ""}
          onChange={(event) => onUpdate(item, "assignedTo", event.target.value)}
          className="w-full min-w-0 rounded-xl border border-black/8 bg-white/80 px-2.5 py-2 text-[11px] font-semibold text-ink outline-none focus:border-[#738767]"
        >
          <option value="">Unassigned</option>
          {item.assignedTo && !assignees.includes(item.assignedTo) ? (
            <option value={item.assignedTo}>{item.assignedTo}</option>
          ) : null}
          {assignees.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <label className="min-w-0 space-y-1">
        <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-ink/38">Due date</span>
        <input
          type="date"
          value={item.dueDate ?? ""}
          onChange={(event) => onUpdate(item, "dueDate", event.target.value)}
          className="w-full min-w-0 rounded-xl border border-black/8 bg-white/80 px-2.5 py-2 text-[11px] font-semibold text-ink outline-none focus:border-[#738767]"
        />
      </label>
      <button
        type="button"
        onClick={() => onUpdate(item, "complete")}
        className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[#e4ecde] px-3 py-2 text-xs font-semibold text-[#52664a] transition hover:bg-[#dae5d3]"
      >
        <UiIcon name="check" className="h-3.5 w-3.5" />
        Mark complete
      </button>
    </div>
  );
}

export function FamilyInboxModal({ assignees, items, onClose, onUpdate, open }: FamilyInboxModalProps) {
  return (
    <ModalShell
      open={open}
      title="Family inbox"
      subtitle={items.length ? `${items.length} shared item${items.length === 1 ? "" : "s"} to keep the household moving.` : "Shared forms, letters and important shortcuts will appear here."}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Link href="/intake" className="flex items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-3 py-3 text-center text-xs font-semibold text-white shadow-sm sm:text-sm">
            <UiIcon name="mail" className="h-4 w-4" />
            Intake queue
          </Link>
          <Link href="/capture" className="flex items-center justify-center gap-2 rounded-2xl border border-[#718068]/20 bg-[#e7ede1] px-3 py-3 text-center text-xs font-semibold text-[#4e6048] sm:text-sm">
            <UiIcon name="plus" className="h-4 w-4" />
            Scan family item
          </Link>
        </div>
      }
    >
      {items.length ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-[#d8c9ad] bg-[#f4ead7]/75 px-4 py-3 text-xs leading-5 text-ink/60">
            These are shared action cards and secure shortcuts. Original documents stay in their proper DiaryDock room.
          </div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5">
            {items.map((item) => (
              <article key={item.id} className="min-w-0 rounded-2xl border border-white/80 bg-white/72 p-3 shadow-sm">
                <Link href={item.href} className="flex min-w-0 items-center gap-3 transition hover:opacity-80">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e2eadc] text-[#5d7353]">
                    <UiIcon name={item.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink/48">{item.detail}</span>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${item.statusTone}`}>{item.status}</span>
                  </span>
                  <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/25" />
                </Link>
                <InboxActions assignees={assignees} item={item} onUpdate={onUpdate} />
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[#bdcbb4] bg-[#edf3e9]/70 p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/75 text-[#607455]"><UiIcon name="check" className="h-5 w-5" /></span>
          <p className="mt-3 text-sm font-semibold text-ink">Nothing needs attention</p>
          <p className="mt-1 text-xs leading-5 text-ink/50">New family forms, shared reminders and secure shortcuts will collect here automatically.</p>
        </div>
      )}
    </ModalShell>
  );
}
