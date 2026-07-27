import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  hint?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function SectionHeader({ title, hint, actionLabel, actionHref }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-[13px] text-ink/50">{hint}</p> : null}
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="shrink-0 text-[13px] font-semibold text-moss transition hover:text-ink">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
