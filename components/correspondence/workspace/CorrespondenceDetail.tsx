"use client";

import {
  BillsAction,
  BillsHeader,
  BillsShell,
} from "@/components/bills/BillsUi";

import { CorrespondenceActionsPanel } from "./CorrespondenceActionsPanel";
import { CorrespondenceContactPanel } from "./CorrespondenceContactPanel";
import { CorrespondenceFollowupPanel } from "./CorrespondenceFollowupPanel";
import { CorrespondenceInformationPanel } from "./CorrespondenceInformationPanel";
import { CorrespondenceNotice } from "./correspondence-shared";
import { useCorrespondenceDetail } from "./useCorrespondenceDetail";

export function CorrespondenceDetail({
  correspondenceId,
}: {
  correspondenceId: string;
}) {
  const controller = useCorrespondenceDetail(correspondenceId);
  const { draft, markComplete } = controller;
  if (!draft) {
    return (
      <BillsShell>
        <BillsHeader
          title="Letter Not Found"
          subtitle="This correspondence is not available in your private records."
          backHref="/office/correspondence"
        />
      </BillsShell>
    );
  }
  return (
    <BillsShell>
      <BillsHeader
        title={
          draft.reviewStatus === "needs-review"
            ? "Check Letter Details"
            : draft.title || "Letter Details"
        }
        subtitle={
          draft.reviewStatus === "needs-review"
            ? "Compare the suggested details with the original letter before confirming."
            : `${draft.sender || "Sender not recorded"} · ${draft.correspondenceType || "Correspondence"}`
        }
        backHref="/office/correspondence"
      />
      {draft.reviewStatus === "needs-review" ? (
        <p className="rounded-[18px] border border-[#d8c9ad] bg-[#f4ead7] px-4 py-3 text-[12px] leading-5 text-[#6f604a]">
          <strong>Please check the details.</strong> Document reading can make
          mistakes, especially with dates and required actions.
        </p>
      ) : null}
      <CorrespondenceInformationPanel controller={controller} />
      <CorrespondenceActionsPanel controller={controller} />
      <CorrespondenceContactPanel controller={controller} />
      <CorrespondenceFollowupPanel controller={controller} />
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href={`/office/correspondence/${draft.id}/summary`}
          icon="leaf"
          title="Summary & actions"
          detail="Review the meaning, deadline and checklist"
        />
        <button
          type="button"
          onClick={markComplete}
          className="min-h-[80px] rounded-[18px] border border-[#6f8e72]/25 bg-white px-4 text-sm font-semibold text-[#45604d]"
        >
          Mark correspondence complete
        </button>
      </div>
      <CorrespondenceNotice />
    </BillsShell>
  );
}
