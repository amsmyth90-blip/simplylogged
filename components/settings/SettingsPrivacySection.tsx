import Link from "next/link";

import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import type { ForwardingAddressState } from "@/components/settings/settings-model";

export function SettingsPrivacySection({
  emailedReviewCount,
  forwardingAddress,
  onCopy,
  onDelete,
  onExport,
  reviewCount,
}: {
  emailedReviewCount: number;
  forwardingAddress: ForwardingAddressState;
  onCopy: () => void;
  onDelete: () => void;
  onExport: () => void;
  reviewCount: number;
}) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Privacy, terms & data"
        hint="App Store readiness controls"
      />
      <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
        <PolicyLink
          href="/privacy"
          icon="shield"
          title="Privacy Policy"
          detail="How DiaryDock handles family and document data"
          tone="bg-sage/55 text-moss"
        />
        <PolicyLink
          href="/terms"
          icon="file"
          title="Terms of Use"
          detail="Early product terms and user responsibility"
          tone="bg-mist text-sky-700"
        />
        <PolicyLink
          href="/cookies"
          icon="gear"
          title="Cookie Policy"
          detail="Essential cookies and local storage"
          tone="bg-sage/45 text-moss"
        />
        <ActionRow
          icon="archive"
          title="Export my data"
          detail="Download a JSON copy of this DiaryDock estate"
          tone="bg-gold/30 text-yellow-800"
          onClick={onExport}
        />
        <div className="flex items-start gap-3.5 px-4 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/55 text-moss">
            <UiIcon name="mail" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Email forwarding</p>
            {forwardingAddress.status === "ready" ? (
              <>
                <p className="mt-0.5 break-all text-xs text-ink/55">
                  {forwardingAddress.address}
                </p>
                <p className="mt-1 text-xs leading-5 text-ink/45">
                  Forward emails with PDF or image attachments here and
                  DiaryDock will save them for review.
                </p>
              </>
            ) : (
              <p className="mt-0.5 text-xs leading-5 text-ink/50">
                {forwardingAddress.status === "loading"
                  ? "Checking your private forwarding address…"
                  : forwardingAddress.message}
              </p>
            )}
          </div>
          {forwardingAddress.status === "ready" ? (
            <button
              type="button"
              onClick={onCopy}
              className="shrink-0 rounded-full border border-ink/15 bg-white/80 px-3 py-1.5 text-xs font-semibold text-ink/65 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-moss"
            >
              {forwardingAddress.copied ? "Copied" : "Copy"}
            </button>
          ) : null}
        </div>
        <div className="px-4 py-4">
          <div className="rounded-[28px] border border-moss/10 bg-[linear-gradient(135deg,rgba(245,248,241,0.95),rgba(255,253,248,0.95))] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-moss shadow-[0_12px_28px_-24px_rgba(32,53,42,0.45)]">
                <UiIcon name="folder" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  Email documents to DiaryDock
                </p>
                <p className="mt-1 text-xs leading-5 text-ink/55">
                  Forward an email with a PDF or image attached. DiaryDock saves
                  the file privately and places it in the review inbox so you
                  can rename it, move it to the right room, and check any
                  important dates.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                {
                  title: "1. Forward",
                  detail: "Send a test PDF or photo to your DiaryDock address.",
                },
                {
                  title: "2. Review",
                  detail: "Open All Files and check anything marked Review.",
                },
                {
                  title: "3. File",
                  detail:
                    "Correct the title, room, category and dates before relying on it.",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl bg-white/72 px-3 py-3"
                >
                  <p className="text-xs font-semibold text-ink">{step.title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-ink/50">
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["PDF", "JPG", "PNG", "WebP", "HEIC"].map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-white/78 px-3 py-1 text-[11px] font-semibold text-ink/52"
                >
                  {type}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/review-inbox"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-white shadow-soft"
              >
                Review inbox
                <span className="rounded-full bg-white/18 px-2 py-0.5 text-[11px]">
                  {reviewCount}
                </span>
              </Link>
              <Link
                href="/support"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-moss/20 bg-white/70 px-4 text-sm font-semibold text-ink/65"
              >
                How it works
              </Link>
            </div>
            {emailedReviewCount ? (
              <p className="mt-3 rounded-2xl bg-white/72 px-3 py-2 text-xs leading-5 text-ink/55">
                {emailedReviewCount} emailed document
                {emailedReviewCount === 1 ? "" : "s"} waiting to be checked.
              </p>
            ) : null}
          </div>
        </div>
        <ActionRow
          icon="alert"
          title="Request account deletion"
          detail="Ask us to delete your account and data"
          tone="bg-blush text-orange-700"
          onClick={onDelete}
        />
        <PolicyLink
          href="/account-deletion"
          icon="file"
          title="Deletion information"
          detail="What is deleted and how long it takes"
          tone="bg-blush text-orange-700"
        />
      </div>
    </section>
  );
}

function PolicyLink({
  detail,
  href,
  icon,
  title,
  tone,
}: {
  detail: string;
  href: string;
  icon: Parameters<typeof UiIcon>[0]["name"];
  title: string;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/60"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}
      >
        <UiIcon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink/50">{detail}</span>
      </span>
      <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
    </Link>
  );
}

function ActionRow({
  detail,
  icon,
  onClick,
  title,
  tone,
}: {
  detail: string;
  icon: Parameters<typeof UiIcon>[0]["name"];
  onClick: () => void;
  title: string;
  tone: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-white/60"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}
      >
        <UiIcon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink/50">{detail}</span>
      </span>
      <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/30" />
    </button>
  );
}
