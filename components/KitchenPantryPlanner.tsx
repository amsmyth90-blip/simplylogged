"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import type { KitchenListItem } from "@/lib/diarydock-data";
import type { PantryAnalysisResult } from "@/lib/pantry-analysis";

type PantryStage = "capture" | "checking" | "confirm" | "meals" | "shopping";

function normalise(value: string) {
  return value.trim().toLocaleLowerCase("en-GB");
}

function mergeKitchenItems(
  current: KitchenListItem[],
  names: string[],
  section: KitchenListItem["section"]
) {
  const existing = new Set(current.map(item => `${item.section}:${normalise(item.name)}`));
  const additions = names
    .filter(name => name.trim())
    .filter(name => !existing.has(`${section}:${normalise(name)}`))
    .map(name => ({
      id: crypto.randomUUID(),
      name: name.trim(),
      checked: section === "Pantry",
      section
    }));
  return [...current, ...additions];
}

function PantryHeader({ onBack }: { onBack?: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-3">
      {onBack ? (
        <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/75 text-slate-700 shadow-sm backdrop-blur-xl" aria-label="Back">
          <UiIcon name="arrow-left" className="h-4 w-4" />
        </button>
      ) : (
        <Link href="/room/kitchen" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/75 text-slate-700 shadow-sm backdrop-blur-xl" aria-label="Back to Kitchen">
          <UiIcon name="arrow-left" className="h-4 w-4" />
        </Link>
      )}
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#66805c]">Kitchen</p>
        <h1 className="truncate text-xl font-semibold tracking-tight">Pantry & shopping</h1>
      </div>
    </header>
  );
}

