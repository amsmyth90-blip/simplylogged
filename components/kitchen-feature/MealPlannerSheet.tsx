import type { Dispatch, SetStateAction } from "react";

import type { MealPlannerController } from "@/components/kitchen-feature/useMealPlannerController";
import {
  defaultMeals,
  getMealKey,
  getPlannedMeal,
  type MealPlanItem,
} from "@/lib/meal-planner";

export function MealPlannerSheet({
  planner,
}: {
  planner: MealPlannerController;
}) {
  if (!planner.sheetMode) return null;
  const title =
    planner.sheetMode === "swap"
      ? "Replace meal"
      : planner.sheetMode === "edit"
        ? planner.selectedMeal
          ? "Edit meal"
          : "Add meal"
        : planner.sheetMode === "move"
          ? "Move or swap"
          : planner.selectedMeal?.name;
  return (
    <div
      className="absolute inset-0 z-[60] flex items-end bg-slate-950/20 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[2px]"
      role="presentation"
      onClick={() => planner.setSheetMode(null)}
    >
      <section
        className="mx-auto w-full max-w-lg rounded-[28px] border border-white/90 bg-[#fbfcf9]/96 p-4 shadow-2xl backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Manage meal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#718c65]">
              {planner.selectedDate.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={() => planner.setSheetMode(null)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {planner.sheetMode === "swap" ? (
          <SwapOptions planner={planner} />
        ) : null}
        {planner.sheetMode === "edit" ? (
          <MealEditorForm
            draft={planner.draft}
            setDraft={planner.setDraft}
            onSave={planner.saveDraft}
          />
        ) : null}
        {planner.sheetMode === "move" ? <MoveGrid planner={planner} /> : null}
        {planner.sheetMode === "recipe" ? (
          <div className="mt-3 rounded-[22px] bg-[#edf4e9] p-4">
            <div className="flex items-center gap-4 text-xs font-semibold text-[#5f7855]">
              <span>{planner.selectedMeal?.cookTime}</span>
              <span>{planner.selectedMeal?.servings ?? 1} servings</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {planner.selectedMeal?.note}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SwapOptions({ planner }: { planner: MealPlannerController }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {defaultMeals.map((option) => (
        <button
          key={option.name}
          type="button"
          onClick={() => {
            planner.setMeal(planner.selectedKey, { ...option });
            planner.setSheetMode(null);
          }}
          className={`rounded-2xl border px-3 py-2.5 text-left text-[11px] font-semibold ${option.name === planner.selectedMeal?.name ? "border-[#759267] bg-[#edf4e9] text-[#55704c]" : "border-slate-200 bg-white text-slate-700"}`}
        >
          {option.name}
        </button>
      ))}
      <button
        type="button"
        onClick={planner.openEditor}
        className="rounded-2xl border border-dashed border-[#8aa07f] bg-[#f4f8f1] px-3 py-2.5 text-left text-[11px] font-semibold text-[#5d7753]"
      >
        Create custom meal
      </button>
    </div>
  );
}

function MealEditorForm({
  draft,
  setDraft,
  onSave,
}: {
  draft: MealPlanItem;
  setDraft: Dispatch<SetStateAction<MealPlanItem>>;
  onSave: () => void;
}) {
  return (
    <div className="mt-3 space-y-2.5">
      <label className="block">
        <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
          Meal name
        </span>
        <input
          value={draft.name}
          onChange={(event) =>
            setDraft((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="What are you having?"
          className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#7f9973]"
          autoFocus
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
            Cooking time
          </span>
          <input
            value={draft.cookTime}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                cookTime: event.target.value,
              }))
            }
            placeholder="30 min"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#7f9973]"
          />
        </label>
        <label>
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
            Servings
          </span>
          <input
            type="number"
            min="1"
            max="20"
            value={draft.servings}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                servings: Math.max(1, Number(event.target.value) || 1),
              }))
            }
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#7f9973]"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
          Meal image
        </span>
        <span className="grid grid-cols-7 gap-1">
          {defaultMeals.map((option, index) => (
            <button
              key={option.name}
              type="button"
              onClick={() =>
                setDraft((current) => ({ ...current, imageIndex: index }))
              }
              className={`h-9 overflow-hidden rounded-xl border-2 bg-cover bg-center ${draft.imageIndex === index ? "border-[#6f8b62]" : "border-white"}`}
              style={{
                backgroundImage: "url('/images/weekly-meal-thumbnails.png')",
                backgroundSize: "100% 700%",
                backgroundPosition: `center ${(index / 6) * 100}%`,
              }}
              aria-label={`Use ${option.name} image`}
            />
          ))}
        </span>
      </label>
      <label className="block">
        <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
          Notes
        </span>
        <input
          value={draft.note}
          onChange={(event) =>
            setDraft((current) => ({ ...current, note: event.target.value }))
          }
          placeholder="Sides, ingredients or family notes"
          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#7f9973]"
        />
      </label>
      <button
        type="button"
        onClick={onSave}
        disabled={!draft.name.trim()}
        className="h-10 w-full rounded-2xl bg-[#263b35] text-xs font-semibold text-white disabled:opacity-40"
      >
        Save meal
      </button>
    </div>
  );
}

function MoveGrid({ planner }: { planner: MealPlannerController }) {
  return (
    <div className="mt-3">
      <p className="mb-2 rounded-2xl bg-[#edf4e9] px-3 py-2 text-[10px] font-medium text-[#5d7753]">
        Drag any meal onto another day to swap them, or tap a day to move the
        selected meal.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {planner.dates.map((date, index) => {
          const targetMeal = getPlannedMeal(
            planner.state.mealPlan,
            date,
            index,
          );
          const tone =
            planner.dragSourceDay === index
              ? "scale-95 border-[#617c55] bg-white/60 opacity-45"
              : planner.dragTargetDay === index &&
                  planner.dragSourceDay !== null
                ? "scale-105 animate-pulse border-[#617c55] bg-[#edf4e9] ring-2 ring-[#91aa85]/50"
                : index === planner.selectedDay
                  ? "border-[#88a277] bg-[#edf4e9]"
                  : "border-slate-200 bg-white";
          return (
            <button
              key={getMealKey(date)}
              type="button"
              data-meal-day={index}
              onClick={() => {
                if (
                  planner.suppressClickRef.current ||
                  index === planner.selectedDay
                )
                  return;
                planner.swapDays(planner.selectedDay, index);
                planner.setSheetMode(null);
              }}
              onPointerDown={(event) => planner.beginDrag(index, event)}
              onPointerMove={planner.continueDrag}
              onPointerUp={planner.finishDrag}
              onPointerCancel={planner.finishDrag}
              className={`touch-none cursor-grab select-none rounded-2xl border px-3 py-2.5 text-left transition duration-150 active:cursor-grabbing ${tone}`}
              aria-label={`${date.toLocaleDateString("en-GB", { weekday: "long" })}, ${targetMeal?.name ?? "empty day"}. Drag to swap.`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="block text-[9px] font-bold uppercase tracking-wide text-[#718c65]">
                  {date.toLocaleDateString("en-GB", { weekday: "long" })}
                </span>
                {index === planner.selectedDay ? (
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[7px] font-bold uppercase text-[#65805a]">
                    Selected
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-700">
                {targetMeal?.name ?? "Empty day"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
