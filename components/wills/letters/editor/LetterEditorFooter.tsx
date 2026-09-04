import { UiIcon } from "@/components/UiIcon";
import {
  LettersLegalNotice,
  LetterSafetyNotice,
} from "@/components/wills/letters/LettersUi";

import type { LetterEditorViewModel } from "./useLetterEditor";

export function LetterEditorFooter({ view }: { view: LetterEditorViewModel }) {
  return (
    <>
      {view.draft.id ? (
        <LetterSafetyNotice>
          Set delivery preferences after saving. No recipient receives access
          automatically; trusted-person access continues to be managed
          separately.
        </LetterSafetyNotice>
      ) : null}
      {view.message ? (
        <p
          role="status"
          className="rounded-[15px] bg-[#eef2e9] px-4 py-3 text-sm leading-6 text-[#45604d]"
        >
          {view.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={view.saving}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#2f5140] px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        <UiIcon name={view.saving ? "clock" : "check"} className="h-4 w-4" />
        {view.saving
          ? "Saving privately…"
          : view.draft.id
            ? "Save a new version"
            : "Save letter"}
      </button>
      <LettersLegalNotice />
    </>
  );
}
