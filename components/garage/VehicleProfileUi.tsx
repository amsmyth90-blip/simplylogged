"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { UiIcon, type IconName } from "@/components/UiIcon";
import { getPrivateDocumentUrl } from "@/lib/document-storage";
import type { VaultDocument } from "@/lib/mock-data";

export function PrivateVehicleImage({
  document,
  alt,
  className,
}: {
  document?: VaultDocument;
  alt: string;
  className: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getPrivateDocumentUrl(document?.storageBucket, document?.storagePath).then(
      (nextUrl) => {
        if (active) setUrl(nextUrl);
      },
    );
    return () => {
      active = false;
    };
  }, [document?.storageBucket, document?.storagePath]);

  if (!url) return null;
  return (
    <Image
      src={url}
      alt={alt}
      width={1200}
      height={800}
      unoptimized
      className={className}
    />
  );
}

export function SectionHeading({
  icon,
  title,
  detail,
  action,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#dde6d8] text-[#45604d]">
          <UiIcon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-[#20352a]">
            {title}
          </h2>
          {detail ? (
            <p className="mt-1 text-[12px] leading-5 text-[#667068]">{detail}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-5 border-b border-[#20352a]/[0.06] py-2.5 last:border-0">
      <dt className="text-[12px] text-[#667068]">{label}</dt>
      <dd className="max-w-[58%] text-right text-[13px] font-semibold text-[#20352a]">
        {value || "Not recorded"}
      </dd>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon: IconName;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#6f8e72]/35 bg-[#f7f7f1] px-5 py-8 text-center">
      <UiIcon name={icon} className="mx-auto h-7 w-7 text-[#6f8e72]" />
      <p className="mt-3 text-sm font-semibold text-[#20352a]">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-[#667068]">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-[17px] border border-[#20352a]/[0.07] bg-white px-2 text-center text-[11px] font-semibold text-[#20352a] transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3e9] text-[#45604d]">
        <UiIcon name={icon} className="h-[18px] w-[18px]" />
      </span>
      {label}
    </button>
  );
}

export function VehicleHeader({
  title,
  actionLabel = "Edit",
  onEdit,
  onMore,
  moreOpen = false,
}: {
  title: string;
  actionLabel?: string;
  onEdit?: () => void;
  onMore?: () => void;
  moreOpen?: boolean;
}) {
  return (
    <header className="relative flex min-h-14 items-center gap-1 rounded-[20px] border border-[#20352a]/[0.07] bg-white/88 px-2.5 shadow-sm backdrop-blur-xl">
      <Link
        href="/room/garage"
        aria-label="Back to Garage"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#20352a] transition hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
      >
        <UiIcon name="arrow-left" className="h-5 w-5" />
      </Link>
      <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[#20352a]">
        {title}
      </p>
      {onEdit ? (
        <div className="relative flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-11 rounded-full bg-[#eef3e9] px-3 text-[11px] font-semibold text-[#315d45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            {actionLabel === "Edit" ? actionLabel : `+ ${actionLabel}`}
          </button>
          <button
            type="button"
            onClick={onMore}
            aria-expanded={moreOpen}
            aria-label="More vehicle actions"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-base font-bold tracking-widest text-[#20352a] hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            ...
          </button>
          {moreOpen ? <VehicleMoreMenu /> : null}
        </div>
      ) : (
        <span className="h-11 w-11" />
      )}
    </header>
  );
}

function VehicleMoreMenu() {
  return (
    <div className="absolute right-0 top-12 z-40 w-52 rounded-[16px] border border-[#20352a]/10 bg-white p-2 shadow-xl">
      <Link
        href="/capture?room=garage"
        className="flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-xs font-semibold text-[#20352a] hover:bg-[#eef2e9]"
      >
        <UiIcon name="file" className="h-4 w-4" />
        Scan document
      </Link>
      <Link
        href="/reminders"
        className="flex min-h-11 items-center gap-2 rounded-[12px] px-3 text-xs font-semibold text-[#20352a] hover:bg-[#eef2e9]"
      >
        <UiIcon name="bell" className="h-4 w-4" />
        Open reminders
      </Link>
    </div>
  );
}
