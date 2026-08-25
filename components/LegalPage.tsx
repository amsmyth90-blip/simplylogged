import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";

type LegalSection = {
  title: string;
  body: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  effectiveDate: string;
  sections: LegalSection[];
};

export function LegalPage({ eyebrow, title, subtitle, effectiveDate, sections }: LegalPageProps) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        backHref="/settings"
        backLabel="Settings"
        meta={<span className="estate-chip">Effective {effectiveDate}</span>}
      />

      {sections.map((section) => (
        <section key={section.title} className="estate-sheet p-5">
          <SectionHeader title={section.title} />
          <div className="mt-4 space-y-3">
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-ink/62">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}

      <section className="estate-sheet p-5">
        <SectionHeader title="Questions" hint="Privacy, data, and account support" />
        <p className="mt-3 text-sm leading-7 text-ink/62">
          For privacy questions, data export, account deletion, or terms questions, contact{" "}
          <a href="mailto:hello@diarydock.com" className="inline-flex min-h-11 items-center font-semibold text-ink underline">
            hello@diarydock.com
          </a>
          .
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft"
        >
          Back to Settings
          <UiIcon name="chevron-right" className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
