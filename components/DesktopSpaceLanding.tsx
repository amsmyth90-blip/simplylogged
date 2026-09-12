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
  description: string;
  image: string;
  imageAlt: string;
  items: DesktopSpaceItem[];
  imagePosition?: string;
};

export function DesktopSpaceLanding({
  title,
  description,
  image,
  imageAlt,
  items,
  imagePosition = "center",
}: DesktopSpaceLandingProps) {
  return (
    <main className="fixed inset-0 hidden overflow-hidden bg-[#f2efe6] text-[#1d3328] lg:block">
      <div className="mx-auto flex h-full max-w-[92rem] flex-col px-6 py-5 xl:px-9 xl:py-6">
        <header className="flex shrink-0 items-center gap-5">
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[#284536]/12 bg-white/70 px-4 text-sm font-semibold text-[#345444] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
            >
              <UiIcon name="arrow-left" className="h-4 w-4" />
              Home
            </Link>
            <div className="min-w-0">
              <h1 className="font-serif text-[clamp(2rem,3vw,3rem)] leading-none tracking-[-0.035em] text-[#1f392d]">{title}</h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-5 text-[#596961] xl:text-base">{description}</p>
            </div>
        </header>

        <div className="mt-5 grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(19rem,0.78fr)_minmax(0,1.22fr)] lg:items-stretch xl:grid-cols-[minmax(23rem,0.82fr)_minmax(32rem,1.18fr)]">
          <section
            aria-labelledby={`${title}-sections`}
            className="order-1 min-h-0"
          >
            <div className="h-full overflow-y-auto rounded-[1.65rem] border border-[#284536]/10 bg-[#fbfaf5] p-4 shadow-[0_24px_60px_rgba(45,58,48,0.08)] [scrollbar-width:thin] xl:p-5">
              <h2 id={`${title}-sections`} className="sr-only">
                {title} sections
              </h2>
              <nav
                className="grid gap-2.5 xl:grid-cols-2"
                aria-label={`${title} sections`}
              >
                {items.map((item) => {
                  const content = (
                    <>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e4eadf] text-[#526e5d]">
                        <UiIcon name={item.icon} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-[#24382f] xl:text-base">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-4 text-[#6b7770] xl:text-sm xl:leading-5">
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
                    "group flex min-h-[68px] w-full items-center gap-3 rounded-[1.15rem] border",
                    "border-[#284536]/9 bg-white px-3.5 py-2.5 text-left",
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

          <figure className="relative order-2 min-h-0 overflow-hidden rounded-[1.8rem] border border-white/70 bg-[#283b30] shadow-[0_30px_80px_rgba(32,45,37,0.18)]">
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
          </figure>
        </div>
      </div>
    </main>
  );
}
