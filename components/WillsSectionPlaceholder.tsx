import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import type { IconName } from "@/components/UiIcon";

type WillsSectionPlaceholderProps = {
  title: string;
  description: string;
  icon: IconName;
};

export function WillsSectionPlaceholder({ title, description, icon }: WillsSectionPlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-[760px] space-y-6 pb-6">
      <PageHeader
        eyebrow="Wills & letters of wishes"
        title={title}
        subtitle={description}
        backHref="/wills"
        backLabel="Wills & wishes"
      />

      <EmptyState
        icon={icon}
        title="This section is coming next"
        message="The page structure is ready. We will design the full feature carefully before asking you to add any private information."
        action={<Link href="/wills" className="inline-flex min-h-11 items-center rounded-full bg-[#20352a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2b4638] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2">Back to Wills & wishes</Link>}
      />

      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
        DiaryDock helps you organise and securely store your information. It does not provide legal advice or replace advice from a qualified solicitor.
      </p>
    </div>
  );
}
