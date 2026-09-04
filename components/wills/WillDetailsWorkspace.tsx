"use client";

import { UiIcon } from "@/components/UiIcon";
import {
  WillCard,
  WillLegalNotice,
  WillPageHeader,
  WillSectionHeading,
} from "@/components/wills/WillUi";
import {
  WillImportantDetailsCard,
  WillSolicitorCard,
} from "@/components/wills/details/WillCoreDetailsCards";
import { WillExecutorsCard } from "@/components/wills/details/WillExecutorsCard";
import { WillLocationCard } from "@/components/wills/details/WillLocationCard";
import { willAreaClass } from "@/components/wills/details/WillDetailsUi";
import { useWillDetails } from "@/components/wills/details/useWillDetails";

export function WillDetailsWorkspace() {
  const view = useWillDetails();

  if (!view.hydrated) {
    return (
      <div className="mx-auto w-full max-w-[760px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068] sm:max-w-[680px] xl:max-w-[760px]">
        Opening your private details…
      </div>
    );
  }

  return (
    <form
      onSubmit={view.save}
      className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]"
    >
      <WillPageHeader
        title="Will details"
        subtitle="Keep the practical information around your current will together."
        backHref="/wills/my-will"
      />
      <WillImportantDetailsCard view={view} />
      <WillSolicitorCard view={view} />
      <WillLocationCard view={view} />
      <WillExecutorsCard view={view} />
      <WillCard>
        <WillSectionHeading
          icon="lock"
          title="Private notes"
          description="Use this for practical instructions. Notes are stored privately and are not sent to analytics."
        />
        <textarea
          value={view.draft.notes}
          onChange={(event) => view.updateField("notes", event.target.value)}
          rows={5}
          className={willAreaClass}
          placeholder="Important context for your own records…"
        />
      </WillCard>
      {view.savedMessage ? (
        <p
          role="status"
          className="rounded-[15px] bg-[#dde6d8] px-4 py-3 text-sm text-[#294436]"
        >
          {view.savedMessage}
        </p>
      ) : null}
      <button
        type="submit"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#2f5140] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_-22px_rgba(32,53,42,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
      >
        <UiIcon name="check" className="h-4 w-4" /> Save will details
      </button>
      <WillLegalNotice />
    </form>
  );
}
