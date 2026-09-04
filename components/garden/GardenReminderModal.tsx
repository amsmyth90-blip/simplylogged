import type { Dispatch, FormEvent, SetStateAction } from "react";

import type { GardenReminderDraft, GardenSectionMeta } from "@/components/garden/garden-section-model";
import { ModalShell } from "@/components/ModalShell";
import type { GardenSection } from "@/lib/garden-sections";
import type { Reminder } from "@/lib/mock-data";

type GardenReminderModalProps = {
  draft: GardenReminderDraft;
  message: string;
  meta: GardenSectionMeta;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  section: GardenSection;
  setDraft: Dispatch<SetStateAction<GardenReminderDraft>>;
};

export function GardenReminderModal({ draft, message, meta, onClose, onSubmit, open, section, setDraft }: GardenReminderModalProps) {
  const update = <Key extends keyof GardenReminderDraft>(key: Key, value: GardenReminderDraft[Key]) => setDraft((current) => ({ ...current, [key]: value }));
  const example = section.id === "bins" ? "Recycling collection" : section.id === "pets" ? "Vet appointment" : "Garden job";
  return (
    <ModalShell open={open} title={meta.primaryAction} subtitle="Add only the details you know. You can review it later in Reminders." onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-xs font-semibold text-[#20352a]">
          <span className="mb-1.5 block">Title</span>
          <input required value={draft.title} onChange={(event) => update("title", event.target.value)} className="form-control" placeholder={`e.g. ${example}`} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-[#20352a]">
            <span className="mb-1.5 block">Date</span>
            <input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} className="form-control" />
          </label>
          <label className="block text-xs font-semibold text-[#20352a]">
            <span className="mb-1.5 block">Time</span>
            <input type="time" value={draft.time} onChange={(event) => update("time", event.target.value)} className="form-control" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-[#20352a]">
            <span className="mb-1.5 block">Repeat</span>
            <input value={draft.repeat} onChange={(event) => update("repeat", event.target.value)} className="form-control" placeholder="Optional" />
          </label>
          <label className="block text-xs font-semibold text-[#20352a]">
            <span className="mb-1.5 block">Priority</span>
            <select value={draft.priority} onChange={(event) => update("priority", event.target.value as Reminder["priority"])} className="form-control">
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
        <label className="block text-xs font-semibold text-[#20352a]">
          <span className="mb-1.5 block">Notes</span>
          <textarea value={draft.note} onChange={(event) => update("note", event.target.value)} className="form-control min-h-24 resize-y" placeholder="Anything useful to remember" />
        </label>
        {message ? <p className="text-xs text-[#8a5149]">{message}</p> : null}
        <button type="submit" className="min-h-12 w-full rounded-2xl bg-[#315443] text-sm font-semibold text-white">Save reminder</button>
      </form>
    </ModalShell>
  );
}
