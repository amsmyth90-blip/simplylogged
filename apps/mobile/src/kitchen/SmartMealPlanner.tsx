import { useState } from "react";

import { buildSmartWeekPlan, smartStarterRecipes, type KitchenPlannedMeal, type KitchenRecipe,
  type SmartPlanFocus } from "@diarydock/kitchen";

import { ApplianceVisual } from "./SmartPlannerVisuals";

type Stage = "APPLIANCES" | "PREFERENCES" | "REVIEW";
type Props = { busy: boolean; dates: Date[]; online: boolean; recipes: KitchenRecipe[];
  onClose: () => void; onApply: (meals: KitchenPlannedMeal[], shop: boolean,
    starterRecipeIds: string[]) => Promise<boolean>; onOpenShopping: () => void };

const focuses: Array<{ id: SmartPlanFocus; label: string; detail: string }> = [
  { id: "QUICK", label: "Quick & easy", detail: "Shorter cooking times first" },
  { id: "USE_UP", label: "Use what we have", detail: "Prioritise ingredients at home" },
  { id: "FAVOURITES", label: "Family favourites", detail: "Start with saved favourites" },
  { id: "VARIETY", label: "More variety", detail: "Mix up the week" },
];

function key(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")].join("-");
}

function list(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

function toggle(current: string[], id: string) {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

export function SmartMealPlanner(props: Props) {
  const allDates = props.dates.map(key);
  const planningRecipes = props.recipes.length ? props.recipes : smartStarterRecipes;
  const [stage, setStage] = useState<Stage>("APPLIANCES");
  const [appliances, setAppliances] = useState(["oven", "hob", "microwave"]);
  const [dates, setDates] = useState(allDates);
  const [servings, setServings] = useState(4);
  const [maximumMinutes, setMaximumMinutes] = useState<number | null>(45);
  const [focus, setFocus] = useState<SmartPlanFocus>("VARIETY");
  const [useUp, setUseUp] = useState("");
  const [skip, setSkip] = useState("");
  const [rotation, setRotation] = useState(0);
  const [proposal, setProposal] = useState<KitchenPlannedMeal[]>([]);
  const [addToShopping, setAddToShopping] = useState(true);

  function create(nextRotation = rotation) {
    const orderedDates = allDates.filter((date) => dates.includes(date));
    const next = buildSmartWeekPlan(planningRecipes, { dates: orderedDates, servings, maximumMinutes, focus,
      useUp: list(useUp), skip: list(skip), appliances, rotation: nextRotation });
    setProposal(next); setStage("REVIEW");
  }
  function changeRecipe(index: number, recipeId: string) {
    const recipe = planningRecipes.find((item) => item.id === recipeId);
    if (!recipe) return;
    setProposal((current) => current.map((entry, itemIndex) => itemIndex !== index ? entry : ({
      ...entry, meal: { name: recipe.name, cookTime: recipe.time, servings,
        note: recipe.instructions.slice(0, 2_000), imageIndex: index % 7, recipeId: recipe.id },
    })));
  }
  async function apply() {
    const starterRecipeIds = props.recipes.length ? [] : planningRecipes.map((recipe) => recipe.id);
    if (!await props.onApply(proposal, addToShopping, starterRecipeIds)) return;
    props.onClose();
    if (addToShopping) props.onOpenShopping();
  }

  return <section className="smart-planner" role="dialog" aria-modal="true"
    aria-label="Plan my week"><header><button type="button" onClick={props.onClose}>×</button>
      <div><small>DiaryDock meal planner</small><h2>{stage === "APPLIANCES" ? "How do you cook?"
        : stage === "PREFERENCES" ? "Shape your week" : "Your week is ready"}</h2></div>
      <span>{["APPLIANCES", "PREFERENCES", "REVIEW"].indexOf(stage) + 1}/3</span>
    </header><div className="smart-progress"><i className={`stage-${stage}`} /></div>
    <main>{stage === "APPLIANCES" ? <><p>Select everything available in your kitchen.</p>
      <ApplianceVisual selected={appliances} onToggle={(id) => setAppliances(toggle(appliances, id))} />
      <button className="smart-primary" type="button" disabled={!appliances.length}
        onClick={() => setStage("PREFERENCES")}>Continue</button></> : null}
    {stage === "PREFERENCES" ? <Preferences dates={props.dates} selectedDates={dates}
      setDates={setDates} servings={servings} setServings={setServings} focus={focus}
      setFocus={setFocus} maximumMinutes={maximumMinutes} setMaximumMinutes={setMaximumMinutes}
      useUp={useUp} setUseUp={setUseUp} skip={skip} setSkip={setSkip}
      onCreate={() => create()} /> : null}
    {stage === "REVIEW" ? <><p>Review the meals before saving your week.</p>
      {proposal.length ? <div className="smart-plan-list">{proposal.map((entry, index) => <label key={entry.date}>
        <span>{new Date(`${entry.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short",
          day: "numeric" })}</span><select value={entry.meal?.recipeId ?? ""}
          onChange={(event) => changeRecipe(index, event.target.value)}>{planningRecipes.map((recipe) =>
          <option value={recipe.id} key={recipe.id}>{recipe.name}</option>)}</select></label>)}</div>
        : <div className="smart-plan-empty"><b>No matching recipes</b><span>Adjust the time or skipped
          ingredients, then try again.</span></div>}
      <label className="smart-shopping-toggle"><input type="checkbox" checked={addToShopping}
        onChange={(event) => setAddToShopping(event.target.checked)} />Build my shopping list too</label>
      <div className="smart-review-actions"><button type="button" onClick={() => {
        if (!proposal.length) { setStage("PREFERENCES"); return; }
        const next = rotation + 1; setRotation(next); create(next);
      }}>{proposal.length ? "Try another mix" : "Change preferences"}</button>
        <button type="button" disabled={!props.online || props.busy || !proposal.length}
          onClick={() => void apply()}>{props.busy ? "Saving…"
            : addToShopping ? "Save & view list" : "Save my week"}</button></div>
      {!props.online ? <small className="smart-offline">Connect to save this plan.</small> : null}
    </> : null}</main></section>;
}

function Preferences(props: { dates: Date[]; selectedDates: string[]; setDates: (value: string[]) => void;
  servings: number; setServings: (value: number) => void; focus: SmartPlanFocus;
  setFocus: (value: SmartPlanFocus) => void; maximumMinutes: number | null;
  setMaximumMinutes: (value: number | null) => void; useUp: string; setUseUp: (value: string) => void;
  skip: string; setSkip: (value: string) => void; onCreate: () => void }) {
  return <><p>Choose the days and what matters most this week.</p><div className="smart-days">
    {props.dates.map((date) => { const value = key(date); const active = props.selectedDates.includes(value);
      return <button type="button" className={active ? "is-selected" : ""} key={value}
        onClick={() => props.setDates(toggle(props.selectedDates, value))}>
        <small>{date.toLocaleDateString("en-GB", { weekday: "narrow" })}</small><b>{date.getDate()}</b>
      </button>; })}</div><div className="smart-focuses">{focuses.map((item) => <button type="button"
        key={item.id} className={props.focus === item.id ? "is-selected" : ""}
        onClick={() => props.setFocus(item.id)}><b>{item.label}</b><small>{item.detail}</small></button>)}</div>
    <div className="smart-fields"><label>Servings<select value={props.servings}
      onChange={(event) => props.setServings(Number(event.target.value))}>{[1,2,3,4,5,6,8].map((value) =>
      <option key={value}>{value}</option>)}</select></label><label>Maximum time<select
        value={props.maximumMinutes ?? ""} onChange={(event) => props.setMaximumMinutes(
          event.target.value ? Number(event.target.value) : null)}>{[20,30,45,60].map((value) =>
        <option value={value} key={value}>{value} min</option>)}<option value="">Any time</option></select></label></div>
    <label className="smart-text-field">Use up first<input value={props.useUp} maxLength={240}
      placeholder="e.g. spinach, chicken" onChange={(event) => props.setUseUp(event.target.value)} /></label>
    <label className="smart-text-field">Skip ingredients<input value={props.skip} maxLength={240}
      placeholder="e.g. mushrooms, nuts" onChange={(event) => props.setSkip(event.target.value)} /></label>
    <small className="smart-safety">Always check recipe ingredients for allergies.</small>
    <button className="smart-primary" type="button" disabled={!props.selectedDates.length}
      onClick={props.onCreate}>Create my plan</button></>;
}
