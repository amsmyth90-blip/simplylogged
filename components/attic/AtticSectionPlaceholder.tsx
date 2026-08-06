import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import type { AtticSection } from "@/lib/attic-sections";

export function AtticSectionPlaceholder({ section }: { section: AtticSection }) {
  return (
    <main className="min-h-screen bg-[#f5f2ea] px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))] text-[#20352a] sm:px-6">
      <div className="mx-auto w-full max-w-[760px] space-y-5">
        <PageHeader
          eyebrow="Attic · Memories"
          title={section.title}
          subtitle={section.description}
          backHref="/room/attic"
          backLabel="Attic"
        />

        <section className="rounded-[24px] border border-[#20352a]/[0.07] bg-[#fffdf8] p-4 shadow-[0_24px_48px_-42px_rgba(32,53,42,0.72)] sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
            This area will organise
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {section.scope.map((item) => (
              <span
                key={item}
                className="rounded-full bg-[#e8eee3] px-3 py-2 text-[11px] font-semibold text-[#52705a]"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <EmptyState
          icon={section.icon}
          title="This memory section is ready for its dedicated workflow"
          message="The Attic parent room is connected. Next we can build this section carefully without mixing memories into legal, health, vehicle or travel records."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/capture?room=attic"
                className="inline-flex min-h-11 items-center rounded-full bg-[#20352a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2b4638] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
              >
                Upload a memory
              </Link>
              <Link
                href="/room/attic"
                className="inline-flex min-h-11 items-center rounded-full border border-[#20352a]/10 bg-white px-5 py-2.5 text-sm font-semibold text-[#315443] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
              >
                Back to Attic
              </Link>
            </div>
          }
        />
      </div>
    </main>
  );
}
