import { useMemo, useState, type FormEvent } from "react";

import {
  defaultKitchenMealForDate,
  type KitchenMeal,
  type KitchenPlanningSnapshot,
} from "@diarydock/kitchen";

import type { KitchenPlanningDraftMutation } from "./planning-client";

type Props = { busy: boolean; online: boolean; snapshot: KitchenPlanningSnapshot;
  mutate: (mutation: KitchenPlanningDraftMutation) => Promise<unknown> };

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
  const [offset, setOffset] = useState(0);
  const dates = useMemo(() => week(offset), [offset]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedDate = key(dates[selectedIndex]!);
  const selectedMeal = meal(props.snapshot, selectedDate);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<KitchenMeal>(selectedMeal ?? emptyMeal());

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

  return (
    <section className="meal-planner-mobile">
      <header className="meal-week-nav"><button type="button" onClick={() => setOffset((v) => v - 1)}>‹</button>
        <div><small>Week beginning</small><strong>{dates[0]!.toLocaleDateString("en-GB",
          { day: "numeric", month: "short", year: "numeric" })}</strong></div>
        <button type="button" onClick={() => setOffset((v) => v + 1)}>›</button></header>
      <div className="meal-days">{dates.map((date, index) => {
        const planned = meal(props.snapshot, key(date));
        return <button type="button" key={key(date)} className={index === selectedIndex ? "is-active" : ""}
          onClick={() => { setSelectedIndex(index); setEditing(false); }}>
          <small>{date.toLocaleDateString("en-GB", { weekday: "short" })}</small>
          <strong>{date.getDate()}</strong><span>{planned?.name ?? "Add meal"}</span></button>;
      })}</div>
      <article className="meal-detail"><header><div><small>{dates[selectedIndex]!.toLocaleDateString("en-GB",
        { weekday: "long", day: "numeric", month: "long" })}</small>
        <h2>{selectedMeal?.name ?? "No meal planned"}</h2></div>
        <button type="button" disabled={!props.online || props.busy} onClick={beginEdit}>
          {selectedMeal ? "Edit" : "Add"}</button></header>
        {selectedMeal ? <><div className="meal-facts"><span>{selectedMeal.cookTime || "Flexible"}</span>
          <span>{selectedMeal.servings} servings</span></div><p>{selectedMeal.note || "No notes added."}</p></> : null}
        <div className="meal-actions"><button type="button" disabled={!props.online || props.busy}
          onClick={() => void props.mutate({ operation: "SET_MEAL", date: selectedDate, meal: null })}>Clear day</button>
          <select aria-label="Swap with another day" disabled={!props.online || props.busy} defaultValue=""
            onChange={(event) => { if (!event.target.value) return; void props.mutate({
              operation: "SWAP_MEALS", sourceDate: selectedDate, targetDate: event.target.value });
              event.target.value = ""; }}><option value="">Move or swap…</option>
            {dates.filter((_, index) => index !== selectedIndex).map((date) => <option key={key(date)}
              value={key(date)}>{date.toLocaleDateString("en-GB", { weekday: "long" })}</option>)}</select></div>
      </article>
      <button className="planning-primary meal-shop-week" type="button"
        disabled={!props.online || props.busy} onClick={() => void props.mutate({
          operation: "ADD_WEEK_TO_SHOPPING", dates: dates.map(key) })}>Shop for this week</button>
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
    </section>
  );
}
