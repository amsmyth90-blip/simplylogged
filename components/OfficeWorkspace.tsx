"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { DesktopSpaceLanding } from "@/components/DesktopSpaceLanding";
import { ModalShell } from "@/components/ModalShell";
import { RoomSceneHeader, roomImageLabelClass } from "@/components/RoomSceneChrome";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { WillsWishesRecord } from "@/lib/diarydock-data";
import type { VaultDocument } from "@/lib/mock-data";

type OfficePanel = "inbox" | "admin" | "documents" | null;
type OfficeDrawerId = "identity" | "wishes" | "home" | "finance";

type OfficeWorkspaceProps = {
  initialDrawer?: OfficeDrawerId;
};

type OfficeHotspotProps = {
  label: string;
  position: { left: string; top: string };
  onClick?: () => void;
  href?: string;
};

function OfficeHotspot({
  label,
  position,
  onClick,
  href,
}: OfficeHotspotProps) {
  const visibleLabel = href === "/office/bills" ? "Household bills" : label;
  const className =
    `group absolute z-20 flex min-h-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${roomImageLabelClass}`;

  return href ? (
    <Link
      href={href}
      aria-label={visibleLabel}
      className={className}
      style={position}
    >
      {visibleLabel}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={className}
      style={position}
    >
      {visibleLabel}
    </button>
  );
}

const officeDrawers: Array<{
  id: OfficeDrawerId;
  label: string;
  detail: string;
  icon: IconName;
  tone: string;
}> = [
  {
    id: "identity",
    label: "Personal ID",
    detail: "Passports, licences and certificates",
    icon: "file",
    tone: "bg-[#f2dfd7] text-[#8a5145]",
  },
  {
    id: "wishes",
    label: "Wills & wishes",
    detail: "Wills, funeral wishes and POA",
    icon: "briefcase",
    tone: "bg-[#eadfca] text-[#746144]",
  },
  {
    id: "home",
    label: "Home & insurance",
    detail: "Home insurance, deeds and mortgage",
    icon: "home",
    tone: "bg-[#e2eadc] text-[#5d7353]",
  },
  {
    id: "finance",
    label: "Bills & finances",
    detail: "Household bills, banking, tax and pensions",
    icon: "chart",
    tone: "bg-[#dfe8ee] text-[#506b7a]",
  },
];

function documentBelongsInDrawer(
  document: VaultDocument,
  drawer: OfficeDrawerId,
) {
  const text =
    `${document.title} ${document.category} ${document.roomName ?? ""}`.toLowerCase();
  const roomId = document.roomId?.toLowerCase();

  // A document explicitly assigned to another room always stays there.
  if (roomId && roomId !== "office") return false;

  // Keep clearly room-specific records out of the Office even if they were
  // previously filed under a broad Vault category such as insurance.
  if (
    document.category === "Health & Medical" ||
    document.category === "Memories" ||
    /\b(car|vehicle|motor|mot|pet|veterinary|vaccination|travel|flight|boarding pass|recipe|school|garden)\b/.test(
      text,
    )
  ) {
    return false;
  }

  if (drawer === "identity") {
    return (
      document.category === "Identity" ||
      /passport|identity|birth certificate|marriage certificate|driving licence/.test(
        text,
      )
    );
  }
  if (drawer === "wishes") {
    return /\bwills?\b|letters? of wishes|funeral wishes|power of attorney|executor|probate/.test(
      text,
    );
  }
  if (drawer === "home") {
    return (
      document.category === "Home & Property" ||
      /home insurance|house insurance|buildings insurance|contents insurance|house deed|property deed|mortgage/.test(
        text,
      )
    );
  }
  if (/mortgage/.test(text)) return false;
  return (
    document.category === "Finance" ||
    /bill|invoice|statement|council tax|utility|electric|gas|water|broadband|phone|bank|pension|tax|savings|investment|payslip/.test(
      text,
    )
  );
}

type WishesStep = "about" | "will" | "funeral" | "messages" | "access";

