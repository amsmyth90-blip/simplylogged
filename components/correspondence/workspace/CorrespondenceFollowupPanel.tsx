"use client";

import {
  BillsCard,
  BillsSectionTitle,
  fieldClass,
} from "@/components/bills/BillsUi";

import type { CorrespondenceDetailController } from "./useCorrespondenceDetail";

export function CorrespondenceFollowupPanel({
  controller,
}: {
  controller: CorrespondenceDetailController;
}) {
  const { draft, responseNote, setResponseNote, addResponse } = controller;
  if (!draft) return null;
  return (
    <BillsCard>
      <BillsSectionTitle
        icon="file"
        title="Follow-up log"
        detail="Keep a dated record of calls, emails and responses"
      />
      <div className="mt-4 flex gap-2">
        <input
          value={responseNote}
          onChange={(event) => setResponseNote(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addResponse();
          }}
          className={fieldClass}
          placeholder="Called provider, sent form…"
        />
        <button
          type="button"
          onClick={addResponse}
          className="mt-1.5 min-h-11 rounded-[14px] border border-[#6f8e72]/35 px-4 text-xs font-semibold text-[#45604d]"
        >
          Save
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {draft.responses.map((response) => (
          <div
            key={response.id}
            className="rounded-[14px] bg-[#f7f7f1] px-3 py-3 text-xs"
          >
            <p className="text-[#20352a]">{response.note}</p>
            <p className="mt-1 text-[10px] text-[#667068]">
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(response.createdAt))}
            </p>
          </div>
        ))}
      </div>
    </BillsCard>
  );
}
