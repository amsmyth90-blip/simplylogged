import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillSectionHeading } from "@/components/wills/WillUi";

import { letterInputClass } from "./LetterRecipientCards";
import type { LetterEditorViewModel } from "./useLetterEditor";

export function LetterWritingCard({ view }: { view: LetterEditorViewModel }) {
  return (
    <WillCard>
      <WillSectionHeading
        icon="mail"
        title="Write your letter"
        description="Your words are saved privately to your DiaryDock account."
      />
      <label className="mt-5 block">
        <span className="text-sm font-semibold text-[#20352a]">
          Letter title
        </span>
        <input
          value={view.draft.title}
          onChange={(event) => view.updateField("title", event.target.value)}
          className={letterInputClass}
          placeholder="For example, For my children"
        />
      </label>
      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#20352a]">
          Your message
        </span>
        <textarea
          value={view.draft.content}
          onChange={(event) => view.updateField("content", event.target.value)}
          rows={12}
          className="mt-2 w-full rounded-[17px] border border-[#20352a]/10 bg-white px-4 py-4 font-serif text-[17px] leading-8 text-[#20352a] outline-none transition focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/15"
          placeholder="Dear…"
        />
      </label>
      <label className="mt-4 flex min-h-12 items-center gap-3 rounded-[15px] bg-[#f1f3ec] px-4 text-sm text-[#294436]">
        <input
          type="checkbox"
          checked={view.draft.status === "ready"}
          onChange={(event) =>
            view.updateField("status", event.target.checked ? "ready" : "draft")
          }
          className="h-5 w-5 accent-[#52705a]"
        />
        I have reviewed this letter and want to mark it ready
      </label>
    </WillCard>
  );
}

export function LetterEnvelopeCard({ view }: { view: LetterEditorViewModel }) {
  return (
    <WillCard>
      <WillSectionHeading
        icon="heart"
        title="Envelope preview"
        description="Add the words someone would see before opening the letter."
      />
      <label className="mt-5 block">
        <span className="text-sm font-semibold text-[#20352a]">
          Envelope title
        </span>
        <input
          value={view.draft.envelopeTitle}
          onChange={(event) =>
            view.updateField("envelopeTitle", event.target.value)
          }
          className={letterInputClass}
          placeholder="A letter for you"
        />
      </label>
      <label className="mt-4 block">
        <span className="text-sm font-semibold text-[#20352a]">
          Short message
        </span>
        <textarea
          value={view.draft.envelopeMessage}
          onChange={(event) =>
            view.updateField("envelopeMessage", event.target.value)
          }
          rows={3}
          className="mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm leading-6 text-[#20352a] outline-none focus:border-[#6f8e72]"
          placeholder="Open this when…"
        />
      </label>
      {view.draft.id ? (
        <Link
          href={`/wills/letters-of-wishes/${view.draft.id}/preview`}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/30 px-4 text-sm font-semibold text-[#294436]"
        >
          <UiIcon name="heart" className="h-4 w-4" /> View envelope preview
        </Link>
      ) : null}
    </WillCard>
  );
}
