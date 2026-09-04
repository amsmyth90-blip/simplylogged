import { useState } from "react";

import {
  getKitchenRecipeSteps,
  scaleKitchenRecipeIngredient,
  type KitchenCookingProgress,
  type KitchenRecipe,
} from "@diarydock/kitchen";

import type { KitchenPlanningDraftMutation } from "./planning-client";

type Props = {
  online: boolean;
  progress: KitchenCookingProgress | null;
  recipe: KitchenRecipe;
  mutate: (mutation: KitchenPlanningDraftMutation) => Promise<unknown>;
  onClose: () => void;
};

export function RecipeCookingMode(props: Props) {
  const steps = getKitchenRecipeSteps(props.recipe);
  const prior = props.progress?.recipeId === props.recipe.id ? props.progress : null;
  const [step, setStep] = useState(Math.min(steps.length - 1, Math.max(0, prior?.stepIndex ?? 0)));
  const [servings, setServings] = useState(prior?.servings ?? props.recipe.servings);
  const [showIngredients, setShowIngredients] = useState(false);
  const active = steps[step];

  function persist(nextStep: number, nextServings = servings) {
    if (!props.online) return;
    void props.mutate({ operation: "SET_COOKING_PROGRESS", progress: {
      recipeId: props.recipe.id, stepIndex: nextStep, servings: nextServings,
      timerRemainingSeconds: 0, timerEndsAt: null, updatedAt: new Date().toISOString(),
    } });
  }

  function move(change: number) {
    const next = Math.min(steps.length - 1, Math.max(0, step + change));
    setStep(next); persist(next);
  }

  function changeServings(change: number) {
    const next = Math.min(20, Math.max(1, servings + change));
    setServings(next); persist(step, next);
  }

  function finish() {
    if (props.online) void props.mutate({ operation: "SET_COOKING_PROGRESS", progress: null });
    props.onClose();
  }

  return (
    <div className="cooking-mode">
      <header><button type="button" onClick={props.onClose} aria-label="Exit cooking mode">‹</button>
        <div><small>Cooking now</small><h1>{props.recipe.name}</h1></div>
        <button type="button" onClick={() => setShowIngredients((value) => !value)}>Ingredients</button></header>
      <div className="cooking-progress">{steps.map((_, index) => <span key={index}
        className={index <= step ? "is-active" : ""} />)}</div>
      <section className="cooking-card">
        <div className="cooking-image" style={props.recipe.image
          ? { backgroundImage: `url(${props.recipe.image})` } : undefined} />
        <div className="cooking-copy"><div className="cooking-meta"><small>Step {step + 1} of {steps.length}</small>
          <span><button type="button" onClick={() => changeServings(-1)}>−</button>
            {servings} servings<button type="button" onClick={() => changeServings(1)}>+</button></span></div>
          <h2>{active?.title ?? "Follow the recipe"}</h2>
          <div className="cooking-badges">{active?.durationMinutes ? <b>{active.durationMinutes} min</b> : null}
            {active?.temperature ? <b>{active.temperature}</b> : null}</div>
          <p>{active?.instruction || props.recipe.instructions}</p>
          {active?.tip ? <aside><strong>Helpful tip: </strong>{active.tip}</aside> : null}</div>
      </section>
      <footer><button type="button" disabled={step === 0} onClick={() => move(-1)}>Previous</button>
        {step < steps.length - 1 ? <button type="button" onClick={() => move(1)}>Next step</button>
          : <button type="button" onClick={finish}>Finish recipe</button>}</footer>
      {showIngredients ? <section className="cooking-ingredients"><header><h2>Ingredients</h2>
        <button type="button" onClick={() => setShowIngredients(false)}>×</button></header>
        {props.recipe.ingredients.map((item) => <p key={item}>
          {scaleKitchenRecipeIngredient(item, props.recipe.servings, servings)}</p>)}</section> : null}
    </div>
  );
}
