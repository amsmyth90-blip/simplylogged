import { useMemo, useState, type FormEvent } from "react";

import {
  defaultKitchenMealForDate,
  type KitchenMeal,
  type KitchenPlanningSnapshot,
} from "@diarydock/kitchen";

import tableImage from "../../../../public/images/meal-planner-family-table.png";
import thumbnailsImage from "../../../../public/images/weekly-meal-thumbnails.png";
import { MobileIcon } from "@mobile/components/MobileIcon";
import type { KitchenPlanningDraftMutation } from "./planning-client";

type Props = {
  busy: boolean;
  online: boolean;
  snapshot: KitchenPlanningSnapshot;
  mutate: (mutation: KitchenPlanningDraftMutation) => Promise<unknown>;
  onBack: () => void;
};

const dayPositions = [
  "meal-day-mon", "meal-day-tue", "meal-day-wed", "meal-day-thu",
  "meal-day-fri", "meal-day-sat", "meal-day-sun",
] as const;

const platePositions = [
  { left: "50%", top: "24%" }, { left: "59.5%", top: "41.5%" },
  { left: "60%", top: "57.5%" }, { left: "59%", top: "79%" },
  { left: "40%", top: "79%" }, { left: "39%", top: "57.5%" },
  { left: "40.5%", top: "41.5%" },
] as const;

function key(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")].join("-");
}

function week(offset: number) {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  monday.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday); date.setDate(monday.getDate() + index); return date;
  });
}

function meal(snapshot: KitchenPlanningSnapshot, date: string) {
  const explicit = snapshot.meals.find((entry) => entry.date === date);
  return explicit ? explicit.meal : defaultKitchenMealForDate(date);
}

function emptyMeal(): KitchenMeal {
  return { name: "", cookTime: "", servings: 4, note: "", imageIndex: 0, recipeId: null };
}

