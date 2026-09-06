import { useMemo, useState } from "react";

import { scaleKitchenRecipeIngredient, type KitchenPlanningSnapshot,
  type KitchenRecipe } from "@diarydock/kitchen";

import { MobileIcon } from "@mobile/components/MobileIcon";
import type { KitchenPlanningDraftMutation } from "./planning-client";
import { RecipeCookingMode } from "./RecipeCookingMode";
import { RecipeDiscovery } from "./RecipeDiscovery";
import { RecipeEditor } from "./RecipeEditor";

type Props = { accessToken: string; busy: boolean; loadingRecipeId: string | null;
  online: boolean; snapshot: KitchenPlanningSnapshot; onBack: () => void;
  loadRecipe: (recipeId: string) => Promise<KitchenRecipe | null>;
  mutate: (mutation: KitchenPlanningDraftMutation) => Promise<unknown> };

function today() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")].join("-");
}

function imageStyle(image: string) {
  return image ? { backgroundImage: `url(${image})` } : undefined;
}

export function RecipeBook(props: Props) {
  const [selectedId, setSelectedId] = useState(props.snapshot.recipes[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<KitchenRecipe | "NEW" | null>(null);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [servings, setServings] = useState(props.snapshot.recipes[0]?.servings ?? 4);
  const [planDate, setPlanDate] = useState(today);
  const [cooking, setCooking] = useState(false);
  const [directory, setDirectory] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [options, setOptions] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const selected = props.snapshot.recipes.find((item) => item.id === selectedId)
    ?? props.snapshot.recipes[0] ?? null;
  const recipes = useMemo(() => [...props.snapshot.recipes]
    .filter((item) => `${item.name} ${item.ingredients.join(" ")}`.toLowerCase()
      .includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.name.localeCompare(b.name)),
  [props.snapshot.recipes, search]);

  function select(recipe: KitchenRecipe) {
    setSelectedId(recipe.id); setServings(recipe.servings); setChecked(new Set()); setDirectory(false);
  }
  async function save(recipe: KitchenRecipe) {
    const result = await props.mutate({ operation: "SAVE_RECIPE", recipe });
    if (result) { select(recipe); setEditor(null); }
    return Boolean(result);
  }
  function remove() {
    if (!selected || props.snapshot.recipes.length <= 1
      || !window.confirm(`Delete ${selected.name}?`)) return;
    void props.mutate({ operation: "DELETE_RECIPE", recipeId: selected.id }); setOptions(false);
  }
  function addToPlan() {
    if (!selected) return;
    void props.mutate({ operation: "SET_MEAL", date: planDate, meal: { name: selected.name,
      cookTime: selected.time, servings, note: selected.instructions, imageIndex: 0,
      recipeId: selected.id } });
  }
  function startCooking() {
    if (!selected) return; setCooking(true);
    if (props.online) void props.mutate({ operation: "SET_COOKING_PROGRESS", progress: {
      recipeId: selected.id, stepIndex: 0, servings, timerRemainingSeconds: 0,
      timerEndsAt: null, updatedAt: new Date().toISOString() } });
  }

  return <section className="recipe-home">
    <RecipeHeader selected={selected} online={props.online} onBack={props.onBack}
      onDirectory={() => setDirectory(true)} onOptions={() => setOptions(true)}
      onFavourite={() => selected && void props.mutate({ operation: "TOGGLE_RECIPE_FAVOURITE",
        recipeId: selected.id })} />
    {selected ? <RecipeFeatureCard recipe={selected} servings={servings} checked={checked}
      onToggle={(index) => setChecked((current) => { const next = new Set(current);
        if (next.has(index)) next.delete(index); else next.add(index); return next; })} />
      : <EmptyBook online={props.online} onAdd={() => setEditor("NEW")}
        onFind={() => setDirectory(true)} />}
    {selected ? <><section className="recipe-suggestions"><header><h2>You might also like</h2>
      <button type="button" onClick={() => setDirectory(true)}>View all ›</button></header><div>
      {props.snapshot.recipes.filter((recipe) => recipe.id !== selected.id).slice(0, 3).map((recipe) =>
        <button type="button" key={recipe.id} onClick={() => select(recipe)}><i style={imageStyle(recipe.image)} />
          <strong>{recipe.name}</strong><small>◷ {recipe.time || "Recipe"}</small></button>)}</div></section>
      <div className="recipe-home-actions"><button type="button" disabled={!selected.contentComplete}
        onClick={startCooking}>◷ Start cooking</button><button type="button"
          disabled={!selected.contentComplete || !props.online}
          onClick={() => setPlannerOpen(true)}>▦ Add to day</button></div></> : null}
    {directory ? <RecipeDirectory recipes={recipes} search={search} selected={selected}
      online={props.online} onClose={() => setDirectory(false)} onSearch={setSearch}
      onSelect={select} onAdd={() => setEditor("NEW")} onDiscover={() => setDiscovering(true)} /> : null}
    {options && selected ? <div className="planning-overlay"><section className="planning-dialog recipe-options">
      <header><h2>Recipe options</h2><button type="button" onClick={() => setOptions(false)}>×</button></header>
      <button type="button" onClick={() => { setEditor(selected); setOptions(false); }}>Edit recipe</button>
      <button type="button" disabled={!props.online || checked.size === selected.ingredients.length}
        onClick={() => void props.mutate({ operation: "ADD_RECIPE_INGREDIENTS_TO_SHOPPING",
          recipeId: selected.id, servings, ingredientIndexes: selected.ingredients
            .map((_, index) => index).filter((index) => !checked.has(index)) })}>Add unchecked ingredients</button>
      <button type="button" disabled={!props.online || props.snapshot.recipes.length <= 1}
        onClick={remove}>Delete recipe</button></section></div> : null}
    {plannerOpen && selected ? <div className="planning-overlay"><section className="planning-dialog recipe-plan-dialog">
      <header><div><small>Meal planner</small><h2>Add {selected.name}</h2></div>
        <button type="button" onClick={() => setPlannerOpen(false)}>×</button></header>
      <label>Choose a day<input type="date" value={planDate}
        onChange={(event) => setPlanDate(event.target.value)} /></label>
      <button className="planning-primary" type="button" onClick={() => {
        addToPlan(); setPlannerOpen(false);
      }}>Add to meal planner</button></section></div> : null}
    {editor ? <RecipeEditor recipe={editor === "NEW" ? null : editor}
      onCancel={() => setEditor(null)} onSave={(recipe) => void save(recipe)} /> : null}
    {discovering ? <RecipeDiscovery accessToken={props.accessToken} busy={props.busy}
      onClose={() => setDiscovering(false)} onSave={save} /> : null}
    {cooking && selected ? <RecipeCookingMode recipe={selected} online={props.online}
      progress={props.snapshot.cookingProgress} mutate={props.mutate} onClose={() => setCooking(false)} /> : null}
    {selected && !selected.contentComplete ? <button className="recipe-load-full" type="button"
      disabled={props.loadingRecipeId === selected.id} onClick={() => void props.loadRecipe(selected.id)}>
      {props.loadingRecipeId === selected.id ? "Opening full recipe…" : "Open full recipe"}</button> : null}
  </section>;
}

function RecipeHeader(props: { selected: KitchenRecipe | null; online: boolean; onBack: () => void;
  onDirectory: () => void; onFavourite: () => void; onOptions: () => void }) {
  return <header className="recipe-home-header"><button type="button" onClick={props.onBack}
    aria-label="Back to Kitchen"><MobileIcon name="arrow-left" /></button><div><small>Kitchen</small>
    <h1>Family recipes</h1></div>{props.selected ? <><button type="button" className="recipe-star"
      disabled={!props.online} aria-label="Toggle favourite" onClick={props.onFavourite}>
      {props.selected.favourite ? "★" : "☆"}</button><button type="button" aria-label="Recipe options"
        onClick={props.onOptions}>···</button></> : <button type="button" onClick={props.onDirectory}
          aria-label="Open recipe directory"><MobileIcon name="plus" /></button>}</header>;
}

function RecipeFeatureCard(props: { recipe: KitchenRecipe; servings: number; checked: Set<number>;
  onToggle: (index: number) => void }) {
  return <section className="recipe-feature-card"><div className="recipe-feature-image"
    style={imageStyle(props.recipe.image)} role="img" aria-label={props.recipe.name} /><div className="recipe-page">
    <h2>{props.recipe.name}</h2><hr/><div className="recipe-feature-meta"><span>Ingredients · {props.servings} servings</span>
      <span>{props.checked.size} of {props.recipe.ingredients.length}</span></div>
    <div className="recipe-feature-ingredients">{props.recipe.ingredients.map((item, index) =>
      <button type="button" key={`${item}-${index}`} className={props.checked.has(index) ? "is-checked" : ""}
        onClick={() => props.onToggle(index)}><i>{props.checked.has(index) ? "✓" : ""}</i>
        <span>{scaleKitchenRecipeIngredient(item, props.recipe.servings, props.servings)}</span></button>)}</div>
  </div></section>;
}

function RecipeDirectory(props: { recipes: KitchenRecipe[]; search: string; selected: KitchenRecipe | null;
  online: boolean; onAdd: () => void; onClose: () => void; onDiscover: () => void;
  onSearch: (value: string) => void; onSelect: (recipe: KitchenRecipe) => void }) {
  return <section className="recipe-directory-overlay"><header><button type="button" onClick={props.onClose}>
    <MobileIcon name="arrow-left" /></button><div><small>Kitchen</small><h2>Recipe directory</h2></div>
    <span>{props.recipes.length} dishes</span></header><label><MobileIcon name="search" />
      <input value={props.search} maxLength={160} placeholder="Search dishes or ingredients"
        onChange={(event) => props.onSearch(event.target.value)} /></label>
    <nav><button type="button" disabled={!props.online} onClick={props.onDiscover}>⌕ Find or scan recipe</button>
      <button type="button" disabled={!props.online} onClick={props.onAdd}>＋ Add recipe manually</button></nav>
    <main><h3>Saved in DiaryDock</h3><div>{props.recipes.map((recipe) => <button type="button"
      className={props.selected?.id === recipe.id ? "is-active" : ""} key={recipe.id}
      onClick={() => props.onSelect(recipe)}><i style={imageStyle(recipe.image)} />
      <strong>{recipe.name}</strong><small>◷ {recipe.time || "Recipe"}</small></button>)}</div>
      {!props.recipes.length ? <p>No matching dishes</p> : null}</main></section>;
}

function EmptyBook(props: { online: boolean; onAdd: () => void; onFind: () => void }) {
  return <section className="recipe-empty"><MobileIcon name="folder" /><h2>Start your recipe book</h2>
    <p>Save family favourites so they are available securely on every device.</p>
    <button type="button" onClick={props.onFind}>Find a recipe</button><button type="button"
      disabled={!props.online} onClick={props.onAdd}>Add manually</button></section>;
}
