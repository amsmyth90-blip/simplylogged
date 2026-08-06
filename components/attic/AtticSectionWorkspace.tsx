import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/PageHeader";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { AtticSection } from "@/lib/attic-sections";

function AtticCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[24px] border border-[#20352a]/[0.07] bg-[#fffdf8]/95 p-4 shadow-[0_24px_50px_-42px_rgba(32,53,42,0.74)] sm:p-5 ${className}`}
    >
      {children}
    </section>
  );
}

function ActionLink({
  href,
  icon,
  label,
  description,
  primary = false,
}: {
  href: string;
  icon: IconName;
  label: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[76px] items-center gap-3 rounded-[20px] border p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${
        primary
          ? "border-[#315443]/15 bg-[#315443] text-white hover:bg-[#3b604d]"
          : "border-[#20352a]/[0.07] bg-[#f7f5ef] text-[#20352a] hover:bg-[#eef2e9]"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ${
          primary ? "bg-white/14 text-[#e8eee3]" : "bg-white text-[#52705a]"
        }`}
      >
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span
          className={`mt-1 block text-[11px] leading-4 ${
            primary ? "text-white/70" : "text-[#667068]"
          }`}
        >
          {description}
        </span>
      </span>
      <UiIcon
        name="chevron-right"
        className={`h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 ${
          primary ? "text-white/70" : "text-[#8a938b]"
        }`}
      />
    </Link>
  );
}

function NumberedItem({ index, text }: { index: number; text: string }) {
  return (
    <li className="flex gap-3 rounded-[18px] bg-[#f7f5ef] p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8eee3] text-xs font-bold text-[#52705a]">
        {index}
      </span>
      <span className="pt-1 text-sm leading-5 text-[#33483b]">{text}</span>
    </li>
  );
}

export function AtticSectionWorkspace({ section }: { section: AtticSection }) {
  return (
    <main className="min-h-screen bg-[#f5f2ea] pb-32 text-[#20352a]">
      <div className="mx-auto max-w-[760px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <PageHeader
          eyebrow="Attic · Memories"
          title={section.title}
          subtitle={section.description}
          backHref="/room/attic"
          backLabel="Attic"
          heroImage="/images/pages/attic-memory-room-v1.webp"
          heroPosition="center 42%"
          heroTone="linear-gradient(180deg, rgba(34,30,23,0.18) 0%, rgba(34,30,23,0.18) 35%, rgba(34,30,23,0.72) 100%)"
          badge="Memory room"
          meta={
            <span className="estate-chip border-white/30 bg-white/14 text-white/80">
              No legal, health, car or travel records here
            </span>
          }
        />

        <div className="-mt-20 space-y-4">
          <AtticCard className="relative z-30">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#e8eee3] text-[#52705a]">
                <UiIcon name={section.icon} className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
                  What this page is for
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[#20352a]">{section.intention}</h2>
                <p className="mt-2 text-xs leading-5 text-[#667068]">
                  This starts as an organising page. It gives the Attic structure now, while keeping
                  private records empty until you choose to add them.
                </p>
              </div>
            </div>
          </AtticCard>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActionLink
              href="/capture?room=attic"
              icon="camera"
              label={section.primaryAction}
              description="Scan or upload a photo, note, letter or item image."
              primary
            />
            <ActionLink
              href="/capture?room=attic"
              icon={section.icon}
              label={section.secondaryAction}
              description="Add context so the memory makes sense later."
            />
          </div>

          <AtticCard>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
                  Organise this by
                </p>
                <h2 className="mt-1 font-serif text-2xl">Simple sections</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#e8eee3] text-[#52705a]">
                <UiIcon name="folder" className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {section.organiseBy.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-[#e8eee3] px-3 py-2 text-[11px] font-semibold text-[#52705a]"
                >
                  {item}
                </span>
              ))}
            </div>
          </AtticCard>

          <AtticCard>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
              When adding something, ask
            </p>
            <ol className="mt-4 space-y-2">
              {section.prompts.map((prompt, index) => (
                <NumberedItem key={prompt} index={index + 1} text={prompt} />
              ))}
            </ol>
          </AtticCard>

          <AtticCard className="bg-[#eef2e9]/90">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-white text-[#52705a]">
                <UiIcon name="check" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
                  Belongs here
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {section.scope.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#20352a]/[0.07] bg-white px-3 py-2 text-[11px] font-semibold text-[#52705a]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </AtticCard>

          <AtticCard>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-[#f4e9e5] text-[#8a5149]">
                <UiIcon name="alert" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a5149]">
                  Keep this in other rooms
                </p>
                <ul className="mt-3 space-y-2">
                  {section.notHere.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-5 text-[#667068]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8a5149]/50" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AtticCard>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActionLink
              href="/vault"
              icon="lock"
              label="View stored files"
              description="Open All Files for anything already uploaded."
            />
            <ActionLink
              href="/room/attic"
              icon="archive"
              label="Back to Attic"
              description="Return to the photo-room labels."
            />
          </div>
        </div>
      </div>
    </main>
  );
}
