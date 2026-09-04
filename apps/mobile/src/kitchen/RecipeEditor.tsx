import { useState, type FormEvent } from "react";

import type { KitchenRecipe } from "@diarydock/kitchen";

type Props = {
  recipe: KitchenRecipe | null;
  onCancel: () => void;
  onSave: (recipe: KitchenRecipe) => void;
};

function ingredients(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim().slice(0, 240))
    .filter(Boolean).slice(0, 80);
}

export function RecipeEditor({ recipe, onCancel, onSave }: Props) {
  const [name, setName] = useState(recipe?.name ?? "");
  const [time, setTime] = useState(recipe?.time ?? "");
  const [servings, setServings] = useState(recipe?.servings ?? 4);
  const [ingredientText, setIngredientText] = useState(recipe?.ingredients.join("\n") ?? "");
  const [instructions, setInstructions] = useState(recipe?.instructions ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({
      contentComplete: true,
      id: recipe?.id ?? `recipe-${crypto.randomUUID()}`,
      version: recipe?.version ?? 1,
      name: name.trim(),
      time: time.trim(),
      servings: Math.min(20, Math.max(1, servings)),
      image: recipe?.image ?? "",
      ingredients: ingredients(ingredientText),
      instructions: instructions.trim(),
      steps: recipe?.steps ?? [],
      favourite: recipe?.favourite ?? false,
      source: recipe?.source ?? "diarydock",
      sourceUrl: recipe?.sourceUrl ?? null,
    });
  }

  return (
    <div className="planning-overlay" role="presentation">
      <form className="planning-dialog recipe-editor" onSubmit={submit}
        aria-label={recipe ? "Edit recipe" : "Add recipe"}>
        <header><div><small>Kitchen</small><h2>{recipe ? "Edit recipe" : "Add recipe"}</h2></div>
          <button type="button" onClick={onCancel} aria-label="Close recipe editor">×</button></header>
        <label>Recipe name<input value={name} maxLength={160} required
          onChange={(event) => setName(event.target.value)} /></label>
        <div className="planning-field-pair">
          <label>Total time<input value={time} maxLength={80} placeholder="30 min"
            onChange={(event) => setTime(event.target.value)} /></label>
          <label>Servings<input type="number" min="1" max="20" value={servings}
            onChange={(event) => setServings(Number(event.target.value) || 1)} /></label>
        </div>
        <label>Ingredients · one per line<textarea rows={7} value={ingredientText}
          maxLength={19_280} onChange={(event) => setIngredientText(event.target.value)} /></label>
        <label>Recipe summary<textarea rows={5} value={instructions} maxLength={12_000}
          onChange={(event) => setInstructions(event.target.value)} /></label>
        <button className="planning-primary" type="submit" disabled={!name.trim()}>Save recipe</button>
      </form>
    </div>
  );
}
