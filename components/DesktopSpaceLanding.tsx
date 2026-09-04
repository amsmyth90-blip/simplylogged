"use client";

import Image from "next/image";
import Link from "next/link";

import { UiIcon, type IconName } from "@/components/UiIcon";

export type DesktopSpaceItem = {
  label: string;
  description: string;
  icon: IconName;
  href?: string;
  onClick?: () => void;
};

type DesktopSpaceLandingProps = {
  title: string;
  eyebrow: string;
  description: string;
  image: string;
  imageAlt: string;
  items: DesktopSpaceItem[];
  imagePosition?: string;
};

export function DesktopSpaceLanding({
  title,
  eyebrow,
  description,
  image,
  imageAlt,
  items,
  imagePosition = "center",
}: DesktopSpaceLandingProps) {
  return (
    <main className="fixed inset-0 hidden overflow-y-auto bg-[#f2efe6] text-[#1d3328] lg:block">
      <div className="mx-auto min-h-full max-w-[92rem] px-8 py-8 xl:px-12 xl:py-10">
        <header className="flex items-start justify-between gap-8">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#284536]/12 bg-white/70 px-4 text-sm font-semibold text-[#345444] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
            >
              <UiIcon name="arrow-left" className="h-4 w-4" />
              Home
            </Link>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.24em] text-[#708675]">
              {eyebrow}
            </p>
            <h1 className="mt-2 font-serif text-5xl leading-[1.02] tracking-[-0.035em] text-[#1f392d] xl:text-6xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#596961] xl:text-lg">
              {description}
            </p>
          </div>
          <div className="hidden rounded-full border border-[#284536]/10 bg-white/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7d72] xl:block">
            Your digital home
          </div>
        </header>

        <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(25rem,0.86fr)_minmax(32rem,1.14fr)] xl:items-stretch">
          <section
            aria-labelledby={`${title}-sections`}
            className="order-2 xl:order-1"
          >
            <div className="rounded-[2rem] border border-[#284536]/10 bg-[#fbfaf5] p-5 shadow-[0_24px_60px_rgba(45,58,48,0.08)] xl:h-full xl:p-6">
              <div className="flex items-end justify-between gap-4 px-1 pb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#849486]">
                    Inside this space
                  </p>
                  <h2
                    id={`${title}-sections`}
                    className="mt-1 font-serif text-3xl text-[#263e32]"
                  >
                    Choose an area
                  </h2>
                </div>
                <span className="text-sm text-[#758279]">
                  {items.length} sections
                </span>
              </div>
              <nav
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"
                aria-label={`${title} sections`}
              >
                {items.map((item) => {
                  const content = (
                    <>
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e4eadf] text-[#526e5d]">
                        <UiIcon name={item.icon} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-bold text-[#24382f]">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-sm leading-5 text-[#6b7770]">
                          {item.description}
                        </span>
                      </span>
                      <UiIcon
                        name="chevron-right"
                        className="h-4 w-4 shrink-0 text-[#87938b]"
                      />
                    </>
                  );
                  const className = [
                    "group flex min-h-[86px] w-full items-center gap-4 rounded-[1.35rem] border",
                    "border-[#284536]/9 bg-white px-4 py-3.5 text-left",
                    "shadow-[0_10px_28px_rgba(53,65,56,0.055)] transition",
                    "hover:-translate-y-0.5 hover:border-[#6f8e72]/35",
                    "hover:shadow-[0_16px_34px_rgba(53,65,56,0.1)]",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-[#6f8e72] motion-reduce:transform-none",
                  ].join(" ");

                  return item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={className}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onClick}
                      className={className}
                    >
                      {content}
                    </button>
                  );
                })}
              </nav>
            </div>
          </section>

          <figure className="relative order-1 min-h-[320px] overflow-hidden rounded-[2.25rem] border border-white/70 bg-[#283b30] shadow-[0_30px_80px_rgba(32,45,37,0.18)] xl:order-2 xl:min-h-[620px]">
            <Image
              src={image}
              alt={imageAlt}
              fill
              priority
              sizes="(min-width: 1280px) 55vw, 100vw"
              className="object-cover"
              style={{ objectPosition: imagePosition }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14251d]/58 via-transparent to-white/5" />
            <figcaption className="absolute inset-x-0 bottom-0 p-7 text-white xl:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">
                DiaryDock
              </p>
              <p className="mt-2 max-w-xl font-serif text-3xl leading-tight xl:text-4xl">
                Everything in {title.toLowerCase()}, calmly organised.
              </p>
            </figcaption>
          </figure>
        </div>
      </div>
    </main>
  );
}
