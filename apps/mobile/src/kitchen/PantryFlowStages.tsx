import type { PantryAnalysisResult } from "@diarydock/kitchen";

import { MobileIcon } from "@mobile/components/MobileIcon";
import type { PantryStage } from "./use-pantry-planner";

export function PantryFlowStages(props: {
  analysis: PantryAnalysisResult | null;
  confirmed: Set<string>;
  meal: PantryAnalysisResult["mealSuggestions"][number] | null;
  selectedMeal: number;
  stage: PantryStage;
  onAddMissing: () => void;
  onConfirm: () => void;
  onReset: () => void;
  onSelectMeal: (index: number) => void;
  onToggleIngredient: (name: string) => void;
}) {
  if (props.stage === "checking") return <main className="pantry-centred-stage">
    <span className="pantry-loading-leaf"><MobileIcon name="leaf" /></span>
    <h2>Checking your kitchen</h2><p>Looking through every photo, grouping ingredients and finding practical meals.</p>
    <div><b>Looking</b><span>Organising</span><span>Planning</span></div>
  </main>;
  if (props.stage === "confirm" && props.analysis) {
    return <ConfirmStage {...props} analysis={props.analysis} />;
  }
  if (props.stage === "meals" && props.analysis) return <MealsStage {...props} analysis={props.analysis} />;
  if (props.stage === "shopping" && props.meal) return <SuccessStage meal={props.meal}
    onReset={props.onReset} />;
  return null;
}

function normalise(value: string) {
  return value.trim().toLocaleLowerCase("en-GB");
}

function ConfirmStage(props: Parameters<typeof PantryFlowStages>[0] & { analysis: PantryAnalysisResult }) {
  return <main className="pantry-flow-stage"><header><small>Step 1 of 2</small>
    <h2>Confirm what we found</h2><p>Tap anything that is incorrect before saving it to your Pantry.</p></header>
    <section className="pantry-ingredients">{props.analysis.ingredients.map((item) => {
      const active = props.confirmed.has(normalise(item.name));
      return <button type="button" key={`${item.category}-${item.name}`} className={active ? "is-active" : ""}
        aria-pressed={active} onClick={() => props.onToggleIngredient(item.name)}>
        <i>{active ? "✓" : ""}</i>{item.name}</button>;
    })}</section>
    <button className="pantry-primary" type="button" onClick={props.onConfirm}>Save ingredients &amp; see meals</button>
  </main>;
}

function MealsStage(props: Parameters<typeof PantryFlowStages>[0] & { analysis: PantryAnalysisResult }) {
  return <main className="pantry-flow-stage pantry-meal-stage"><header><small>Step 2 of 2</small>
    <h2>What you could make</h2><p>Choose a meal to see what is missing.</p></header>
    <section className="pantry-meals">{props.analysis.mealSuggestions.map((meal, index) =>
      <button type="button" key={`${meal.name}-${index}`} className={props.selectedMeal === index ? "is-active" : ""}
        onClick={() => props.onSelectMeal(index)}><span><small>{meal.cookTime}</small><i /></span>
        <h3>{meal.name}</h3><p>{meal.summary}</p><b>{meal.missingIngredients.length
          ? `${meal.missingIngredients.length} to buy` : "Ready to make"}</b></button>)}</section>
    {props.meal ? <section className="pantry-missing"><strong>Missing for {props.meal.name}</strong>
      <p>{props.meal.missingIngredients.length ? props.meal.missingIngredients.join(", ")
        : "You already have everything visible for this meal."}</p>
      <button type="button" onClick={props.onAddMissing}>{props.meal.missingIngredients.length
        ? "Add missing items to shopping" : "Finish"}</button></section> : null}
  </main>;
}

function SuccessStage(props: {
  meal: PantryAnalysisResult["mealSuggestions"][number];
  onReset: () => void;
}) {
  return <main className="pantry-centred-stage pantry-success"><span><MobileIcon name="check" /></span>
    <small>Kitchen updated</small><h2>{props.meal.name}</h2><p>{props.meal.missingIngredients.length
      ? `${props.meal.missingIngredients.length} missing item${props.meal.missingIngredients.length === 1 ? "" : "s"} added to your shared shopping list.`
      : "You have everything you need for this meal."}</p>
    <button className="pantry-primary" type="button" onClick={props.onReset}>Check another area</button>
  </main>;
}
