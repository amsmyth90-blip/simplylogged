"use client";

import { useState, type ReactNode } from "react";
import "./recipe-book-picker.css";

type RecipeSummary = {
  id: string; name: string; time: string; ingredients: string[];
  source: "diarydock" | "scanned" | "themealdb";
};
const filters = [["all", "All recipes"], ["scanned", "Scanned"],
  ["diarydock", "Added"], ["themealdb", "Saved online"]] as const;
const sourceLabels = { scanned: "Scanned recipe", diarydock: "Added recipe", themealdb: "Saved online" };

export function RecipeBookPicker<T extends RecipeSummary>({ recipes, onChoose, onBack, disabled, manageRecipes }: {
  recipes: readonly T[]; onChoose: (recipe: T) => void; onBack: () => void;
  disabled?: boolean; manageRecipes?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<(typeof filters)[number][0]>("all");
  const [page, setPage] = useState(0);
  const search = query.trim().toLocaleLowerCase();
  const matches = recipes.filter(recipe => (source === "all" || recipe.source === source)
    && `${recipe.name} ${recipe.ingredients.join(" ")}`.toLocaleLowerCase().includes(search));
  const pages = Math.max(1, Math.ceil(matches.length / 4));
  const currentPage = Math.min(page, pages - 1);
  return <section className="recipe-book-picker" aria-label="My recipe book">
    <header><h3>My recipe book</h3><button type="button" onClick={onBack}>Back</button></header>
    <label>Search my recipes<input type="search" placeholder="Recipe name or ingredient"
      value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>
    <div className="recipe-book-filters" role="group" aria-label="Recipe source">
      {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={source === value}
        onClick={() => { setSource(value); setPage(0); }}>{label}</button>)}
    </div>
    <p role="status">{matches.length} {matches.length === 1 ? "recipe" : "recipes"}</p>
    <div className="recipe-book-results">
      {matches.slice(currentPage * 4, currentPage * 4 + 4).map(recipe => <button type="button"
        key={recipe.id} disabled={disabled} onClick={() => onChoose(recipe)}>
        <strong>{recipe.name}</strong><span>{[recipe.time, sourceLabels[recipe.source]].filter(Boolean).join(" · ")}</span>
      </button>)}
    </div>
    {!matches.length ? <p>{!recipes.length
      ? "Your recipe book is empty. Add or scan a recipe to choose it here."
      : "No recipes match. Try another search or choose All recipes."}</p> : null}
    {pages > 1 ? <nav aria-label="Recipe pages"><button type="button" disabled={currentPage === 0}
      onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage + 1} / {pages}</span>
      <button type="button" disabled={currentPage + 1 === pages} onClick={() => setPage(currentPage + 1)}>Next</button></nav> : null}
    {manageRecipes ? <footer>{manageRecipes}</footer> : null}
  </section>;
}
