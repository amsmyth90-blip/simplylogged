import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

type DocumentTone = "PDF" | "Scan" | "Note" | "Image";

const toneStyle: Record<DocumentTone, string> = {
  PDF: "bg-blush text-orange-700",
  Scan: "bg-mist text-sky-700",
  Note: "bg-sage/70 text-moss",
  Image: "bg-gold/25 text-yellow-800"
};

type DocumentCardProps = {
  title: string;
  kind: DocumentTone;
  meta: string;
  href?: string;
  badge?: string;
  starred?: boolean;
  compact?: boolean;
};

export function DocumentCard({
  title,
  kind,
  meta,
  href = "/files",
  badge,
  starred = false,
  compact = false
}: DocumentCardProps) {
  const content = (
    <>
      <span
        className={`flex ${compact ? "h-9 w-9 rounded-lg" : "h-10 w-10 rounded-xl"} shrink-0 items-center justify-center text-[10px] font-bold ${toneStyle[kind]}`}
      >
        {kind}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-ink">{title}</span>
          {starred ? <UiIcon name="star" className="h-3.5 w-3.5 shrink-0 text-gold" /> : null}
        </span>
        <span className="mt-0.5 block text-xs text-ink/50">{meta}</span>
      </span>
      {badge ? (
        <span className="hidden shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-ink/55 sm:inline-flex">
          {badge}
        </span>
      ) : null}
      <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/25" />
    </>
  );

  return (
    <Link
      href={href}
      className={`flex items-center gap-3.5 ${compact ? "px-3.5 py-3" : "px-4 py-4"} transition hover:bg-white/52`}
    >
      {content}
    </Link>
  );
}