const wishesSteps: Array<{
  id: WishesStep;
  label: string;
  detail: string;
  icon: IconName;
}> = [
  { id: "about", label: "About me", detail: "Personal details", icon: "users" },
  {
    id: "will",
    label: "My will",
    detail: "Executors & solicitor",
    icon: "briefcase",
  },
  {
    id: "funeral",
    label: "Funeral wishes",
    detail: "Service preferences",
    icon: "heart",
  },
  {
    id: "messages",
    label: "Messages & wishes",
    detail: "Personal journal",
    icon: "file",
  },
  {
    id: "access",
    label: "Access & review",
    detail: "Trusted people",
    icon: "lock",
  },
];

function wishesStepComplete(step: WishesStep, record: WillsWishesRecord) {
  if (step === "about")
    return Boolean(record.fullName.trim() && record.address.trim());
  if (step === "will")
    return Boolean(record.willStatus.trim() && record.executorName.trim());
  if (step === "funeral")
    return Boolean(
      record.funeralPreference.trim() && record.funeralDetails.trim(),
    );
  if (step === "messages") return Boolean(record.personalMessage.trim());
  return Boolean(record.trustedPeople.trim() && record.reviewFrequency.trim());
}

function OfficeWishesJourney({
  record,
  documents,
  onChange,
  onSave,
}: {
  record: WillsWishesRecord;
  documents: VaultDocument[];
  onChange: (next: WillsWishesRecord) => void;
  onSave: () => void;
}) {
  const [activeStep, setActiveStep] = useState<WishesStep>("about");
  const [saved, setSaved] = useState(false);
  const completedCount = wishesSteps.filter((step) =>
    wishesStepComplete(step.id, record),
  ).length;
  const activeIndex = wishesSteps.findIndex((step) => step.id === activeStep);
  const updateField = (field: keyof WillsWishesRecord, value: string) => {
    onChange({ ...record, [field]: value });
    setSaved(false);
  };
  const save = () => {
    onSave();
    setSaved(true);
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border border-[#d7dfd1] bg-[#edf3e9]/80 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink">Your guided record</p>
            <p className="mt-0.5 text-[11px] text-ink/50">
              {completedCount} of {wishesSteps.length} sections complete
            </p>
          </div>
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#5b7054]">
            {Math.round((completedCount / wishesSteps.length) * 100)}%
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
          <div
            className="h-full rounded-full bg-[#6c8265] transition-all"
            style={{ width: `${(completedCount / wishesSteps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {wishesSteps.map((step, index) => {
          const complete = wishesStepComplete(step.id, record);
          const active = activeStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={`rounded-2xl border px-2.5 py-3 text-left transition ${
                active
                  ? "border-[#6f8268] bg-[#e4ecdf] shadow-sm"
                  : "border-white/90 bg-white/72 hover:bg-white"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <UiIcon name={step.icon} className="h-4 w-4 text-[#607457]" />
                {complete ? (
                  <UiIcon name="check" className="h-3.5 w-3.5 text-[#607457]" />
                ) : (
                  <span className="text-[9px] text-ink/35">{index + 1}</span>
                )}
              </span>
              <span className="mt-2 block text-[11px] font-semibold text-ink">
                {step.label}
              </span>
              <span className="mt-0.5 hidden text-[9px] text-ink/42 sm:block">
                {step.detail}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-[24px] border border-white/90 bg-white/86 p-4 shadow-sm">
        {activeStep === "about" ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-ink">About me</p>
              <p className="mt-1 text-xs text-ink/50">
                The personal details that identify this record.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-ink/65">
                Full name
                <input
                  value={record.fullName}
                  onChange={(event) =>
                    updateField("fullName", event.target.value)
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
                />
              </label>
              <label className="text-xs font-semibold text-ink/65">
                Date of birth
                <input
                  type="date"
                  value={record.dateOfBirth}
                  onChange={(event) =>
                    updateField("dateOfBirth", event.target.value)
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-ink/65">
              Home address
              <textarea
                rows={3}
                value={record.address}
                onChange={(event) => updateField("address", event.target.value)}
                className="mt-1.5 w-full resize-none rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
              />
            </label>
          </div>
        ) : null}

        {activeStep === "will" ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-ink">My will</p>
              <p className="mt-1 text-xs text-ink/50">
                Record where the legal will is held and who should act.
              </p>
            </div>
            <label className="block text-xs font-semibold text-ink/65">
              Will status
              <select
                value={record.willStatus}
                onChange={(event) =>
                  updateField("willStatus", event.target.value)
                }
                className="mt-1.5 w-full rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
              >
                <option>Not started</option>
                <option>Draft in progress</option>
                <option>Signed original stored at home</option>
                <option>Signed original stored with solicitor</option>
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-ink/65">
                Primary executor
                <input
                  value={record.executorName}
                  onChange={(event) =>
                    updateField("executorName", event.target.value)
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
                />
              </label>
              <label className="text-xs font-semibold text-ink/65">
                Solicitor
                <input
                  value={record.solicitorName}
                  onChange={(event) =>
                    updateField("solicitorName", event.target.value)
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-ink/65">
              Where is the original held?
              <input
                value={record.originalWillLocation}
                onChange={(event) =>
                  updateField("originalWillLocation", event.target.value)
                }
                className="mt-1.5 w-full rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
              />
            </label>
          </div>
        ) : null}

        {activeStep === "funeral" ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-ink">Funeral wishes</p>
              <p className="mt-1 text-xs text-ink/50">
                Guidance for your family; these wishes can be changed at any
                time.
              </p>
            </div>
            <label className="block text-xs font-semibold text-ink/65">
              Preference
              <select
                value={record.funeralPreference}
                onChange={(event) =>
                  updateField("funeralPreference", event.target.value)
                }
                className="mt-1.5 w-full rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
              >
                <option value="">Not decided</option>
                <option>Burial</option>
                <option>Cremation</option>
                <option>Natural burial</option>
                <option>Let my family decide</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-ink/65">
              Service and personal preferences
              <textarea
                rows={4}
                value={record.funeralDetails}
                onChange={(event) =>
                  updateField("funeralDetails", event.target.value)
                }
                className="mt-1.5 w-full resize-none rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal leading-6 text-ink outline-none focus:border-[#758a6f]"
                placeholder="Location, atmosphere, flowers, dress, people to involve…"
              />
            </label>
            <label className="block text-xs font-semibold text-ink/65">
              Music and readings
              <textarea
                rows={3}
                value={record.musicAndReadings}
                onChange={(event) =>
                  updateField("musicAndReadings", event.target.value)
                }
                className="mt-1.5 w-full resize-none rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal leading-6 text-ink outline-none focus:border-[#758a6f]"
              />
            </label>
          </div>
        ) : null}

        {activeStep === "messages" ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                My wishes journal
              </p>
              <p className="mt-1 text-xs text-ink/50">
                A warmer place for personal messages and practical wishes.
              </p>
            </div>
            <div className="rounded-2xl border border-[#e2d8c8] bg-[repeating-linear-gradient(180deg,#fffdf8_0px,#fffdf8_31px,#ece3d6_32px)] p-4">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a694d]">
                A note to my family
                <textarea
                  rows={6}
                  value={record.personalMessage}
                  onChange={(event) =>
                    updateField("personalMessage", event.target.value)
                  }
                  className="mt-2 w-full resize-none bg-transparent text-sm font-normal leading-8 text-ink outline-none"
                  placeholder="Write a message in your own words…"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-ink/65">
                Special belongings
                <textarea
                  rows={3}
                  value={record.specialBelongings}
                  onChange={(event) =>
                    updateField("specialBelongings", event.target.value)
                  }
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
                  placeholder="Items and who should receive them…"
                />
              </label>
              <label className="text-xs font-semibold text-ink/65">
                Pet care wishes
                <textarea
                  rows={3}
                  value={record.petCareWishes}
                  onChange={(event) =>
                    updateField("petCareWishes", event.target.value)
                  }
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
                />
              </label>
            </div>
          </div>
        ) : null}

        {activeStep === "access" ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-ink">Access & review</p>
              <p className="mt-1 text-xs text-ink/50">
                Choose who knows this record exists and when to check it again.
              </p>
            </div>
            <label className="block text-xs font-semibold text-ink/65">
              Trusted people
              <input
                value={record.trustedPeople}
                onChange={(event) =>
                  updateField("trustedPeople", event.target.value)
                }
                className="mt-1.5 w-full rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
                placeholder="Names separated by commas"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-ink/65">
                Review frequency
                <select
                  value={record.reviewFrequency}
                  onChange={(event) =>
                    updateField("reviewFrequency", event.target.value)
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
                >
                  <option>Every 6 months</option>
                  <option>Every 12 months</option>
                  <option>Every 2 years</option>
                  <option>After a major life change</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-ink/65">
                Last reviewed
                <input
                  value={record.lastReviewed}
                  onChange={(event) =>
                    updateField("lastReviewed", event.target.value)
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#dad8cf] bg-[#faf9f5] px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-[#758a6f]"
                />
              </label>
            </div>
            <div className="rounded-2xl border border-[#d7dfd1] bg-[#edf3e9]/75 p-3 text-xs leading-5 text-ink/58">
              <UiIcon
                name="lock"
                className="mr-2 inline h-3.5 w-3.5 text-[#607457]"
              />
              Private by default. Sharing this record should always be an
              explicit choice.
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e6e1d8] pt-4">
          <button
            type="button"
            disabled={activeIndex === 0}
            onClick={() =>
              setActiveStep(wishesSteps[Math.max(0, activeIndex - 1)].id)
            }
            className="rounded-xl border border-[#d8d5cc] bg-[#f8f6f0] px-3 py-2 text-xs font-semibold text-ink/60 disabled:opacity-35"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            {saved ? (
              <span className="text-[11px] font-semibold text-[#607457]">
                Saved
              </span>
            ) : null}
            <button
              type="button"
              onClick={save}
              className="rounded-xl bg-[#26382f] px-3.5 py-2 text-xs font-semibold text-white"
            >
              Save details
            </button>
            {activeIndex < wishesSteps.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep(wishesSteps[activeIndex + 1].id)}
                className="rounded-xl border border-[#d8d5cc] bg-[#f8f6f0] px-3 py-2 text-xs font-semibold text-ink/60"
              >
                Next
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">
              Signed documents & attachments
            </p>
            <p className="mt-1 text-[11px] text-ink/48">
              Legal originals and supporting files remain securely stored in All
              Files.
            </p>
          </div>
          <Link
            href="/capture?room=office"
            className="shrink-0 rounded-full border border-[#d8d5cc] bg-white/80 px-3 py-2 text-[10px] font-semibold text-ink/65"
          >
            Use Scan
          </Link>
        </div>
        <div className="mt-2.5 space-y-2">
          {documents.map((document) => (
            <Link
              key={document.id}
              href={`/document/${document.id}?from=office`}
              className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/90 p-3 shadow-sm transition hover:bg-white"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eadfca] text-[#746144]">
                <UiIcon name="file" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {document.title}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-ink/48">
                  {document.kind} · {document.updated}
                </span>
              </span>
              <UiIcon
                name="chevron-right"
                className="h-4 w-4 shrink-0 text-ink/25"
              />
            </Link>
          ))}
        </div>
      </div>

      <p className="rounded-2xl border border-[#e4d8c6] bg-[#f5eddf]/70 px-3.5 py-3 text-[11px] leading-5 text-ink/52">
        DiaryDock organises wishes and document locations. It does not create a
        legally valid will or replace professional legal advice.
      </p>
    </div>
  );
}

function OfficeDocumentDashboard({
  open,
  drawer,
  documents,
  totalDocuments,
  query,
  onQueryChange,
  wishesRecord,
  onWishesChange,
  onSaveWishes,
  onClose,
}: {
  open: boolean;
  drawer: (typeof officeDrawers)[number] | null;
  documents: VaultDocument[];
  totalDocuments: number;
  query: string;
  onQueryChange: (value: string) => void;
  wishesRecord: WillsWishesRecord;
  onWishesChange: (next: WillsWishesRecord) => void;
  onSaveWishes: () => void;
  onClose: () => void;
}) {
  if (!open || !drawer) return null;

  const renewalCount = documents.filter((document) => document.dueDate).length;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#4f3f31] pb-[7.25rem]">
      <Image
        src="/images/office-interactive-v1.webp"
        alt=""
        fill
        unoptimized
        aria-hidden="true"
        className="fixed object-cover object-center"
        sizes="100vw"
      />
      <div className="fixed inset-0 bg-[linear-gradient(180deg,rgba(40,31,23,0.18),rgba(40,31,23,0.42))]" />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="office-document-title"
        className="relative mx-auto flex min-h-full w-full max-w-[34rem] flex-col px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]"
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-full border border-white/65 bg-white/72 px-3 py-2 text-xs font-semibold text-[#26342d] shadow-lg backdrop-blur-xl"
          >
            <UiIcon name="arrow-left" className="h-4 w-4" />
            Office
          </button>
          <span className="flex items-center gap-1.5 rounded-full border border-white/45 bg-[#28352f]/58 px-3 py-2 text-[10px] font-semibold text-white shadow-lg backdrop-blur-xl">
            <UiIcon name="lock" className="h-3.5 w-3.5" />
            Securely stored
          </span>
        </div>

        <div className="mt-[22vh] rounded-[30px] border border-white/80 bg-white/90 p-4 shadow-[0_28px_70px_rgba(31,25,19,0.34)] backdrop-blur-2xl sm:p-5">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${drawer.tone}`}
            >
              <UiIcon name={drawer.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#617455]">
                Office documents
              </p>
              <h2
                id="office-document-title"
                className="mt-1 text-xl font-semibold tracking-tight text-ink"
              >
                {drawer.label}
              </h2>
              <p className="mt-1 text-xs leading-5 text-ink/55">
                {drawer.detail}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white/70 text-ink/55"
            >
              <UiIcon name="plus" className="h-4 w-4 rotate-45" />
            </button>
          </div>

          {drawer.id === "wishes" ? (
            <OfficeWishesJourney
              record={wishesRecord}
              documents={documents}
              onChange={onWishesChange}
              onSave={onSaveWishes}
            />
          ) : (
            <>
              {drawer.id === "home" ? (
                <Link
                  href="/office/insurance"
                  className="mt-4 flex min-h-[72px] items-center gap-3 rounded-2xl border border-[#cbd9c4] bg-[#edf3e9] p-3.5 shadow-sm transition hover:bg-[#e6efe1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 text-[#5d7353]">
                    <UiIcon name="shield" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">
                      Open Insurance Hub
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ink/50">
                      Policies, renewals, claims and cover reviews
                    </span>
                  </span>
                  <UiIcon
                    name="chevron-right"
                    className="h-4 w-4 text-[#607455]"
                  />
                </Link>
              ) : null}
              {drawer.id === "finance" ? (
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  <Link
                    href="/office/bills"
                    className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-[#cbd9c4] bg-[#edf3e9] p-3.5 shadow-sm transition hover:bg-[#e6efe1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 text-[#5d7353]">
                      <UiIcon name="chart" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">
                        Household bills
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-ink/50">
                        Amounts, due dates and payments
                      </span>
                    </span>
                    <UiIcon
                      name="chevron-right"
                      className="h-4 w-4 text-[#607455]"
                    />
                  </Link>
                  <Link
                    href="/office/contracts"
                    className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-[#d8cfbb] bg-[#f3ecdf] p-3.5 shadow-sm transition hover:bg-[#eee4d4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d7a58]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 text-[#746144]">
                      <UiIcon name="briefcase" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">
                        Contracts & subscriptions
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-ink/50">
                        Renewals, prices and notice periods
                      </span>
                    </span>
                    <UiIcon
                      name="chevron-right"
                      className="h-4 w-4 text-[#746144]"
                    />
                  </Link>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#e7ede1] px-3 py-1.5 text-[10px] font-semibold text-[#58704f]">
                  {totalDocuments} document{totalDocuments === 1 ? "" : "s"}
                </span>
                {renewalCount ? (
                  <span className="rounded-full bg-[#f2ead6] px-3 py-1.5 text-[10px] font-semibold text-[#80683d]">
                    {renewalCount} renewal{renewalCount === 1 ? "" : "s"}{" "}
                    tracked
                  </span>
                ) : null}
              </div>

              <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/90 bg-white/90 px-4 py-3 shadow-sm">
                <UiIcon
                  name="search"
                  className="h-4 w-4 shrink-0 text-ink/35"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder={`Search ${drawer.label.toLowerCase()}`}
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/38"
                />
              </label>

              <div className="mt-3 space-y-2.5">
                {documents.length ? (
                  documents.map((document) => (
                    <Link
                      key={document.id}
                      href={`/document/${document.id}?from=office`}
                      className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/90 p-3 shadow-sm transition hover:bg-white"
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${drawer.tone}`}
                      >
                        <UiIcon name="file" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {document.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-ink/48">
                          {document.category} · {document.updated}
                        </span>
                      </span>
                      <UiIcon
                        name="chevron-right"
                        className="h-4 w-4 shrink-0 text-ink/25"
                      />
                    </Link>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-[#bdcbb4] bg-[#edf3e9]/78 p-6 text-center">
                    <UiIcon
                      name={query ? "search" : drawer.icon}
                      className="mx-auto h-5 w-5 text-[#607455]"
                    />
                    <p className="mt-3 text-sm font-semibold text-ink">
                      {query
                        ? "No matching documents"
                        : "No documents here yet"}
                    </p>
                    <p className="mt-1 text-xs text-ink/50">
                      {query
                        ? "Try a different search."
                        : "Use the main Scan button to add one."}
                    </p>
                  </div>
                )}
              </div>

              <Link
                href="/files"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white"
              >
                <UiIcon name="folder" className="h-4 w-4" />
                Open All Files
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export function OfficeWorkspace({ initialDrawer }: OfficeWorkspaceProps) {
  const { state, updateState } = useDiaryDockData();
  const [panel, setPanel] = useState<OfficePanel>(
    initialDrawer ? "documents" : null,
  );
  const [selectedDrawer, setSelectedDrawer] = useState<OfficeDrawerId | null>(
    initialDrawer ?? null,
  );
  const [drawerQuery, setDrawerQuery] = useState("");
  const [wishesDraft, setWishesDraft] = useState<WillsWishesRecord>(
    state.willsWishes,
  );

  useEffect(() => {
    setWishesDraft(state.willsWishes);
  }, [state.willsWishes]);

  const officeInbox = useMemo(
    () =>
      state.mailboxItems.filter(
        (item) =>
          item.routeStatus === "new" &&
          item.suggestedRoom?.toLowerCase() === "office",
      ),
    [state.mailboxItems],
  );
  const officeTasks = (state.roomTasks.office ?? []).filter(
    (task) => !task.done,
  );
  const officeReminders = state.reminders.filter(
    (reminder) => reminder.roomId === "office" && reminder.group !== "done",
  );
  const officeFiles = useMemo(
    () =>
      state.vaultDocuments.filter((document) =>
        officeDrawers.some((drawer) =>
          documentBelongsInDrawer(document, drawer.id),
        ),
      ),
    [state.vaultDocuments],
  );
  const drawerFiles = useMemo(
    () =>
      Object.fromEntries(
        officeDrawers.map((drawer) => [
          drawer.id,
          officeFiles.filter((document) =>
            documentBelongsInDrawer(document, drawer.id),
          ),
        ]),
      ) as Record<OfficeDrawerId, VaultDocument[]>,
    [officeFiles],
  );
  const adminCount = officeTasks.length + officeReminders.length;
  const selectedDrawerConfig =
    officeDrawers.find((drawer) => drawer.id === selectedDrawer) ?? null;
  const selectedDrawerFiles = selectedDrawer
    ? drawerFiles[selectedDrawer].filter((document) =>
        `${document.title} ${document.category}`
          .toLowerCase()
          .includes(drawerQuery.trim().toLowerCase()),
      )
    : [];

  const openDocumentDrawer = (drawer: OfficeDrawerId) => {
    setSelectedDrawer(drawer);
    setDrawerQuery("");
    setPanel("documents");
  };

  const saveWishes = () => {
    const nextRecord = { ...wishesDraft, updatedAt: "Just now" };
    setWishesDraft(nextRecord);
    updateState((current) => ({ ...current, willsWishes: nextRecord }));
  };

  const completeTask = (id: string) => {
    updateState((current) => ({
      ...current,
      roomTasks: {
        ...current.roomTasks,
        office: (current.roomTasks.office ?? []).map((task) =>
          task.id === id ? { ...task, done: true } : task,
        ),
      },
    }));
  };

  const completeReminder = (id: string) => {
    updateState((current) => ({
      ...current,
      reminders: current.reminders.map((reminder) =>
        reminder.id === id
          ? { ...reminder, group: "done", timeLabel: "Completed" }
          : reminder,
      ),
    }));
  };

  return (
    <>
      <DesktopSpaceLanding
        title="Documents"
        eyebrow="Office"
        description="Organise personal documents, household administration, bills, correspondence and future wishes."
        image="/images/office-interactive-v1.webp"
        imageAlt="A warm organised home office"
        imagePosition="center 45%"
        items={[
          { label: "Admin inbox", description: officeInbox.length ? `${officeInbox.length} incoming items` : "Incoming household paperwork", icon: "mail", onClick: () => setPanel("inbox") },
          { label: "Today’s admin", description: adminCount ? `${adminCount} tasks and reminders` : "Tasks and reminders", icon: "check", onClick: () => setPanel("admin") },
          { label: "Personal ID", description: "Passports, licences and certificates", icon: "file", onClick: () => openDocumentDrawer("identity") },
          { label: "Wills & wishes", description: "Wills, wishes and trusted access", icon: "heart", href: "/wills" },
          { label: "Home & insurance", description: "Home policies, deeds and mortgage", icon: "home", onClick: () => openDocumentDrawer("home") },
          { label: "Bills & contracts", description: "Household finances and regular commitments", icon: "chart", href: "/office/bills" },
        ]}
      />
      <main className="fixed inset-0 overflow-hidden bg-[#7c634c] lg:hidden">
        <Image
          src="/images/office-interactive-v1.webp"
          alt=""
          fill
          priority
          unoptimized
          aria-hidden="true"
          className="scale-110 object-cover opacity-45 blur-2xl"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#3c2e24]/15" />

        <section
          aria-label="Interactive Office"
          className="absolute left-1/2 top-1/2 h-[max(100svh,177.71vw)] w-[max(100vw,56.27svh)] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[#c9ae8d] shadow-[0_0_70px_rgba(38,28,19,0.4)]"
        >
          <Image
            src="/images/office-interactive-v1.webp"
            alt="A warm home office with a desk, incoming post tray, laptop, scanner, filing drawers and a secure safe"
            fill
            priority
            unoptimized
            className="object-cover object-center"
            sizes="(max-width: 544px) 100vw, 544px"
          />
          <div className="absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-[#33261c]/42 via-[#33261c]/8 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-[#2f251c]/46 via-[#2f251c]/10 to-transparent" />

          <OfficeHotspot
            label={
              officeInbox.length
                ? `Admin inbox · ${officeInbox.length}`
                : "Admin inbox"
            }
            position={{ left: "18%", top: "52%" }}
            onClick={() => setPanel("inbox")}
          />
          <OfficeHotspot
            label={
              adminCount ? `Today's admin · ${adminCount}` : "Today's admin"
            }
            position={{ left: "50%", top: "53%" }}
            onClick={() => setPanel("admin")}
          />
          <OfficeHotspot
            label={`Personal ID · ${drawerFiles.identity.length}`}
            position={{ left: "80%", top: "42%" }}
            onClick={() => openDocumentDrawer("identity")}
          />
          <OfficeHotspot
            label={`Wills & wishes · ${drawerFiles.wishes.length}`}
            position={{ left: "79%", top: "32%" }}
            href="/wills"
          />
          <OfficeHotspot
            label={`Home & insurance · ${drawerFiles.home.length}`}
            position={{ left: "78%", top: "56%" }}
            onClick={() => openDocumentDrawer("home")}
          />
          <OfficeHotspot
            label={`Bills & contracts · ${drawerFiles.finance.length}`}
            position={{ left: "25%", top: "61%" }}
            onClick={() => openDocumentDrawer("finance")}
          />

        </section>
        <RoomSceneHeader roomName="Office" eyebrow="Household administration" />
      </main>

      <ModalShell
        open={panel === "inbox"}
        title="Office inbox"
        subtitle="Incoming paperwork suggested for household administration."
        onClose={() => setPanel(null)}
        footer={
          <Link
            href="/intake"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white"
          >
            <UiIcon name="mail" className="h-4 w-4" />
            Open Mailbox
          </Link>
        }
      >
        <div className="space-y-3">
          <p className="rounded-2xl border border-[#d8c9ad] bg-[#f4ead7]/75 px-4 py-3 text-xs leading-5 text-ink/60">
            New post starts in the Mailbox. Use the main Scan button below to
            add paperwork; the Office helps you act on it before the final
            document is stored securely in All Files.
          </p>
          <Link
            href="/office/correspondence"
            className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-[#cbd9c4] bg-[#edf3e9] p-3.5 shadow-sm transition hover:bg-[#e6efe1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 text-[#5d7353]">
              <UiIcon name="mail" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">
                Important correspondence
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-ink/50">
                Letters, notices, deadlines and follow-ups
              </span>
            </span>
            <UiIcon name="chevron-right" className="h-4 w-4 text-[#607455]" />
          </Link>
          {officeInbox.length ? (
            officeInbox.map((item) => (
              <Link
                key={item.id}
                href="/intake"
                className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/72 p-3 shadow-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eadfca] text-[#746144]">
                  <UiIcon name="mail" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-ink/48">
                    {item.source} · {item.kind}
                  </span>
                </span>
                <span className="rounded-full bg-[#f2dfd7] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#8a5145]">
                  New
                </span>
              </Link>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[#bdcbb4] bg-[#edf3e9]/70 p-6 text-center">
              <UiIcon name="check" className="mx-auto h-5 w-5 text-[#607455]" />
              <p className="mt-3 text-sm font-semibold text-ink">
                No Office paperwork waiting
              </p>
              <p className="mt-1 text-xs text-ink/50">
                Anything newly scanned will appear in the Mailbox first.
              </p>
            </div>
          )}
        </div>
      </ModalShell>

      <ModalShell
        open={panel === "admin"}
        title="Today's admin"
        subtitle="Office actions and reminders—not calendar events."
        onClose={() => setPanel(null)}
        footer={
          <Link
            href="/reminders"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24372f] px-4 py-3 text-sm font-semibold text-white"
          >
            <UiIcon name="check" className="h-4 w-4" />
            Open all reminders
          </Link>
        }
      >
        <div className="space-y-3">
          <Link
            href="/office/contacts"
            className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-[#cbd9c4] bg-[#edf3e9] p-3.5 shadow-sm transition hover:bg-[#e6efe1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 text-[#5d7353]">
              <UiIcon name="users" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">
                Professional contacts
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-ink/50">
                Advisers, providers, meetings and linked records
              </span>
            </span>
            <UiIcon name="chevron-right" className="h-4 w-4 text-[#607455]" />
          </Link>
          {officeTasks.map((task) => (
            <article
              key={task.id}
              className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/72 p-3 shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e2eadc] text-[#5d7353]">
                <UiIcon name="briefcase" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {task.label}
                </p>
                <p className="mt-0.5 text-[11px] text-ink/48">
                  {task.due ?? "Office task"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => completeTask(task.id)}
                className="rounded-full bg-[#e4ecde] px-3 py-2 text-[10px] font-semibold text-[#52664a]"
              >
                Done
              </button>
            </article>
          ))}
          {officeReminders.map((reminder) => (
            <article
              key={reminder.id}
              className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/72 p-3 shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#dfe8ee] text-[#506b7a]">
                <UiIcon name="bell" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {reminder.title}
                </p>
                <p className="mt-0.5 text-[11px] text-ink/48">
                  {reminder.timeLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => completeReminder(reminder.id)}
                className="rounded-full bg-[#e4ecde] px-3 py-2 text-[10px] font-semibold text-[#52664a]"
              >
                Done
              </button>
            </article>
          ))}
          {!adminCount ? (
            <div className="rounded-3xl border border-dashed border-[#bdcbb4] bg-[#edf3e9]/70 p-6 text-center">
              <UiIcon name="check" className="mx-auto h-5 w-5 text-[#607455]" />
              <p className="mt-3 text-sm font-semibold text-ink">
                Office admin is up to date
              </p>
            </div>
          ) : null}
        </div>
      </ModalShell>

      <OfficeDocumentDashboard
        open={panel === "documents"}
        drawer={selectedDrawerConfig}
        documents={selectedDrawerFiles}
        totalDocuments={selectedDrawer ? drawerFiles[selectedDrawer].length : 0}
        query={drawerQuery}
        onQueryChange={setDrawerQuery}
        wishesRecord={wishesDraft}
        onWishesChange={setWishesDraft}
        onSaveWishes={saveWishes}
        onClose={() => {
          setPanel(null);
          setSelectedDrawer(null);
          setDrawerQuery("");
        }}
      />
    </>
  );
}
