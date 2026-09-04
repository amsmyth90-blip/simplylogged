"use client";

import {
  BillsCard,
  BillsSectionTitle,
  fieldClass,
} from "@/components/bills/BillsUi";

import type { ContactDetailController } from "./useContactDetail";

export function ContactNotes({
  controller,
}: {
  controller: ContactDetailController;
}) {
  const { draft, note, setNote, addNote } = controller;
  if (!draft) return null;
  return (
    <BillsCard>
      <BillsSectionTitle
        icon="file"
        title="Contact notes"
        detail="A dated record of useful conversations and context"
      />
      <div className="mt-4 flex gap-2">
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addNote();
          }}
          className={fieldClass}
          placeholder="Add a note…"
        />
        <button
          type="button"
          onClick={addNote}
          className="mt-1.5 min-h-11 rounded-[14px] border border-[#6f8e72]/35 px-4 text-xs font-semibold text-[#45604d]"
        >
          Add
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {draft.contactNotes.map((entry) => (
          <div
            key={entry.id}
            className="rounded-[14px] bg-[#f7f7f1] px-3 py-3 text-xs"
          >
            <p className="text-[#20352a]">{entry.note}</p>
            <p className="mt-1 text-[10px] text-[#667068]">
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(entry.createdAt))}
            </p>
          </div>
        ))}
      </div>
    </BillsCard>
  );
}
