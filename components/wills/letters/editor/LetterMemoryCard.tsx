import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillSectionHeading } from "@/components/wills/WillUi";

import type { LetterEditorViewModel } from "./useLetterEditor";

export function LetterMemoryCard({ view }: { view: LetterEditorViewModel }) {
  return (
    <WillCard>
      <WillSectionHeading
        icon="star"
        title="Memory box"
        description="Add context, photos or a PDF that belongs with this letter."
      />
      <label className="mt-5 block">
        <span className="text-sm font-semibold text-[#20352a]">
          Memory notes
        </span>
        <textarea
          value={view.draft.memoryNotes}
          onChange={(event) =>
            view.updateField("memoryNotes", event.target.value)
          }
          rows={4}
          className="mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm leading-6 text-[#20352a] outline-none focus:border-[#6f8e72]"
          placeholder="Stories, memories or context for this letter…"
        />
      </label>
      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#20352a]">
          Add a photo or PDF
        </span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/jpeg,image/png,image/webp,image/heic"
          onChange={(event) =>
            view.chooseAttachment(event.target.files?.[0] ?? null)
          }
          className="mt-2 block min-h-12 w-full rounded-[15px] border border-dashed border-[#6f8e72]/45 bg-[#f8f8f2] px-3 py-3 text-sm text-[#59655d] file:mr-3 file:rounded-full file:border-0 file:bg-[#dde6d8] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#294436]"
        />
      </label>
      {view.draft.attachmentDocumentIds.length ? (
        <ul className="mt-4 space-y-2">
          {view.draft.attachmentDocumentIds.map((documentId) => {
            const document = view.state.vaultDocuments.find(
              (item) => item.id === documentId,
            );
            return (
              <li
                key={documentId}
                className="flex min-h-12 items-center gap-2 rounded-[14px] bg-[#f3f4ed] px-3"
              >
                <UiIcon name="file" className="h-4 w-4 text-[#52705a]" />
                <span className="min-w-0 flex-1 truncate text-xs text-[#59655d]">
                  {document?.originalFileName ?? "Secure attachment"}
                </span>
                <button
                  type="button"
                  onClick={() => void view.openAttachment(documentId)}
                  className="min-h-10 px-2 text-xs font-semibold text-[#294436]"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => view.removeAttachment(documentId)}
                  className="min-h-10 px-2 text-xs font-semibold text-[#765f38]"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="mt-3 text-[11px] leading-5 text-[#758078]">
        Voice and video letters are intentionally unavailable until DiaryDock
        has an approved encrypted-media storage and playback design.
      </p>
    </WillCard>
  );
}
