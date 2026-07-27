import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  heroImage?: string;
  heroPosition?: string;
  heroTone?: string;
  badge?: string;
  meta?: React.ReactNode;
  heroOverlay?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  backHref,
  backLabel,
  action,
  heroImage,
  heroPosition = "center center",
  heroTone = "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(51,39,21,0.1) 35%, rgba(35,29,21,0.42) 100%)",
  badge,
  meta,
  heroOverlay
}: PageHeaderProps) {
  if (heroImage) {
    return (
      <header className="estate-hero immersive-hero text-white">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `${heroTone}, url(${heroImage})`,
            backgroundPosition: heroPosition,
            backgroundSize: "cover"
          }}
        />
        {heroOverlay ? <div className="absolute inset-0 z-20">{heroOverlay}</div> : null}

        <div className="relative z-30 flex min-h-[440px] flex-col p-5 sm:min-h-[420px] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {backHref ? (
                <Link
                  href={backHref}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/10 text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md transition hover:bg-white/20 sm:w-auto sm:gap-1.5 sm:px-3.5"
                >
                  <UiIcon name="arrow-left" className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{backLabel ?? "Back"}</span>
                </Link>
              ) : null}
              {badge ? <span className="hidden estate-chip border-white/30 bg-white/14 text-white/80 sm:inline-flex">{badge}</span> : null}
            </div>
            <span className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 font-serif text-[23px] tracking-[-0.035em] text-white drop-shadow-sm">
              LifeDock
            </span>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>

          <div className="mt-auto max-w-2xl pb-24 sm:pb-20">
            <p className="text-[10px] font-medium uppercase tracking-[0.27em] text-white/72">{eyebrow}</p>
            <h1 className="mt-2 max-w-xl font-serif text-[40px] font-normal leading-[0.98] tracking-[-0.045em] text-white drop-shadow-sm sm:text-[46px]">
              {title}
            </h1>
            {subtitle ? <p className="mt-3 max-w-md text-[14px] leading-[1.45] text-white/90 drop-shadow-sm">{subtitle}</p> : null}
            {meta ? <div className="mt-4 hidden flex-wrap gap-2 sm:flex">{meta}</div> : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="pt-1">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft backdrop-blur-md transition hover:bg-white"
        >
          <UiIcon name="arrow-left" className="h-3.5 w-3.5" />
          {backLabel ?? "Back"}
        </Link>
      ) : null}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">{eyebrow}</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[32px]">
            {title}
          </h1>
          {subtitle ? <p className="mt-2 max-w-2xl text-[15px] leading-6 text-ink/60">{subtitle}</p> : null}
          {meta ? <div className="mt-4 flex flex-wrap gap-2">{meta}</div> : null}
        </div>
        {action ? <div className="shrink-0 pb-1">{action}</div> : null}
      </div>
    </header>
  );
}
