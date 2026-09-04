"use client";

import {
  BillsCard,
  BillsSectionTitle,
  fieldClass,
} from "@/components/bills/BillsUi";
import {
  correspondenceFolders,
  type CorrespondenceFolder,
  type CorrespondenceStatus,
} from "@/lib/correspondence-records";

import type { CorrespondenceDetailController } from "./useCorrespondenceDetail";

export function CorrespondenceInformationPanel({
  controller,
}: {
  controller: CorrespondenceDetailController;
}) {
  const { draft, message, opening, update, save, openDocument } = controller;
  if (!draft) return null;
  return (
    <BillsCard>
      <BillsSectionTitle
        icon="mail"
        title="Letter information"
        detail="Only confirmed details are used for dashboards and reminders"
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#667068]">
          Title
          <input
            value={draft.title}
            onChange={(event) => update("title", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Sender
          <input
            value={draft.sender}
            onChange={(event) => update("sender", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Type
          <input
            value={draft.correspondenceType}
            onChange={(event) =>
              update("correspondenceType", event.target.value)
            }
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Folder
          <select
            value={draft.folder}
            onChange={(event) =>
              update("folder", event.target.value as CorrespondenceFolder)
            }
            className={fieldClass}
          >
            {correspondenceFolders.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Received
          <input
            type="date"
            value={draft.receivedDate}
            onChange={(event) => update("receivedDate", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068]">
          Deadline
          <input
            type="date"
            value={draft.deadline}
            onChange={(event) => update("deadline", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
          Status
          <select
            value={draft.status}
            onChange={(event) =>
              update("status", event.target.value as CorrespondenceStatus)
            }
            className={fieldClass}
          >
            <option value="unread">Unread</option>
            <option value="action-needed">Action needed</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </div>
      <label className="mt-4 block text-xs font-semibold text-[#667068]">
        Summary
        <textarea
          rows={4}
          value={draft.summary}
          onChange={(event) => update("summary", event.target.value)}
          className={fieldClass}
        />
      </label>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={save}
          className="min-h-12 flex-1 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
        >
          {draft.reviewStatus === "needs-review"
            ? "Confirm and save"
            : "Save changes"}
        </button>
        {draft.storagePath ? (
          <button
            type="button"
            onClick={() => void openDocument()}
            disabled={opening}
            className="min-h-12 flex-1 rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
          >
            {opening ? "Opening…" : "View original letter"}
          </button>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="mt-3 text-xs font-semibold text-[#52705a]">
          {message}
        </p>
      ) : null}
    </BillsCard>
  );
}
