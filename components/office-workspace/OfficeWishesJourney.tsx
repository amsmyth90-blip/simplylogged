"use client";

import Link from "next/link";
import { useState } from "react";

import { UiIcon } from "@/components/UiIcon";
import {
  AboutWishesForm,
  AccessWishesForm,
  FuneralWishesForm,
  MessagesWishesForm,
  WillWishesForm,
} from "@/components/office-workspace/OfficeWishesForms";
import {
  wishesStepComplete,
  wishesSteps,
  type WishesStep,
} from "@/components/office-workspace/office-workspace-model";
import type { WillsWishesRecord } from "@/lib/diarydock-data";
import type { VaultDocument } from "@/lib/mock-data";

export function OfficeWishesJourney({
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
              className={`rounded-2xl border px-2.5 py-3 text-left transition ${active ? "border-[#6f8268] bg-[#e4ecdf] shadow-sm" : "border-white/90 bg-white/72 hover:bg-white"}`}
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
          <AboutWishesForm record={record} update={updateField} />
        ) : null}
        {activeStep === "will" ? (
          <WillWishesForm record={record} update={updateField} />
        ) : null}
        {activeStep === "funeral" ? (
          <FuneralWishesForm record={record} update={updateField} />
        ) : null}
        {activeStep === "messages" ? (
          <MessagesWishesForm record={record} update={updateField} />
        ) : null}
        {activeStep === "access" ? (
          <AccessWishesForm record={record} update={updateField} />
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
