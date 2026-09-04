"use client";

import { UiIcon } from "@/components/UiIcon";

import type { KitchenRecipesController } from "./useKitchenRecipesController";

type Props = { controller: KitchenRecipesController };

export function RecipeEditor({ controller }: Props) {
  const {
    editDraft,
    setEditDraft,
    editingNewRecipe,
    setEditingNewRecipe,
    saveRecipeEdits,
  } = controller;
  if (!editDraft) return null;
  return (
    <div className="absolute inset-0 z-[80] bg-[linear-gradient(180deg,#f8faf5,#f2eee6)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
      <section
        className="mx-auto flex h-full w-full max-w-lg flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={editingNewRecipe ? "Add recipe" : "Edit recipe"}
      >
        <header className="flex h-12 shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEditDraft(null);
              setEditingNewRecipe(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white text-slate-700 shadow-sm"
            aria-label="Cancel editing"
          >
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#718c65]">
              Kitchen
            </p>
            <h2 className="font-serif text-xl font-semibold">
              {editingNewRecipe ? "Add recipe" : "Edit recipe"}
            </h2>
          </div>
          <button
            type="button"
            onClick={saveRecipeEdits}
            className="rounded-full bg-[#263b35] px-4 py-2 text-[10px] font-bold text-white"
          >
            Save
          </button>
        </header>
        <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-[28px] border border-white bg-[#fffdf8] p-4 shadow-[0_25px_60px_-38px_rgba(32,48,39,0.55)]">
          <label className="block">
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Recipe name
            </span>
            <input
              value={editDraft.name}
              onChange={(event) =>
                setEditDraft((current) =>
                  current ? { ...current, name: event.target.value } : current,
                )
              }
              className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#78956b]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Total time
              </span>
              <input
                value={editDraft.time}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current
                      ? { ...current, time: event.target.value }
                      : current,
                  )
                }
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#78956b]"
              />
            </label>
            <label className="block">
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Servings
              </span>
              <input
                type="number"
                min="1"
                max="12"
                value={editDraft.servings}
                onChange={(event) =>
                  setEditDraft((current) =>
                    current
                      ? {
                          ...current,
                          servings: Math.max(
                            1,
                            Number(event.target.value) || 1,
                          ),
                        }
                      : current,
                  )
                }
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#78956b]"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Ingredients · one per line
            </span>
            <textarea
              value={editDraft.ingredients}
              onChange={(event) =>
                setEditDraft((current) =>
                  current
                    ? { ...current, ingredients: event.target.value }
                    : current,
                )
              }
              rows={7}
              className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 outline-none focus:border-[#78956b]"
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Recipe summary
            </span>
            <textarea
              value={editDraft.instructions}
              onChange={(event) =>
                setEditDraft((current) =>
                  current
                    ? { ...current, instructions: event.target.value }
                    : current,
                )
              }
              rows={4}
              className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 outline-none focus:border-[#78956b]"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
