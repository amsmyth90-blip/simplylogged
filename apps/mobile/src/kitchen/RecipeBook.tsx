import { useMemo, useState } from "react";

import {
  scaleKitchenRecipeIngredient,
  type KitchenPlanningSnapshot,
  type KitchenRecipe,
} from "@diarydock/kitchen";

import type { KitchenPlanningDraftMutation } from "./planning-client";
import { RecipeCookingMode } from "./RecipeCookingMode";
import { RecipeDiscovery } from "./RecipeDiscovery";
import { RecipeEditor } from "./RecipeEditor";

type Props = {
  accessToken: string;
  busy: boolean;
  loadingRecipeId: string | null;
  online: boolean;
  snapshot: KitchenPlanningSnapshot;
  loadRecipe: (recipeId: string) => Promise<KitchenRecipe | null>;
  mutate: (mutation: KitchenPlanningDraftMutation) => Promise<unknown>;
};

function today() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")].join("-");
}

export function RecipeBook(props: Props) {
  const [selectedId, setSelectedId] = useState(props.snapshot.recipes[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<KitchenRecipe | "NEW" | null>(null);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [servings, setServings] = useState(props.snapshot.recipes[0]?.servings ?? 4);
  const [planDate, setPlanDate] = useState(today);
  const [cooking, setCooking] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const selected = props.snapshot.recipes.find((item) => item.id === selectedId)
    ?? props.snapshot.recipes[0] ?? null;
  const recipes = useMemo(() => [...props.snapshot.recipes]
    .filter((item) => `${item.name} ${item.ingredients.join(" ")}`.toLowerCase()
      .includes(search.trim().toLowerCase()))
    .sort((left, right) => Number(right.favourite) - Number(left.favourite)
      || left.name.localeCompare(right.name)), [props.snapshot.recipes, search]);

  function select(recipe: KitchenRecipe) {
    setSelectedId(recipe.id); setServings(recipe.servings); setChecked(new Set());
  }

  async function save(recipe: KitchenRecipe) {
    const result = await props.mutate({ operation: "SAVE_RECIPE", recipe });
    if (result) { setSelectedId(recipe.id); setServings(recipe.servings); setEditor(null); }
    return Boolean(result);
  }

  function remove() {
    if (!selected || props.snapshot.recipes.length <= 1
      || !window.confirm(`Delete ${selected.name}?`)) return;
    void props.mutate({ operation: "DELETE_RECIPE", recipeId: selected.id });
  }

  function addToPlan() {
    if (!selected) return;
    void props.mutate({ operation: "SET_MEAL", date: planDate, meal: {
      name: selected.name, cookTime: selected.time, servings, note: selected.instructions,
      imageIndex: 0, recipeId: selected.id,
    } });
  }

  function startCooking() {
    if (!selected) return;
    setCooking(true);
    if (props.online) void props.mutate({ operation: "SET_COOKING_PROGRESS", progress: {
      recipeId: selected.id, stepIndex: 0, servings,
      timerRemainingSeconds: 0, timerEndsAt: null, updatedAt: new Date().toISOString(),
    } });
  }

  return (
    <section className="recipe-book">
      <div className="recipe-directory">
        <header><div><small>Recipe book</small><h2>Family recipes</h2></div><div className="recipe-header-actions">
          <button type="button" disabled={!props.online} onClick={() => setDiscovering(true)}>Find</button>
          <button type="button" disabled={!props.online} onClick={() => setEditor("NEW")}>＋ Add</button></div></header>
        <input type="search" value={search} maxLength={160} placeholder="Search recipes or ingredients"
          onChange={(event) => setSearch(event.target.value)} />
        <div className="recipe-list">{recipes.map((recipe) => <button type="button" key={recipe.id}
          className={recipe.id === selected?.id ? "is-active" : ""} onClick={() => select(recipe)}>
          <span className="recipe-thumb" style={recipe.image
            ? { backgroundImage: `url(${recipe.image})` } : undefined}>{recipe.image ? "" : "R"}</span>
          <span><strong>{recipe.name}</strong><small>{recipe.time || "Recipe"} · {recipe.servings} servings</small></span>
          {recipe.favourite ? <b aria-label="Favourite">★</b> : null}</button>)}</div>
      </div>

      {selected ? <article className="recipe-detail">
        <div className="recipe-detail-image" style={selected.image
          ? { backgroundImage: `url(${selected.image})` } : undefined} />
        <header><div><small>{selected.source === "diarydock" ? "Family recipe" : "Saved recipe"}</small>
          <h2>{selected.name}</h2><p>{selected.time || "Recipe guide"}</p></div>
          <button type="button" aria-label="Toggle favourite" disabled={!props.online || props.busy}
            onClick={() => void props.mutate({ operation: "TOGGLE_RECIPE_FAVOURITE",
              recipeId: selected.id })}>{selected.favourite ? "★" : "☆"}</button></header>
        <div className="recipe-servings"><span>Ingredients</span><div>
          <button type="button" onClick={() => setServings((value) => Math.max(1, value - 1))}>−</button>
          <strong>{servings} servings</strong>
          <button type="button" onClick={() => setServings((value) => Math.min(20, value + 1))}>＋</button></div></div>
        <div className="recipe-ingredients">{selected.ingredients.map((ingredient, index) =>
          <button type="button" key={`${ingredient}-${index}`} className={checked.has(index) ? "is-checked" : ""}
            onClick={() => setChecked((current) => { const next = new Set(current);
              if (next.has(index)) next.delete(index); else next.add(index); return next; })}>
            <span>{checked.has(index) ? "✓" : ""}</span>
            {scaleKitchenRecipeIngredient(ingredient, selected.servings, servings)}</button>)}</div>
        {!selected.contentComplete ? <div className="recipe-reduced-warning">
          <p>This recipe has more detail than the Kitchen overview can safely hold.</p>
          <button type="button" disabled={props.loadingRecipeId === selected.id}
            onClick={() => void props.loadRecipe(selected.id)}>
            {props.loadingRecipeId === selected.id ? "Opening full recipe…" : "Open full recipe"}
          </button>
        </div> : null}
        <p className="recipe-instructions">{selected.instructions || "Add cooking instructions when you edit this recipe."}</p>
        <div className="recipe-actions"><button type="button" disabled={!selected.contentComplete}
          onClick={startCooking}>Start cooking</button>
          <button type="button" disabled={!selected.contentComplete || !props.online || props.busy
            || checked.size === selected.ingredients.length}
            onClick={() => void props.mutate({ operation: "ADD_RECIPE_INGREDIENTS_TO_SHOPPING",
              recipeId: selected.id, servings, ingredientIndexes: selected.ingredients
                .map((_, index) => index).filter((index) => !checked.has(index)) })}>Shop missing</button></div>
        <div className="recipe-plan"><input type="date" value={planDate}
          onChange={(event) => setPlanDate(event.target.value)} />
          <button type="button" disabled={!selected.contentComplete || !props.online || props.busy}
            onClick={addToPlan}>Add to day</button></div>
        <footer><button type="button" disabled={!selected.contentComplete || !props.online}
          onClick={() => setEditor(selected)}>Edit</button>
          <button type="button" disabled={!props.online || props.snapshot.recipes.length <= 1}
            onClick={remove}>Delete</button></footer>
      </article> : <div className="planning-empty"><strong>Start your recipe book</strong>
        <p>Add family favourites so they are available securely on every device.</p>
        <button type="button" disabled={!props.online} onClick={() => setEditor("NEW")}>Add a recipe</button></div>}
      {editor ? <RecipeEditor recipe={editor === "NEW" ? null : editor}
        onCancel={() => setEditor(null)} onSave={(recipe) => void save(recipe)} /> : null}
      {discovering ? <RecipeDiscovery accessToken={props.accessToken} busy={props.busy}
        onClose={() => setDiscovering(false)} onSave={save} /> : null}
      {cooking && selected ? <RecipeCookingMode recipe={selected} online={props.online}
        progress={props.snapshot.cookingProgress} mutate={props.mutate}
        onClose={() => setCooking(false)} /> : null}
    </section>
  );
}
