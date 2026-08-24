"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { sanitizeDocumentFileName, uploadPrivateDocument } from "@/lib/document-storage";
import type { VaultDocument } from "@/lib/mock-data";
import { upsertStructuredDocument } from "@/lib/structured-data";

const MAX_STORY_IMAGES = 8;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function storyTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function FamilyStoryBuilderWorkspace() {
  const { repositoryMode, updateState } = useDiaryDockData();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [storyText, setStoryText] = useState("");
  const [people, setPeople] = useState("");
  const [place, setPlace] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedStoryId, setSavedStoryId] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const tags = useMemo(() => storyTags(tagsInput), [tagsInput]);
  const canSave = title.trim().length > 1 && storyText.trim().length > 8;

  const addImages = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const images = selected.filter((file) => file.type.startsWith("image/"));

    setError(selected.length && !images.length ? "Choose one or more photo images for this story." : "");
    setFiles((current) => [...current, ...images].slice(0, MAX_STORY_IMAGES));
    event.currentTarget.value = "";
  };

  const removeImage = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  async function saveStory() {
    if (!canSave || saving) return;

    setSaving(true);
    setError("");

    const now = new Date().toISOString();
    const storyId = crypto.randomUUID();
    const imageDocuments: VaultDocument[] = [];

    try {
      for (const file of files) {
        const documentId = crypto.randomUUID();
        const storedFile =
          repositoryMode === "supabase" ? await uploadPrivateDocument(file, documentId) : null;
        const safeTitle =
          sanitizeDocumentFileName(file.name.replace(/\.[^.]+$/, "")).replace(/-/g, " ") ||
          "family story photo";
        const document: VaultDocument = {
          id: documentId,
          title: `${title.trim()} - ${safeTitle}`,
          category: "Memories",
          kind: "Image",
          size: formatFileSize(file.size),
          updated: "Just now",
          storageBucket: storedFile?.bucket,
          storagePath: storedFile?.path,
          originalFileName: file.name,
          mimeType: file.type || "image/jpeg",
          roomId: "attic",
          roomName: "Attic",
          extractionSummary: `Photo linked to the family story "${title.trim()}".`,
          reviewStatus: "reviewed",
          reviewedAt: now,
        };

        imageDocuments.push(document);
        if (repositoryMode === "supabase") await upsertStructuredDocument(document);
      }

      updateState((current) => {
        const roomDocuments = imageDocuments.map((document) => ({
          id: `attic-${document.id}`,
          title: document.title,
          kind: document.kind,
          size: document.size,
          updated: document.updated,
        }));

        return {
          ...current,
          familyStories: [
            {
              id: storyId,
              title: title.trim(),
              storyText: storyText.trim(),
              people: people.trim(),
              place: place.trim(),
              dateLabel: dateLabel.trim(),
              tags,
              images: imageDocuments.map((document) => ({
                documentId: document.id,
                fileName: document.originalFileName ?? document.title,
              })),
              createdAt: now,
              updatedAt: now,
            },
            ...current.familyStories,
          ],
          vaultDocuments: [...imageDocuments, ...current.vaultDocuments],
          roomDocuments: {
            ...current.roomDocuments,
            attic: [...roomDocuments, ...(current.roomDocuments.attic ?? [])],
          },
          roomActivity: {
            ...current.roomActivity,
            attic: [
              {
                id: `family-story-${storyId}`,
                text: `Created family story "${title.trim()}" with ${files.length} photo${files.length === 1 ? "" : "s"}`,
                when: "Just now",
                by: "You",
              },
              ...(current.roomActivity.attic ?? []),
            ],
          },
        };
      });

      setSavedStoryId(storyId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save this family story right now.");
    } finally {
      setSaving(false);
    }
  }

  if (savedStoryId) {
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
            <h1 className="mt-2 font-serif text-3xl">Your family story is tucked away</h1>
            <p className="mt-3 text-sm leading-6 text-[#667068]">
              The story and linked photos have been saved together in Family History.
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
                onClick={() => {
                  setFiles([]);
                  setTitle("");
                  setStoryText("");
                  setPeople("");
                  setPlace("");
                  setDateLabel("");
                  setTagsInput("");
                  setSavedStoryId(null);
                  setStep(1);
                }}
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

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f2ea] pb-32 text-[#20352a]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <span className="absolute -right-16 top-12 h-64 w-64 rounded-full bg-[#dfe7d8]/55 blur-3xl" />
        <span className="absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-[#ead9c0]/45 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[680px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="flex items-center gap-3">
          <Link
            href="/attic/family-history"
            aria-label="Back to Family History"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#20352a]/10 bg-white/80 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            <UiIcon name="arrow-left" className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f8e72]">
              Attic · Family History
            </p>
            <h1 className="font-serif text-3xl leading-tight tracking-tight">Create a family story</h1>
          </div>
        </header>

        <nav aria-label="Story steps" className="mt-6 grid grid-cols-3 gap-2">
          {[
            { id: 1, label: "Photos" },
            { id: 2, label: "Story" },
            { id: 3, label: "Review" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id as 1 | 2 | 3)}
              className={`min-h-11 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${
                step === item.id
                  ? "border-[#315443]/15 bg-[#315443] text-white"
                  : "border-[#20352a]/[0.07] bg-[#fffdf8]/80 text-[#52705a]"
              }`}
            >
              {item.id}. {item.label}
            </button>
          ))}
        </nav>

        {step === 1 ? (
          <section className="mt-5 rounded-[28px] border border-[#20352a]/[0.07] bg-[#fffdf8]/95 p-5 shadow-[0_24px_55px_-40px_rgba(32,53,42,0.55)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
              Step one
            </p>
            <h2 className="mt-1 font-serif text-2xl">Add the photos first</h2>
            <p className="mt-2 text-sm leading-6 text-[#667068]">
              Upload one or more images for the memory. You can write the story next, while the
              pictures are still in front of you.
            </p>

            <label className="mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[#6f8e72]/45 bg-[#f7f5ef] px-4 py-6 text-center transition hover:bg-[#eef2e9]">
              <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#e8eee3] text-[#52705a]">
                <UiIcon name="camera" className="h-6 w-6" />
              </span>
              <span className="mt-3 text-sm font-semibold">Choose photos</span>
              <span className="mt-1 text-xs leading-5 text-[#667068]">
                Up to {MAX_STORY_IMAGES} images · JPG, PNG, WebP or HEIC
              </span>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={addImages} />
            </label>

            {previewUrls.length ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {previewUrls.map((url, index) => (
                  <div key={url} className="group relative overflow-hidden rounded-[18px] bg-[#e8eee3]">
                    <img src={url} alt={`Family story upload ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
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
              onClick={() => setStep(2)}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#315443] px-5 text-sm font-semibold text-white"
            >
              Continue to story
              <UiIcon name="chevron-right" className="h-4 w-4" />
            </button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="mt-5 rounded-[28px] border border-[#20352a]/[0.07] bg-[#fffdf8]/95 p-5 shadow-[0_24px_55px_-40px_rgba(32,53,42,0.55)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
              Step two
            </p>
            <h2 className="mt-1 font-serif text-2xl">Write what should be remembered</h2>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-[#33483b]">Story title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Granny's kitchen table"
                  className="mt-2 min-h-12 w-full rounded-[18px] border border-[#20352a]/10 bg-[#f7f5ef] px-4 text-sm outline-none focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#33483b]">The story</span>
                <textarea
                  value={storyText}
                  onChange={(event) => setStoryText(event.target.value)}
                  placeholder="Write the memory in your own words. Who was there? What happened? Why does it matter?"
                  rows={8}
                  className="mt-2 w-full rounded-[22px] border border-[#20352a]/10 bg-[#f7f5ef] px-4 py-3 text-sm leading-6 outline-none focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-[#33483b]">People</span>
                  <input
                    value={people}
                    onChange={(event) => setPeople(event.target.value)}
                    placeholder="Add the people in this story..."
                    className="mt-2 min-h-12 w-full rounded-[18px] border border-[#20352a]/10 bg-[#f7f5ef] px-4 text-sm outline-none focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#33483b]">Place</span>
                  <input
                    value={place}
                    onChange={(event) => setPlace(event.target.value)}
                    placeholder="Where it happened"
                    className="mt-2 min-h-12 w-full rounded-[18px] border border-[#20352a]/10 bg-[#f7f5ef] px-4 text-sm outline-none focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-[#33483b]">Date or era</span>
                  <input
                    value={dateLabel}
                    onChange={(event) => setDateLabel(event.target.value)}
                    placeholder="Summer 1998, Christmas..."
                    className="mt-2 min-h-12 w-full rounded-[18px] border border-[#20352a]/10 bg-[#f7f5ef] px-4 text-sm outline-none focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#33483b]">Tags</span>
                  <input
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    placeholder="holiday, recipe, grandparents"
                    className="mt-2 min-h-12 w-full rounded-[18px] border border-[#20352a]/10 bg-[#f7f5ef] px-4 text-sm outline-none focus:border-[#6f8e72] focus:ring-2 focus:ring-[#6f8e72]/20"
                  />
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#315443] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9aa79a]"
              disabled={!canSave}
            >
              Review story
              <UiIcon name="chevron-right" className="h-4 w-4" />
            </button>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="mt-5 rounded-[28px] border border-[#20352a]/[0.07] bg-[#fffdf8]/95 p-5 shadow-[0_24px_55px_-40px_rgba(32,53,42,0.55)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
              Final review
            </p>
            <h2 className="mt-1 font-serif text-2xl">{title.trim() || "Untitled family story"}</h2>
            <p className="mt-3 whitespace-pre-wrap rounded-[22px] bg-[#f7f5ef] p-4 text-sm leading-6 text-[#33483b]">
              {storyText.trim() || "No story text added yet."}
            </p>
            <div className="mt-4 grid gap-2 text-xs text-[#667068] sm:grid-cols-2">
              <span className="rounded-full bg-[#e8eee3] px-3 py-2">Photos: {files.length}</span>
              <span className="rounded-full bg-[#e8eee3] px-3 py-2">People: {people.trim() || "Not added"}</span>
              <span className="rounded-full bg-[#e8eee3] px-3 py-2">Place: {place.trim() || "Not added"}</span>
              <span className="rounded-full bg-[#e8eee3] px-3 py-2">Date: {dateLabel.trim() || "Not added"}</span>
            </div>
            {tags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-[#52705a]">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {error ? <p className="mt-4 rounded-[16px] bg-[#f4e9e5] px-4 py-3 text-sm text-[#8a5149]">{error}</p> : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-12 rounded-[18px] border border-[#20352a]/10 bg-white px-5 text-sm font-semibold text-[#315443]"
              >
                Edit story
              </button>
              <button
                type="button"
                onClick={() => void saveStory()}
                disabled={!canSave || saving}
                className="min-h-12 rounded-[18px] bg-[#315443] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9aa79a]"
              >
                {saving ? "Saving..." : "Save family story"}
              </button>
            </div>
          </section>
        ) : null}

      </div>
    </main>
  );
}
