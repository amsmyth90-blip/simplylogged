"use client";

import Link from "next/link";

import { WillPageHeader } from "@/components/wills/WillUi";
import { LetterSubpageNav } from "@/components/wills/letters/LettersUi";

import { LetterEditorFooter } from "./editor/LetterEditorFooter";
import { LetterMemoryCard } from "./editor/LetterMemoryCard";
import {
  LetterPurposeCard,
  LetterRecipientCard,
} from "./editor/LetterRecipientCards";
import {
  LetterEnvelopeCard,
  LetterWritingCard,
} from "./editor/LetterWritingCards";
import { useLetterEditor } from "./editor/useLetterEditor";

export function LetterEditorWorkspace({ letterId }: { letterId?: string }) {
  const view = useLetterEditor(letterId);

  if (!view.hydrated) {
    return (
      <div className="mx-auto w-full max-w-[760px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068] sm:max-w-[680px] xl:max-w-[760px]">
        Opening your private writing space…
      </div>
    );
  }
  if (letterId && !view.storedLetter) {
    return (
      <div className="mx-auto w-full max-w-[680px]">
        <WillPageHeader
          title="Letter not found"
          subtitle="This letter is not available in your private records."
          backHref="/wills/letters-of-wishes"
        />
        <Link
          href="/wills/letters-of-wishes"
          className="mt-5 inline-flex min-h-11 items-center rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
        >
          Back to your letters
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={view.saveLetter}
      className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]"
    >
      <WillPageHeader
        title={letterId ? view.draft.title || "Edit letter" : "New letter"}
        subtitle="Write from the heart, then decide how you would like the letter to be kept."
        backHref="/wills/letters-of-wishes"
      />
      {view.draft.id ? <LetterSubpageNav letterId={view.draft.id} /> : null}
      <LetterRecipientCard view={view} />
      <LetterPurposeCard view={view} />
      <LetterWritingCard view={view} />
      <LetterEnvelopeCard view={view} />
      <LetterMemoryCard view={view} />
      <LetterEditorFooter view={view} />
    </form>
  );
}
