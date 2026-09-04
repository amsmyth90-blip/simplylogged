import { useRef, useState } from "react";

import type { KitchenRecipe } from "@diarydock/kitchen";

import { scanMobileRecipe, searchMobileRecipes } from "./recipe-discovery-client";

export function RecipeDiscovery(props: {
  accessToken: string;
  busy: boolean;
  onClose: () => void;
  onSave: (recipe: KitchenRecipe) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<KitchenRecipe[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function search() {
    setLoading(true); setMessage("");
    try {
      const result = await searchMobileRecipes(props.accessToken, query);
      setRecipes(result.recipes);
      setMessage(result.recipes.length
        ? result.correctedQuery ? `Showing results for ${result.correctedQuery}.` : ""
        : "No online recipes matched that search.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Recipe search is unavailable.");
    } finally { setLoading(false); }
  }

  async function scan(file: File) {
    setLoading(true); setMessage("Reading the recipe securely…");
    try {
      const result = await scanMobileRecipe(props.accessToken, file);
      if (await props.onSave(result.recipe)) props.onClose();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "The recipe could not be read.");
    } finally { setLoading(false); }
  }

  return (
    <div className="planning-overlay" role="presentation">
      <section className="planning-dialog recipe-discovery" role="dialog" aria-modal="true"
        aria-label="Find or scan a recipe"><header><div><small>Recipe book</small>
        <h2>Find a recipe</h2></div><button type="button" onClick={props.onClose}>×</button></header>
        <div className="recipe-search-online"><input type="search" value={query} maxLength={80}
          placeholder="Dish or ingredient" onChange={(event) => setQuery(event.target.value)} />
          <button type="button" disabled={loading || query.trim().length < 2}
            onClick={() => void search()}>Search online</button></div>
        <button className="recipe-scan-button" type="button" disabled={loading}
          onClick={() => fileRef.current?.click()}>Scan a cookbook page or recipe card</button>
        <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp"
          capture="environment" onChange={(event) => { const file = event.target.files?.[0];
            if (file) void scan(file); event.target.value = ""; }} />
        {message ? <p className="discovery-message" role="status">{message}</p> : null}
        <div className="discovery-results">{recipes.map((recipe) => <article key={recipe.id}>
          <span style={recipe.image ? { backgroundImage: `url(${recipe.image})` } : undefined} />
          <div><strong>{recipe.name}</strong><small>{recipe.ingredients.length} ingredients</small></div>
          <button type="button" disabled={props.busy || loading}
            onClick={() => void props.onSave(recipe).then((saved) => { if (saved) props.onClose(); })}>
            Save</button></article>)}</div>
      </section>
    </div>
  );
}
