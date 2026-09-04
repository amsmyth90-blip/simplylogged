import Link from "next/link";

import { UiIcon, type IconName } from "@/components/UiIcon";

import { healthContactName } from "./bedroom-section-model";

export function ProfileTile({
  icon,
  label,
  value,
  href,
}: {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#52705a]">
        <UiIcon name={icon} className="h-4 w-4" />
      </span>
      <span className="mt-3 block text-[9px] font-semibold uppercase tracking-wide text-[#7b847d]">
        {label}
      </span>
      <span className="mt-1 block text-xs font-semibold text-[#20352a]">
        {value}
      </span>
    </>
  );
  const classes =
    "min-h-[112px] rounded-[18px] bg-[#f7f5ef] p-3 text-left transition hover:bg-[#f1efe8]";
  return href ? (
    <Link href={href} className={classes}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export function ProfileContact({
  label,
  contact,
  icon,
}: {
  label: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    company: string;
    role: string;
    phone: string;
  };
  icon: IconName;
}) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
        <UiIcon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-semibold uppercase tracking-wide text-[#7b847d]">
          {label}
        </span>
        <span className="mt-1 block truncate text-xs font-semibold">
          {contact ? healthContactName(contact) : "Not linked"}
        </span>
        {contact?.phone ? (
          <span className="mt-0.5 block text-[10px] text-[#667068]">
            {contact.phone}
          </span>
        ) : null}
      </span>
      <UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" />
    </>
  );
  const classes =
    "flex min-h-[68px] items-center gap-3 rounded-[18px] bg-[#f7f5ef] p-3";
  return contact ? (
    <Link href={`/office/contacts/${contact.id}`} className={classes}>
      {content}
    </Link>
  ) : (
    <Link href="/office/contacts/new" className={classes}>
      {content}
    </Link>
  );
}

export function ProfileListHeader({
  eyebrow,
  title,
  href,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f8e72]">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-serif text-2xl">{title}</h2>
      </div>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#52705a]"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

export function ProfileMiniEmpty({
  icon,
  text,
  href,
  label,
}: {
  icon: IconName;
  text: string;
  href: string;
  label: string;
}) {
  return (
    <div className="mt-4 rounded-[18px] bg-[#f7f5ef] p-4 text-center">
      <UiIcon name={icon} className="mx-auto h-5 w-5 text-[#6f8e72]" />
      <p className="mt-2 text-xs text-[#667068]">{text}</p>
      <Link
        href={href}
        className="mt-3 inline-flex min-h-11 items-center rounded-full bg-white px-3 text-[10px] font-semibold text-[#52705a] shadow-sm"
      >
        {label}
      </Link>
    </div>
  );
}