export function MealPlannerMobile(props: Props) {
  const todayIndex = (new Date().getDay() + 6) % 7;
  const [offset, setOffset] = useState(0);
  const dates = useMemo(() => week(offset), [offset]);
  const [selectedIndex, setSelectedIndex] = useState(todayIndex);
  const selectedDate = key(dates[selectedIndex]!);
  const selectedMeal = meal(props.snapshot, selectedDate);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<KitchenMeal>(selectedMeal ?? emptyMeal());

  function changeWeek(change: number) {
    setOffset((value) => {
      const next = value + change;
      setSelectedIndex(next === 0 ? todayIndex : 0);
      return next;
    });
    setEditing(false);
  }
  function beginEdit() { setDraft(selectedMeal ? { ...selectedMeal } : emptyMeal()); setEditing(true); }
  function selectRecipe(recipeId: string) {
    const recipe = props.snapshot.recipes.find((item) => item.id === recipeId);
    if (!recipe) { setDraft((current) => ({ ...current, recipeId: null })); return; }
    setDraft({ name: recipe.name, cookTime: recipe.time, servings: recipe.servings,
      note: recipe.instructions, imageIndex: 0, recipeId: recipe.id });
  }
  function save(event: FormEvent) {
    event.preventDefault(); if (!draft.name.trim()) return;
    void props.mutate({ operation: "SET_MEAL", date: selectedDate,
      meal: { ...draft, name: draft.name.trim(), note: draft.note.trim() } })
      .then((value) => { if (value) setEditing(false); });
  }
  function shopWeek() {
    void props.mutate({ operation: "ADD_WEEK_TO_SHOPPING", dates: dates.map(key) });
  }

  return <>
    <header className="meal-planner-header">
      <button type="button" onClick={props.onBack} aria-label="Back to Kitchen">
        <MobileIcon name="arrow-left" />
      </button>
      <div><small>Kitchen</small><h1>Weekly meal planner</h1>
        <p>Plan meals. Shop smart. Eat together.</p></div>
      <button type="button" className="meal-shop-button" disabled={!props.online || props.busy}
        onClick={shopWeek}><MobileIcon name="plus" />Shop week</button>
    </header>
    <div className="meal-planner-mobile">
      <header className="meal-week-nav">
        <button type="button" onClick={() => changeWeek(-1)} aria-label="Previous week">‹</button>
        <strong>{dates[0]!.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          {" – "}{dates[6]!.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</strong>
        <button type="button" onClick={() => changeWeek(1)} aria-label="Next week">›</button>
      </header>
      <section className="meal-family-table" aria-label="Meals planned for this week">
        <img src={tableImage} alt="" aria-hidden="true" />
        {selectedMeal ? <span className="meal-selected-plate" aria-hidden="true" style={{
          ...platePositions[selectedIndex], backgroundImage: `url(${thumbnailsImage})`,
          backgroundSize: "100% 700%",
          backgroundPosition: `center ${(selectedMeal.imageIndex / 6) * 100}%`,
        }} /> : null}
        {dates.map((date, index) => {
          const planned = meal(props.snapshot, key(date));
          return <button type="button" key={key(date)}
            className={`${dayPositions[index]} ${index === selectedIndex ? "is-active" : ""}`}
            onClick={() => { setSelectedIndex(index); setEditing(false); }}>
            <span>{date.toLocaleDateString("en-GB", { weekday: "short" })} <b>{date.getDate()}</b></span>
            <strong>{planned?.name ?? "Add meal"}</strong>
          </button>;
        })}
      </section>
      <article className="meal-detail">
        <header><div><small>Tonight · {dates[selectedIndex]!.toLocaleDateString("en-GB",
          { weekday: "long", day: "numeric", month: "short" })}</small>
          <h2>{selectedMeal?.name ?? "No meal planned"}</h2></div>
          <span>{props.online ? "Synced" : "Offline copy"}</span></header>
        <div className="meal-facts"><span>{selectedMeal?.cookTime || "Choose a meal"}</span>
          <span>{selectedMeal?.servings ?? 1} servings</span></div>
        <p>{selectedMeal?.note ?? "Add a meal to complete this day."}</p>
        <div className="meal-actions">
          <button type="button" disabled={!props.online || props.busy} onClick={beginEdit}>
            {selectedMeal ? "Edit meal" : "Add meal"}</button>
          {selectedMeal ? <button type="button" disabled={!props.online || props.busy}
            onClick={() => void props.mutate({ operation: "SET_MEAL", date: selectedDate, meal: null })}>Clear</button> : null}
          <select aria-label="Move or swap meal" disabled={!props.online || props.busy} defaultValue=""
            onChange={(event) => { if (!event.target.value) return; void props.mutate({
              operation: "SWAP_MEALS", sourceDate: selectedDate, targetDate: event.target.value });
              event.target.value = ""; }}><option value="">Move or swap…</option>
            {dates.filter((_, index) => index !== selectedIndex).map((date) => <option key={key(date)}
              value={key(date)}>{date.toLocaleDateString("en-GB", { weekday: "long" })}</option>)}</select>
        </div>
      </article>
    </div>
    {editing ? <div className="planning-overlay" role="presentation"><form className="planning-dialog meal-editor"
      onSubmit={save} aria-label="Edit planned meal"><header><div><small>Meal planner</small>
        <h2>{selectedMeal ? "Edit meal" : "Add meal"}</h2></div>
        <button type="button" onClick={() => setEditing(false)}>×</button></header>
      <label>Saved recipe<select value={draft.recipeId ?? ""}
        onChange={(event) => selectRecipe(event.target.value)}><option value="">Custom meal</option>
        {props.snapshot.recipes.map((recipe) => <option key={recipe.id}
          value={recipe.id}>{recipe.name}</option>)}</select></label>
      <label>Meal name<input value={draft.name} maxLength={160} required
        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
      <div className="planning-field-pair"><label>Cooking time<input value={draft.cookTime} maxLength={80}
        onChange={(event) => setDraft((current) => ({ ...current, cookTime: event.target.value }))} /></label>
        <label>Servings<input type="number" min="1" max="20" value={draft.servings}
          onChange={(event) => setDraft((current) => ({ ...current,
            servings: Number(event.target.value) || 1 }))} /></label></div>
      <label>Notes<textarea rows={5} value={draft.note} maxLength={2_000}
        onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} /></label>
      <button className="planning-primary" type="submit">Save meal</button></form></div> : null}
  </>;
}
