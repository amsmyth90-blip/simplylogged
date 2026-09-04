"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  FamilyStoryPhotoStep,
  FamilyStoryReviewStep,
  FamilyStorySaved,
  FamilyStoryTextStep
} from "@/components/attic/FamilyStorySteps";
import {
  MAX_STORY_IMAGES,
  emptyFamilyStoryDraft,
  parseStoryTags,
  prepareFamilyStoryImages,
  type FamilyStoryDraft
} from "@/components/attic/family-story-model";

type StoryStep = 1 | 2 | 3;

export function FamilyStoryBuilderWorkspace() {
  const { repositoryMode, updateState } = useDiaryDockData();
  const [step, setStep] = useState<StoryStep>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [draft, setDraft] = useState<FamilyStoryDraft>(emptyFamilyStoryDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedStoryId, setSavedStoryId] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const tags = useMemo(() => parseStoryTags(draft.tagsInput), [draft.tagsInput]);
  const canSave = draft.title.trim().length > 1 && draft.storyText.trim().length > 8;

  const changeDraft = (field: keyof FamilyStoryDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const addImages = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const images = selected.filter((file) => file.type.startsWith("image/"));
    setError(selected.length && !images.length ? "Choose one or more photo images for this story." : "");
    setFiles((current) => [...current, ...images].slice(0, MAX_STORY_IMAGES));
    event.currentTarget.value = "";
  };

  const resetStory = () => {
    setFiles([]);
    setDraft(emptyFamilyStoryDraft);
    setSavedStoryId(null);
    setStep(1);
  };

  async function saveStory() {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const storyId = crypto.randomUUID();
    try {
      const imageDocuments = await prepareFamilyStoryImages({
        files,
        now,
        repositoryMode,
        title: draft.title.trim()
      });
      updateState((current) => {
        const roomDocuments = imageDocuments.map((document) => ({
          id: `attic-${document.id}`,
          title: document.title,
          kind: document.kind,
          size: document.size,
          updated: document.updated
        }));
        return {
          ...current,
          familyStories: [{
            id: storyId,
            title: draft.title.trim(),
            storyText: draft.storyText.trim(),
            people: draft.people.trim(),
            place: draft.place.trim(),
            dateLabel: draft.dateLabel.trim(),
            tags,
            images: imageDocuments.map((document) => ({
              documentId: document.id,
              fileName: document.originalFileName ?? document.title
            })),
            createdAt: now,
            updatedAt: now
          }, ...current.familyStories],
          vaultDocuments: [...imageDocuments, ...current.vaultDocuments],
          roomDocuments: {
            ...current.roomDocuments,
            attic: [...roomDocuments, ...(current.roomDocuments.attic ?? [])]
          },
          roomActivity: {
            ...current.roomActivity,
            attic: [{
              id: `family-story-${storyId}`,
              text: `Created family story "${draft.title.trim()}" with ${files.length} photo${files.length === 1 ? "" : "s"}`,
              when: "Just now",
              by: "You"
            }, ...(current.roomActivity.attic ?? [])]
          }
        };
      });
      setSavedStoryId(storyId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save this family story right now.");
    } finally {
      setSaving(false);
    }
  }

  if (savedStoryId) return <FamilyStorySaved onReset={resetStory} />;

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
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f8e72]">Attic · Family History</p>
            <h1 className="font-serif text-3xl leading-tight tracking-tight">Create a family story</h1>
          </div>
        </header>
        <nav aria-label="Story steps" className="mt-6 grid grid-cols-3 gap-2">
          {([{ id: 1, label: "Photos" }, { id: 2, label: "Story" }, { id: 3, label: "Review" }] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id)}
              className={`min-h-11 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${step === item.id ? "border-[#315443]/15 bg-[#315443] text-white" : "border-[#20352a]/[0.07] bg-[#fffdf8]/80 text-[#52705a]"}`}
            >
              {item.id}. {item.label}
            </button>
          ))}
        </nav>
        {step === 1 ? <FamilyStoryPhotoStep onAdd={addImages} onContinue={() => setStep(2)} onRemove={(index) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} previewUrls={previewUrls} /> : null}
        {step === 2 ? <FamilyStoryTextStep canSave={canSave} draft={draft} onChange={changeDraft} onReview={() => setStep(3)} /> : null}
        {step === 3 ? <FamilyStoryReviewStep canSave={canSave} draft={draft} error={error} fileCount={files.length} onBack={() => setStep(2)} onSave={() => void saveStory()} saving={saving} tags={tags} /> : null}
      </div>
    </main>
  );
}