export function KitchenPantryPlanner() {
  const { repositoryMode, state, updateState } = useDiaryDockData();
  const [stage, setStage] = useState<PantryStage>("capture");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<PantryAnalysisResult | null>(null);
  const [confirmedIngredients, setConfirmedIngredients] = useState<Set<string>>(new Set());
  const [selectedMealIndex, setSelectedMealIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualItem, setManualItem] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const selectedMeal = analysis?.mealSuggestions[selectedMealIndex] ?? null;

  useEffect(() => {
    const urls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  const addPhotos = (files: File[]) => {
    const images = files.filter(file => file.type.startsWith("image/"));
    if (!images.length) return;
    setErrorMessage(null);
    setSelectedFiles(current => [...current, ...images].slice(0, 8));
  };

  const resetCapture = () => {
    setSelectedFiles([]);
    setAnalysis(null);
    setConfirmedIngredients(new Set());
    setSelectedMealIndex(0);
    setErrorMessage(null);
    setStage("capture");
  };

  const analysePhotos = async () => {
    if (!selectedFiles.length) return;
    setStage("checking");
    setErrorMessage(null);
    const body = new FormData();
    selectedFiles.forEach(file => body.append("files", file));

    try {
      const response = await fetch("/api/kitchen/analyse", { method: "POST", body });
      const payload = await response.json().catch(() => null) as { analysis?: PantryAnalysisResult; error?: string } | null;
      if (!response.ok || !payload?.analysis) {
        throw new Error(payload?.error || "The photos could not be checked.");
      }
      setAnalysis(payload.analysis);
      setConfirmedIngredients(new Set(payload.analysis.ingredients.map(item => normalise(item.name))));
      setSelectedMealIndex(0);
      setStage("confirm");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The photos could not be checked.");
      setStage("capture");
    }
  };

  const confirmStock = () => {
    if (!analysis) return;
    const names = analysis.ingredients
      .filter(item => confirmedIngredients.has(normalise(item.name)))
      .map(item => item.name);
    updateState(current => ({
      ...current,
      kitchenItems: mergeKitchenItems(current.kitchenItems, names, "Pantry")
    }));
    setStage("meals");
  };

  const addMissingToShopping = () => {
    if (!selectedMeal) return;
    updateState(current => ({
      ...current,
      kitchenItems: mergeKitchenItems(current.kitchenItems, selectedMeal.missingIngredients, "Shopping")
    }));
    setStage("shopping");
  };

  const addManualItem = () => {
    if (!manualItem.trim()) return;
    updateState(current => ({
      ...current,
      kitchenItems: mergeKitchenItems(current.kitchenItems, [manualItem], "Shopping")
    }));
    setManualItem("");
  };

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.98),transparent_34%),linear-gradient(165deg,#eef5ea_0%,#fbfcf9_50%,#e8f1e7_100%)] text-slate-900">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-[82px] pt-[max(12px,env(safe-area-inset-top))]">
        <PantryHeader onBack={stage === "capture" ? undefined : () => setStage(stage === "meals" ? "confirm" : stage === "shopping" ? "meals" : "capture")} />

        {stage === "capture" ? (
          <main className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
            <section className="relative shrink-0 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#243d35_0%,#3f6454_56%,#839d73_100%)] p-4 text-white shadow-[0_20px_45px_-28px_rgba(26,52,42,0.75)]">
              <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-xl" />
              <div className="relative flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/14 backdrop-blur-xl">
                  <UiIcon name="camera" className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">See what&apos;s in your kitchen</h2>
                  <p className="mt-1 text-[11px] leading-4 text-white/75">Photograph your fridge, freezer or cupboards. DiaryDock will organise what it finds and suggest meals.</p>
                </div>
              </div>
              <div className="relative mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => cameraInputRef.current?.click()} className="rounded-2xl bg-white px-3 py-2.5 text-xs font-semibold text-[#29483d] shadow-sm">Take photos</button>
                <button type="button" onClick={() => libraryInputRef.current?.click()} className="rounded-2xl border border-white/30 bg-white/10 px-3 py-2.5 text-xs font-semibold text-white backdrop-blur-xl">Choose photos</button>
              </div>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={event => { addPhotos(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
              <input ref={libraryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={event => { addPhotos(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
            </section>

            {selectedFiles.length ? (
              <section className="shrink-0 rounded-[22px] border border-white/90 bg-white/76 p-3 shadow-sm backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#69805f]">{selectedFiles.length} photo{selectedFiles.length === 1 ? "" : "s"} ready</p>
                  <button type="button" onClick={() => setSelectedFiles([])} className="text-[10px] font-semibold text-slate-500">Clear</button>
                </div>
                <div className="mt-2 flex gap-2 overflow-hidden">
                  {previewUrls.map((url, index) => <img key={url} src={url} alt={`Kitchen photo ${index + 1}`} className="h-14 w-14 rounded-xl object-cover" />)}
                  {selectedFiles.length < 8 ? <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#91a889] bg-[#f2f6ef] text-[#64805b]" aria-label="Add another photo"><UiIcon name="plus" className="h-4 w-4" /></button> : null}
                </div>
                <button type="button" onClick={analysePhotos} className="mt-3 h-10 w-full rounded-2xl bg-[#263b35] text-xs font-semibold text-white">Check my kitchen</button>
                {errorMessage ? <p className="mt-2 text-center text-[10px] text-red-600">{errorMessage}</p> : null}
              </section>
            ) : null}

            <section className="grid min-h-0 flex-1 grid-cols-2 gap-3">
              {(["Pantry", "Shopping"] as const).map(section => {
                const items = state.kitchenItems.filter(item => item.section === section);
                return (
                  <div key={section} className="min-h-0 overflow-hidden rounded-[24px] border border-white/90 bg-white/68 p-3 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold">{section}</h2>
                      <span className="rounded-full bg-[#e9f1e5] px-2 py-0.5 text-[8px] font-bold text-[#68805e]">{items.length}</span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {items.slice(0, 4).map(item => (
                        <button key={item.id} type="button" onClick={() => updateState(current => ({ ...current, kitchenItems: current.kitchenItems.map(entry => entry.id === item.id ? { ...entry, checked: !entry.checked } : entry) }))} className="flex w-full items-center gap-1.5 rounded-xl bg-white/80 px-2 py-1.5 text-left text-[10px]">
                          <span className={`h-3.5 w-3.5 rounded-full border ${item.checked ? "border-[#718c65] bg-[#718c65]" : "border-slate-300"}`} />
                          <span className="truncate">{item.name}</span>
                        </button>
                      ))}
                      {!items.length ? <p className="py-4 text-center text-[10px] text-slate-400">Nothing here yet</p> : null}
                    </div>
                  </div>
                );
              })}
            </section>

            <form onSubmit={event => { event.preventDefault(); addManualItem(); }} className="flex h-10 shrink-0 gap-2">
              <input value={manualItem} onChange={event => setManualItem(event.target.value)} placeholder="Add to shopping list" className="min-w-0 flex-1 rounded-2xl border border-white bg-white/80 px-3 text-xs outline-none focus:border-[#7f9973]" />
              <button type="submit" className="rounded-2xl bg-[#263b35] px-4 text-xs font-semibold text-white">Add</button>
            </form>
          </main>
        ) : null}

        {stage === "checking" ? (
          <main className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#9eb792]/20" />
              <span className="absolute inset-3 animate-pulse rounded-full border border-[#76906a]/35 bg-white/75 shadow-xl backdrop-blur-xl" />
              <UiIcon name="leaf" className="relative h-9 w-9 text-[#64805b]" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">Checking your kitchen</h2>
            <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">Looking through every photo, grouping ingredients and finding practical meals.</p>
            <div className="mt-5 flex gap-1.5">{["Looking", "Organising", "Planning"].map((label, index) => <span key={label} className={`rounded-full px-3 py-1 text-[9px] font-semibold ${index === 0 ? "bg-[#718c65] text-white" : "bg-white/75 text-slate-500"}`}>{label}</span>)}</div>
          </main>
        ) : null}

        {stage === "confirm" && analysis ? (
          <main className="mt-4 flex min-h-0 flex-1 flex-col">
            <div className="shrink-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#6d865f]">Step 1 of 2</p>
              <h2 className="mt-1 text-xl font-semibold">Confirm what we found</h2>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">Tap anything that is incorrect before saving it to your Pantry.</p>
            </div>
            <section className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/90 bg-white/70 p-3 shadow-sm backdrop-blur-xl">
              <div className="flex h-full content-start flex-wrap gap-2 overflow-y-auto overscroll-contain">
                {analysis.ingredients.map(item => {
                  const key = normalise(item.name);
                  const active = confirmedIngredients.has(key);
                  return (
                    <button key={key} type="button" onClick={() => setConfirmedIngredients(current => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; })} className={`flex h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-semibold transition ${active ? "border-[#8fa983] bg-[#edf4e9] text-[#55704c]" : "border-slate-200 bg-white text-slate-400 line-through"}`} aria-pressed={active}>
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full ${active ? "bg-[#718c65] text-white" : "bg-slate-100"}`}>{active ? <UiIcon name="check" className="h-3 w-3" /> : null}</span>
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </section>
            <button type="button" onClick={confirmStock} className="mt-3 h-12 shrink-0 rounded-2xl bg-[#263b35] text-sm font-semibold text-white">Save ingredients & see meals</button>
          </main>
        ) : null}

        {stage === "meals" && analysis ? (
          <main className="mt-4 flex min-h-0 flex-1 flex-col">
            <div className="shrink-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#6d865f]">Step 2 of 2</p>
              <h2 className="mt-1 text-xl font-semibold">What you could make</h2>
              <p className="mt-1 text-[11px] text-slate-500">Choose a meal to see what is missing.</p>
            </div>
            <section className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-2">
              {analysis.mealSuggestions.map((meal, index) => (
                <button key={`${meal.name}-${index}`} type="button" onClick={() => setSelectedMealIndex(index)} className={`min-h-0 overflow-hidden rounded-[22px] border p-3 text-left transition ${selectedMealIndex === index ? "border-[#78936c] bg-[#eef5ea] shadow-[0_12px_26px_-20px_rgba(35,54,43,0.7)]" : "border-white bg-white/72"}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[8px] font-bold uppercase tracking-wide text-[#718c65]">{meal.cookTime}</span>
                    <span className={`h-4 w-4 rounded-full border ${selectedMealIndex === index ? "border-[#718c65] bg-[#718c65] shadow-[inset_0_0_0_3px_white]" : "border-slate-300"}`} />
                  </span>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-4">{meal.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[9px] leading-3 text-slate-500">{meal.summary}</p>
                  <p className="mt-2 text-[8px] font-bold uppercase tracking-wide text-slate-400">{meal.missingIngredients.length ? `${meal.missingIngredients.length} to buy` : "Ready to make"}</p>
                </button>
              ))}
            </section>
            {selectedMeal ? (
              <section className="mt-3 shrink-0 rounded-[22px] border border-[#dce7d7] bg-white/75 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wide text-[#718c65]">Missing for {selectedMeal.name}</p>
                <p className="mt-1 truncate text-[11px] text-slate-600">{selectedMeal.missingIngredients.length ? selectedMeal.missingIngredients.join(", ") : "You already have everything visible for this meal."}</p>
                <button type="button" onClick={addMissingToShopping} className="mt-2 h-9 w-full rounded-2xl bg-[#263b35] text-xs font-semibold text-white">{selectedMeal.missingIngredients.length ? "Add missing items to shopping" : "Finish"}</button>
              </section>
            ) : null}
          </main>
        ) : null}

        {stage === "shopping" && selectedMeal ? (
          <main className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#dfead9] text-[#5f7b55] shadow-[0_18px_40px_-24px_rgba(35,54,43,0.7)]"><UiIcon name="check" className="h-9 w-9" /></span>
            <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#6d865f]">Kitchen updated</p>
            <h2 className="mt-1 text-xl font-semibold">{selectedMeal.name}</h2>
            <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">{selectedMeal.missingIngredients.length ? `${selectedMeal.missingIngredients.length} missing item${selectedMeal.missingIngredients.length === 1 ? "" : "s"} added to your shared shopping list.` : "You have everything you need for this meal."}</p>
            <div className="mt-5 w-full rounded-[24px] border border-white/90 bg-white/72 p-3 text-left shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Shopping list</h3>
                <span className="text-[8px] font-bold uppercase tracking-wide text-[#718c65]">{repositoryMode === "supabase" ? "Synced" : "This device"}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {state.kitchenItems.filter(item => item.section === "Shopping").slice(-6).map(item => <span key={item.id} className="truncate rounded-xl bg-[#f0f5ed] px-2 py-1.5 text-[10px] text-slate-700">{item.name}</span>)}
              </div>
            </div>
            <button type="button" onClick={resetCapture} className="mt-4 h-11 w-full rounded-2xl bg-[#263b35] text-xs font-semibold text-white">Check another area</button>
            <button type="button" onClick={() => setStage("capture")} className="mt-2 text-[11px] font-semibold text-[#617b57]">Back to Pantry & shopping</button>
          </main>
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}
