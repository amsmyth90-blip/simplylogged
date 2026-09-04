"use client";
import { UiIcon } from "@/components/UiIcon";
import type { ContractDetailController } from "./useContractDetail";

export function ContractDocumentPanel({
  controller,
}: {
  controller: ContractDetailController;
}) {
  const { draft, opening, openDocument } = controller;
  if (!draft) return null;
  return (
    <div className="mt-5 space-y-3">
      {draft.storagePath ? (
        <button
          type="button"
          onClick={() => void openDocument()}
          disabled={opening}
          className="flex min-h-[72px] w-full items-center gap-3 rounded-[18px] border border-[#20352a]/[0.08] bg-[#f7f7f1] p-3 text-left"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
            <UiIcon name="file" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[#20352a]">
              {draft.originalFileName || "Original contract"}
            </span>
            <span className="text-[11px] text-[#667068]">
              Private document · signed link opens for 60 seconds
            </span>
          </span>
          <span className="text-xs font-semibold text-[#52705a]">
            {opening ? "Opening…" : "View"}
          </span>
        </button>
      ) : (
        <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-6 text-center text-sm text-[#667068]">
          No original contract document is attached. Add a new record from the
          upload screen if you need a securely stored copy.
        </p>
      )}
    </div>
  );
}
