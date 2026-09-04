import Image from "next/image";
import Link from "next/link";
import type { ChangeEvent } from "react";

import { UiIcon } from "@/components/UiIcon";
import { FamilyStoryInput as StoryInput } from "@/components/attic/FamilyStoryInput";
import {
  MAX_STORY_IMAGES,
  type FamilyStoryDraft,
} from "@/components/attic/family-story-model";

type DraftChange = (field: keyof FamilyStoryDraft, value: string) => void;

export function FamilyStorySaved({ onReset }: { onReset: () => void }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f2ea] pb-32 text-[#20352a]">
      <div className="mx-auto flex min-h-[calc(100svh-8rem)] w-full max-w-[680px] flex-col justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <section className="rounded-[30px] border border-[#20352a]/[0.07] bg-[#fffdf8]/95 p-6 text-center shadow-[0_24px_55px_-40px_rgba(32,53,42,0.55)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8eee3] text-[#52705a]">
            <UiIcon name="check" className="h-6 w-6" />
          </span>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
            Saved to the Attic
          </p>
          <h1 className="mt-2 font-serif text-3xl">
            Your family story is tucked away
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#667068]">
            The story and linked photos have been saved together in Family
            History.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/attic/family-history"
              className="inline-flex min-h-12 items-center justify-center rounded-[18px] bg-[#315443] px-5 text-sm font-semibold text-white"
            >
              Back to Family History
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-[#20352a]/10 bg-white px-5 text-sm font-semibold text-[#315443]"
            >
              Add another story
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export function FamilyStoryPhotoStep({
  onAdd,
  onContinue,
  onRemove,
  previewUrls,
}: {
  onAdd: (event: ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void;
  onRemove: (index: number) => void;
  previewUrls: string[];
}) {
  return (
    <section className="mt-5 rounded-[28px] border border-[#20352a]/[0.07] bg-[#fffdf8]/95 p-5 shadow-[0_24px_55px_-40px_rgba(32,53,42,0.55)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
        Step one
      </p>
      <h2 className="mt-1 font-serif text-2xl">Add the photos first</h2>
      <p className="mt-2 text-sm leading-6 text-[#667068]">
        Upload one or more images for the memory. You can write the story next,
        while the pictures are still in front of you.
      </p>
      <label className="mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[#6f8e72]/45 bg-[#f7f5ef] px-4 py-6 text-center transition hover:bg-[#eef2e9]">
        <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#e8eee3] text-[#52705a]">
          <UiIcon name="camera" className="h-6 w-6" />
        </span>
        <span className="mt-3 text-sm font-semibold">Choose photos</span>
        <span className="mt-1 text-xs leading-5 text-[#667068]">
          Up to {MAX_STORY_IMAGES} images · JPG, PNG, WebP or HEIC
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={onAdd}
        />
      </label>
      {previewUrls.length ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {previewUrls.map((url, index) => (
            <div
              key={url}
              className="group relative overflow-hidden rounded-[18px] bg-[#e8eee3]"
            >
              <Image
                src={url}
                alt={`Family story upload ${index + 1}`}
                width={320}
                height={400}
                unoptimized
                className="aspect-[4/5] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#20352a] shadow-sm"
                aria-label={`Remove image ${index + 1}`}
              >
                <UiIcon name="plus" className="h-4 w-4 rotate-45" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onContinue}
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#315443] px-5 text-sm font-semibold text-white"
      >
        Continue to story
        <UiIcon name="chevron-right" className="h-4 w-4" />
      </button>
    </section>
  );
}

export function FamilyStoryTextStep({
  canSave,
  draft,
  onChange,
  onReview,
}: {
  canSave: boolean;
  draft: FamilyStoryDraft;
  onChange: DraftChange;
  onReview: () => void;
}) {
  return (
    <section className="mt-5 rounded-[28px] border border-[#20352a]/[0.07] bg-[#fffdf8]/95 p-5 shadow-[0_24px_55px_-40px_rgba(32,53,42,0.55)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
        Step two
      </p>
      <h2 className="mt-1 font-serif text-2xl">
        Write what should be remembered
      </h2>
      <div className="mt-5 space-y-4">
        <StoryInput
          label="Story title"
          value={draft.title}
          placeholder="e.g. Granny's kitchen table"
          onChange={(value) => onChange("title", value)}
        />
        <label className="block">
          <span className="text-xs font-semibold text-[#33483b]">
            The story
          </span>
          <textarea
            value={draft.storyText}
            onChange={(event) => onChange("storyText", event.target.value)}
            placeholder="Write the memory in your own words. Who was there? What happened? Why does it matter?"
            rows={8}
            className="mt-2 w-full rounded-[22px] border border-[#20352a]/10 bg-[#f7f5ef] px-4 py-3 text-sm leading-6 outline-none focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <StoryInput
            label="People"
            value={draft.people}
            placeholder="Add the people in this story..."
            onChange={(value) => onChange("people", value)}
          />
          <StoryInput
            label="Place"
            value={draft.place}
            placeholder="Where it happened"
            onChange={(value) => onChange("place", value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <StoryInput
            label="Date or era"
            value={draft.dateLabel}
            placeholder="Summer 1998, Christmas..."
            onChange={(value) => onChange("dateLabel", value)}
          />
          <StoryInput
            label="Tags"
            value={draft.tagsInput}
            placeholder="holiday, recipe, grandparents"
            onChange={(value) => onChange("tagsInput", value)}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onReview}
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#315443] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9aa79a]"
        disabled={!canSave}
      >
        Review story
        <UiIcon name="chevron-right" className="h-4 w-4" />
      </button>
    </section>
  );
}

export function FamilyStoryReviewStep({
  canSave,
  draft,
  error,
  fileCount,
  onBack,
  onSave,
  saving,
  tags,
}: {
  canSave: boolean;
  draft: FamilyStoryDraft;
  error: string;
  fileCount: number;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  tags: string[];
}) {
  return (
    <section className="mt-5 rounded-[28px] border border-[#20352a]/[0.07] bg-[#fffdf8]/95 p-5 shadow-[0_24px_55px_-40px_rgba(32,53,42,0.55)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
        Final review
      </p>
      <h2 className="mt-1 font-serif text-2xl">
        {draft.title.trim() || "Untitled family story"}
      </h2>
      <p className="mt-3 whitespace-pre-wrap rounded-[22px] bg-[#f7f5ef] p-4 text-sm leading-6 text-[#33483b]">
        {draft.storyText.trim() || "No story text added yet."}
      </p>
      <div className="mt-4 grid gap-2 text-xs text-[#667068] sm:grid-cols-2">
        <span className="rounded-full bg-[#e8eee3] px-3 py-2">
          Photos: {fileCount}
        </span>
        <span className="rounded-full bg-[#e8eee3] px-3 py-2">
          People: {draft.people.trim() || "Not added"}
        </span>
        <span className="rounded-full bg-[#e8eee3] px-3 py-2">
          Place: {draft.place.trim() || "Not added"}
        </span>
        <span className="rounded-full bg-[#e8eee3] px-3 py-2">
          Date: {draft.dateLabel.trim() || "Not added"}
        </span>
      </div>
      {tags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-[#52705a]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-[16px] bg-[#f4e9e5] px-4 py-3 text-sm text-[#8a5149]">
          {error}
        </p>
      ) : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 rounded-[18px] border border-[#20352a]/10 bg-white px-5 text-sm font-semibold text-[#315443]"
        >
          Edit story
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || saving}
          className="min-h-12 rounded-[18px] bg-[#315443] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9aa79a]"
        >
          {saving ? "Saving..." : "Save family story"}
        </button>
      </div>
    </section>
  );
}
