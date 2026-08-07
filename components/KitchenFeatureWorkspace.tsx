"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { KitchenNoticeboard } from "@/components/KitchenNoticeboard";
import { KitchenPantryPlanner } from "@/components/KitchenPantryPlanner";
import { KitchenRecipes } from "@/components/KitchenRecipes";
import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { normaliseRecipeIngredient, scaleRecipeIngredient } from "@/lib/kitchen-recipes";
import { defaultMeals, getMealKey, getPlannedMeal, getWeekDates, type MealPlanItem } from "@/lib/meal-planner";

type KitchenFeature = "calendar" | "meal-planner" | "pantry" | "recipes" | "notes" | "documents";
type CalendarCategory = "appointments" | "school" | "meals" | "family";
type HouseholdEvent = { id: string; title: string; time: string; category: CalendarCategory };

function aggregateRecipeIngredients(ingredients: string[]) {
  const grouped = new Map<string, { quantity: number; suffix: string; fallback: string }>();
  ingredients.forEach((ingredient) => {
    const match = ingredient.match(/^(\d+(?:\.\d+)?)?([¼½¾])?\s*(.*)$/);
    const whole = match?.[1] ? Number(match[1]) : 0;
    const fraction = match?.[2] === "¼" ? 0.25 : match?.[2] === "½" ? 0.5 : match?.[2] === "¾" ? 0.75 : 0;
    const suffix = match?.[3]?.trim() ?? ingredient;
    const unit = suffix.split(/\s+/)[0]?.toLowerCase() ?? "";
    const key = `${normaliseRecipeIngredient(ingredient)}|${unit}`;
    const current = grouped.get(key);
    grouped.set(key, {
      quantity: (current?.quantity ?? 0) + whole + fraction,
      suffix: current?.suffix ?? suffix,
      fallback: current?.fallback ?? ingredient
    });
  });

  return Array.from(grouped.values()).map(({ quantity, suffix, fallback }) => {
    if (!quantity) return fallback;
    const rounded = Math.round(quantity * 4) / 4;
    const whole = Math.floor(rounded);
    const fraction = Math.round((rounded - whole) * 4);
    const fractionText = fraction === 1 ? "¼" : fraction === 2 ? "½" : fraction === 3 ? "¾" : "";
    return `${whole || ""}${fractionText}${whole || fractionText ? " " : ""}${suffix}`.trim();
  });
}

const calendarCategories: Array<{
  id: CalendarCategory;
  label: string;
  icon: "calendar" | "briefcase" | "leaf" | "users";
  surface: string;
  iconSurface: string;
  examples: Array<{ title: string; time: string }>;
}> = [
  { id: "appointments", label: "Appointments", icon: "calendar", surface: "border-[#cfdfc8]", iconSurface: "bg-[#e6f0e1] text-[#5f7855]", examples: [{ title: "Dentist", time: "10:30" }, { title: "Eye test", time: "14:00" }] },
  { id: "school", label: "School", icon: "briefcase", surface: "border-[#ead7c5]", iconSurface: "bg-[#f5e8dc] text-[#9a6a47]", examples: [{ title: "School pickup", time: "15:15" }, { title: "Parent meeting", time: "18:00" }] },
  { id: "meals", label: "Meals", icon: "leaf", surface: "border-[#e7d8b9]", iconSurface: "bg-[#f4ead3] text-[#96743d]", examples: [{ title: "Family dinner", time: "18:30" }, { title: "Plan tomorrow", time: "19:30" }] },
  { id: "family", label: "Family", icon: "users", surface: "border-[#cfddea]", iconSurface: "bg-[#e3edf5] text-[#567795]", examples: [{ title: "Movie night", time: "20:00" }, { title: "Call Grandma", time: "17:00" }] }
];

function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored) try { setValue(JSON.parse(stored) as T); } catch { /* Keep defaults. */ }
    setLoaded(true);
  }, [key]);
  useEffect(() => { if (loaded) window.localStorage.setItem(key, JSON.stringify(value)); }, [key, loaded, value]);
  return [value, setValue] as const;
}

function FeatureShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <div className="relative -mx-4 -mt-5 min-h-[100svh] overflow-x-hidden bg-[linear-gradient(180deg,#e6efe3_0%,#f8faf6_38%,#eef4ec_100%)] pb-28 text-slate-900 sm:-mx-6">
    <div className="relative mx-auto w-full max-w-lg px-5 pt-5">
      <header className="flex items-center gap-3"><Link href="/room/kitchen" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/90 bg-white/72 text-slate-700 shadow-sm backdrop-blur-xl" aria-label="Back to Kitchen"><UiIcon name="arrow-left" className="h-4 w-4" /></Link><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#66805c]">Kitchen</p><h1 className="text-2xl font-semibold tracking-tight">{title}</h1></div></header>
      <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">{subtitle}</p><main className="mt-5">{children}</main>
    </div><BottomNav />
  </div>;
}

function FamilyCalendar() {
  const { state, updateState } = useLifeDockData();
  const now = new Date();
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(now.getDate());
  const [activeCategory, setActiveCategory] = useState<CalendarCategory | null>(null);
  const [newEvent, setNewEvent] = useState("");
  const [newEventTime, setNewEventTime] = useState("09:00");
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay(), dayCount = new Date(year, month + 1, 0).getDate();
  const dateKey = (day: number) => [year, String(month + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
  const key = dateKey(selected);
  const events = state.familyCalendarEvents.reduce<Record<string, HouseholdEvent[]>>((grouped, event) => {
    grouped[event.date] = [...(grouped[event.date] ?? []), event];
    return grouped;
  }, {});
  const cells = Array.from({ length: 42 }, (_, index) => { const day = index - firstDay + 1; return day > 0 && day <= dayCount ? day : null; });
  const selectedDate = new Date(year, month, selected);
  const selectedEvents = events[key] ?? [];
  const activeEvents = activeCategory ? selectedEvents.filter(event => event.category === activeCategory) : [];

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  const addEvent = () => {
    if (!activeCategory || !newEvent.trim()) return;
    const entry: HouseholdEvent = {
      id: crypto.randomUUID(),
      title: newEvent.trim(),
      time: newEventTime,
      category: activeCategory
    };
    updateState(current => ({
      ...current,
      familyCalendarEvents: [...current.familyCalendarEvents, { ...entry, date: key }]
    }));
    setNewEvent("");
  };

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.95),transparent_34%),linear-gradient(180deg,#e8f0e4_0%,#f8faf6_45%,#edf4ea_100%)] text-slate-900">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-[82px] pt-[max(12px,env(safe-area-inset-top))]">
        <header className="flex shrink-0 items-center gap-3">
          <Link href="/room/kitchen" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/72 text-slate-700 shadow-sm backdrop-blur-xl" aria-label="Back to Kitchen">
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#66805c]">Kitchen · Wall calendar</p>
            <h1 className="text-xl font-semibold tracking-tight">Family calendar</h1>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">Appointments, school dates, meals and family plans.</p>
          </div>
        </header>

        <main className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
          <section className="shrink-0 rounded-[24px] border border-white/90 bg-white/78 px-3 py-2.5 shadow-[0_18px_45px_-26px_rgba(35,54,43,0.45)] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <button onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelected(1); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf3e9] text-slate-700" aria-label="Previous month">
                <UiIcon name="arrow-left" className="h-3.5 w-3.5" />
              </button>
              <h2 className="text-sm font-semibold">{cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2>
              <button onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelected(1); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf3e9] text-slate-700" aria-label="Next month">
                <UiIcon name="chevron-right" className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1.5 grid grid-cols-7 text-center text-[9px] font-bold uppercase text-slate-400">
              {["S","M","T","W","T","F","S"].map((day,index) => <span key={day + index}>{day}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 grid-rows-6 gap-1">
              {cells.map((day,index) => day ? (
                <button
                  key={index}
                  onClick={() => setSelected(day)}
                  className={"relative flex h-[clamp(28px,4.3svh,36px)] items-center justify-center rounded-[11px] text-[11px] font-semibold transition " + (selected === day ? "bg-[#718c65] text-white shadow-sm" : "bg-white/65 text-slate-700 hover:bg-white")}
                >
                  {day}
                  {events[dateKey(day)]?.length ? <span className={"absolute bottom-1 h-1 w-1 rounded-full " + (selected === day ? "bg-amber-200" : "bg-amber-500")} /> : null}
                </button>
              ) : <span key={index} />)}
            </div>
          </section>

          <section className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2.5">
            {calendarCategories.map(category => {
              const categoryEvents = selectedEvents.filter(event => event.category === category.id);
              const previewEvents = categoryEvents.length ? categoryEvents : category.examples;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex min-h-0 flex-col overflow-hidden rounded-[20px] border bg-white/80 text-left shadow-[0_12px_30px_-24px_rgba(15,23,42,0.5)] backdrop-blur-xl transition active:scale-[0.98] ${category.surface}`}
                >
                  <span className={`flex items-center gap-2 px-2.5 py-2 ${category.iconSurface}`}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-white/60">
                      <UiIcon name={category.icon} className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold">{category.label}</span>
                    <UiIcon name="chevron-right" className="ml-auto h-3.5 w-3.5 opacity-55" />
                  </span>
                  <span className="flex flex-1 flex-col px-2.5 py-1.5">
                    {previewEvents.slice(0, 2).map((event, index) => (
                      <span key={`${event.title}-${index}`} className="flex items-center gap-1.5 border-b border-slate-100 py-1 text-[9px] last:border-0">
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{event.title}</span>
                        <span className="shrink-0 text-slate-400">{event.time}</span>
                      </span>
                    ))}
                    <span className="mt-auto pt-1 text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      {categoryEvents.length ? `${categoryEvents.length} planned` : `View all for ${selected}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </section>
        </main>
      </div>

      {activeCategory ? (
        <div className="absolute inset-0 z-[60] flex items-end bg-slate-950/20 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[2px]" role="presentation" onClick={() => setActiveCategory(null)}>
          <section className="mx-auto w-full max-w-lg rounded-[28px] border border-white/90 bg-[#fbfcf9]/95 p-4 shadow-2xl backdrop-blur-2xl" role="dialog" aria-modal="true" aria-label={`${calendarCategories.find(category => category.id === activeCategory)?.label} plans`} onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#718c65]">{selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
                <h2 className="mt-1 text-lg font-semibold">{calendarCategories.find(category => category.id === activeCategory)?.label}</h2>
              </div>
              <button type="button" onClick={() => setActiveCategory(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500" aria-label="Close">x</button>
            </div>
            <div className="mt-3 grid gap-2">
              {activeEvents.slice(0, 3).map(event => (
                <div key={event.id} className="flex items-center gap-3 rounded-2xl bg-[#edf4e9] px-3 py-2.5">
                  <span className="text-xs font-bold text-[#607a56]">{event.time}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{event.title}</span>
                  <button type="button" onClick={() => updateState(current => ({ ...current, familyCalendarEvents: current.familyCalendarEvents.filter(entry => entry.id !== event.id) }))} className="text-xs text-slate-400" aria-label={`Remove ${event.title}`}>x</button>
                </div>
              ))}
              {!activeEvents.length ? <p className="rounded-2xl bg-[#f0f4ed] px-3 py-3 text-center text-xs text-slate-500">Nothing planned yet.</p> : null}
              {activeEvents.length > 3 ? <p className="text-center text-[10px] font-semibold text-slate-400">+{activeEvents.length - 3} more plans</p> : null}
            </div>
            <div className="mt-3 flex gap-2">
              <input type="time" value={newEventTime} onChange={event => setNewEventTime(event.target.value)} className="w-[88px] rounded-2xl border border-slate-200 bg-white px-2 text-xs outline-none" aria-label="Event time" />
              <input value={newEvent} onChange={event => setNewEvent(event.target.value)} onKeyDown={event => { if (event.key === "Enter") addEvent(); }} placeholder="Add a plan" className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none" />
              <button type="button" onClick={addEvent} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#263b35] text-white" aria-label="Add plan">
                <UiIcon name="plus" className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}

function MealPlanner() {
  const { repositoryMode, state, updateState } = useLifeDockData();
  const todayDayIndex = (new Date().getDay() + 6) % 7;
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(todayDayIndex);
  const [sheetMode, setSheetMode] = useState<"swap" | "recipe" | "edit" | "move" | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [shoppingMessage, setShoppingMessage] = useState("");
  const [draft, setDraft] = useState<MealPlanItem>(defaultMeals[0]);
  const [dragSourceDay, setDragSourceDay] = useState<number | null>(null);
  const [dragTargetDay, setDragTargetDay] = useState<number | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const dragSourceRef = useRef<number | null>(null);
  const dragTargetRef = useRef<number | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [diners, setDiners] = useStoredState<string[]>("lifedock-meal-diners-v2", []);
  const savedMealProfiles = state.householdProfiles.filter((profile) => profile.showInMeals);
  const householdMealProfiles = [
    ...savedMealProfiles,
    ...state.householdMembers
      .filter(
        (member) =>
          !savedMealProfiles.some(
            (profile) =>
              profile.id === member.id ||
              profile.linkedUserId === member.userId ||
              profile.name.toLowerCase() === member.name.toLowerCase()
          )
      )
      .map((member, index) => ({
        id: member.id,
        name: member.name,
        colour: (["sage", "blue", "clay", "gold"] as const)[index % 4]
      }))
  ];
  const knownMealNames = householdMealProfiles.map((profile) => profile.name.toLowerCase());
  const scheduleMealProfiles = Array.from(
    new Set(state.kidSchedules.map((routine) => routine.childName.trim()).filter(Boolean))
  )
    .filter((name) => !knownMealNames.includes(name.toLowerCase()))
    .map((name, index) => ({
      id: `schedule-profile-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      colour: (["sage", "blue", "clay", "gold"] as const)[
        (householdMealProfiles.length + index) % 4
      ]
    }));
  const mealProfiles = [...householdMealProfiles, ...scheduleMealProfiles];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("profile");
    const requestedName = params.get("person");
    const requestedProfile = mealProfiles.find(
      (profile) =>
        profile.id === requestedId ||
        Boolean(requestedName && profile.name.toLowerCase() === requestedName.toLowerCase())
    );

    if (requestedProfile) {
      setDiners((current) =>
        current.includes(requestedProfile.id) ? current : [...current, requestedProfile.id]
      );
    }
  }, [mealProfiles, setDiners]);

  const dates = getWeekDates(weekOffset);
  const selectedDate = dates[selectedDay];
  const selectedKey = getMealKey(selectedDate);
  const selectedMeal = getPlannedMeal(state.mealPlan, selectedDate, selectedDay);
  const findRecipeForMeal = (meal: MealPlanItem | null) => {
    if (!meal) return undefined;
    const mealName = meal.name.toLowerCase();
    return state.kitchenRecipes.find(recipe => recipe.id === meal.recipeId)
      ?? state.kitchenRecipes.find(recipe => {
        const recipeName = recipe.name.toLowerCase();
        return recipeName === mealName || recipeName.includes(mealName) || mealName.includes(recipeName);
      });
  };
  const selectedRecipe = findRecipeForMeal(selectedMeal);
  const pantryKeys = state.kitchenItems
    .filter(item => item.section === "Pantry" && item.checked)
    .map(item => normaliseRecipeIngredient(item.name))
    .filter(Boolean);
  const weeklyMissingIngredients = aggregateRecipeIngredients(dates.flatMap((date, dayIndex) => {
    const meal = getPlannedMeal(state.mealPlan, date, dayIndex);
    const recipe = findRecipeForMeal(meal);
    if (!meal || !recipe) return [];
    return recipe.ingredients.map(ingredient =>
      scaleRecipeIngredient(ingredient, recipe.servings ?? 4, meal.servings)
    );
  }).filter(ingredient => {
    const key = normaliseRecipeIngredient(ingredient);
    return key && !pantryKeys.some(pantryKey => pantryKey === key || pantryKey.includes(key) || key.includes(pantryKey));
  }));
  const dayPositions = [
    "left-1/2 top-[-4px] -translate-x-1/2",
    "right-[4%] top-[15%]",
    "right-[4%] top-[43%]",
    "right-[4%] bottom-1",
    "left-[4%] bottom-1",
    "left-[4%] top-[43%]",
    "left-[4%] top-[15%]"
  ];
  const platePositions = [
    { left: "50%", top: "24%" },
    { left: "59.5%", top: "41.5%" },
    { left: "60%", top: "57.5%" },
    { left: "59%", top: "79%" },
    { left: "40%", top: "79%" },
    { left: "39%", top: "57.5%" },
    { left: "40.5%", top: "41.5%" }
  ];

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  const weekLabel = `${dates[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${dates[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  const setMeal = (key: string, meal: MealPlanItem | null) => {
    updateState(current => ({ ...current, mealPlan: { ...current.mealPlan, [key]: meal } }));
  };
  const openEditor = () => {
    setDraft(selectedMeal ? { ...selectedMeal } : { ...defaultMeals[selectedDay], name: "", recipeId: undefined });
    setSheetMode("edit");
  };
  const saveDraft = () => {
    if (!draft.name.trim()) return;
    const linkedRecipe = state.kitchenRecipes.find(recipe => recipe.id === draft.recipeId);
    const recipeId = linkedRecipe && linkedRecipe.name.toLowerCase() === draft.name.trim().toLowerCase()
      ? linkedRecipe.id
      : undefined;
    setMeal(selectedKey, { ...draft, recipeId, name: draft.name.trim(), note: draft.note.trim() });
    setSheetMode(null);
  };
  const addWeekToShopping = () => {
    let added = 0;
    updateState(current => {
      const existing = new Set(current.kitchenItems
        .filter(item => item.section === "Shopping")
        .map(item => normaliseRecipeIngredient(item.name)));
      const additions = weeklyMissingIngredients
        .filter(ingredient => {
          const key = normaliseRecipeIngredient(ingredient);
          if (existing.has(key)) return false;
          existing.add(key);
          added += 1;
          return true;
        })
        .map(ingredient => ({
          id: `weekly-shopping-${crypto.randomUUID()}`,
          name: ingredient,
          checked: false,
          section: "Shopping" as const
        }));
      return { ...current, kitchenItems: [...current.kitchenItems, ...additions] };
    });
    setShoppingMessage(added ? `${added} item${added === 1 ? "" : "s"} added to the shared shopping list.` : "Your weekly shopping list is already up to date.");
  };
  const swapDays = (sourceDay: number, targetDay: number) => {
    if (sourceDay === targetDay) return;
    const sourceDate = dates[sourceDay];
    const targetDate = dates[targetDay];
    const sourceMeal = getPlannedMeal(state.mealPlan, sourceDate, sourceDay);
    const targetMeal = getPlannedMeal(state.mealPlan, targetDate, targetDay);
    updateState(current => ({
      ...current,
      mealPlan: {
        ...current.mealPlan,
        [getMealKey(sourceDate)]: targetMeal,
        [getMealKey(targetDate)]: sourceMeal
      }
    }));
    setSelectedDay(targetDay);
  };
  const beginDrag = (day: number, event: ReactPointerEvent<HTMLElement>) => {
    dragSourceRef.current = day;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    didDragRef.current = false;
    setDragSourceDay(day);
    setDragTargetDay(day);
    dragTargetRef.current = day;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const continueDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragSourceRef.current === null) return;
    const distance = Math.hypot(event.clientX - dragStartRef.current.x, event.clientY - dragStartRef.current.y);
    if (distance < 8) return;
    didDragRef.current = true;
    setDragPoint({ x: event.clientX, y: event.clientY });
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-meal-day]");
    const targetDay = target?.dataset.mealDay;
    const nextTarget = targetDay === undefined ? null : Number(targetDay);
    dragTargetRef.current = nextTarget;
    setDragTargetDay(nextTarget);
  };
  const finishDrag = () => {
    const sourceDay = dragSourceRef.current;
    const targetDay = dragTargetRef.current;
    if (didDragRef.current && sourceDay !== null && targetDay !== null && sourceDay !== targetDay) {
      swapDays(sourceDay, targetDay);
    }
    suppressClickRef.current = didDragRef.current;
    dragSourceRef.current = null;
    dragTargetRef.current = null;
    didDragRef.current = false;
    setDragSourceDay(null);
    setDragTargetDay(null);
    setDragPoint(null);
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.96),transparent_34%),linear-gradient(180deg,#edf3e9_0%,#fbfcf9_48%,#eef4eb_100%)] text-slate-900">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-[82px] pt-[max(12px,env(safe-area-inset-top))]">
        <header className="flex shrink-0 items-center gap-3">
          <Link href="/room/kitchen" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/75 text-slate-700 shadow-sm backdrop-blur-xl" aria-label="Back to Kitchen">
            <UiIcon name="arrow-left" className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#66805c]">Kitchen</p>
            <h1 className="text-xl font-semibold tracking-tight">Weekly meal planner</h1>
            <p className="mt-0.5 text-[10px] text-slate-500">Plan meals. Shop smart. Eat together.</p>
          </div>
          <button type="button" onClick={() => { setShoppingMessage(""); setShoppingOpen(true); }} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/90 bg-white/78 px-3 text-[9px] font-bold text-[#607b55] shadow-sm backdrop-blur-xl">
            <UiIcon name="plus" className="h-3.5 w-3.5" />Shop week
          </button>
        </header>

        <main className="mt-2.5 flex min-h-0 flex-1 flex-col gap-2.5">
          <div className="flex h-9 shrink-0 items-center justify-between rounded-full border border-white/90 bg-white/72 px-2 shadow-sm backdrop-blur-xl">
            <button type="button" onClick={() => setWeekOffset(value => { const next = value - 1; setSelectedDay(next === 0 ? todayDayIndex : 0); return next; })} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600" aria-label="Previous week">
              <UiIcon name="arrow-left" className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-semibold text-slate-700">{weekLabel}</span>
            <button type="button" onClick={() => setWeekOffset(value => { const next = value + 1; setSelectedDay(next === 0 ? todayDayIndex : 0); return next; })} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-600" aria-label="Next week">
              <UiIcon name="chevron-right" className="h-3.5 w-3.5" />
            </button>
          </div>

          <section className="relative min-h-[225px] flex-1 overflow-hidden rounded-[28px] border border-white/90 bg-[#f7f8f3] shadow-[0_18px_42px_-30px_rgba(35,54,43,0.5)]">
            <img
              src="/images/meal-planner-family-table.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[55%] h-[106%] w-[66%] -translate-x-1/2 -translate-y-1/2 object-contain mix-blend-multiply"
              style={{
                WebkitMaskImage: "radial-gradient(ellipse 46% 52% at center, #000 58%, rgba(0,0,0,.92) 70%, transparent 94%)",
                maskImage: "radial-gradient(ellipse 46% 52% at center, #000 58%, rgba(0,0,0,.92) 70%, transparent 94%)"
              }}
            />
            {selectedMeal ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute z-[8] h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cover bg-center shadow-[0_5px_14px_rgba(44,52,35,0.22)] transition-all duration-300"
                style={{
                  ...platePositions[selectedDay],
                  backgroundImage: "url('/images/weekly-meal-thumbnails.png')",
                  backgroundSize: "100% 700%",
                  backgroundPosition: `center ${(selectedMeal.imageIndex / 6) * 100}%`
                }}
              />
            ) : null}

            {dates.map((date, index) => {
              const dateMeal = getPlannedMeal(state.mealPlan, date, index);
              return (
                <button
                  key={getMealKey(date)}
                  type="button"
                  data-meal-day={index}
                  onClick={() => {
                    if (!suppressClickRef.current) setSelectedDay(index);
                  }}
                  onPointerDown={event => beginDrag(index, event)}
                  onPointerMove={continueDrag}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                  className={`absolute z-10 w-[86px] touch-none cursor-grab select-none rounded-[14px] border px-2 py-1.5 text-left shadow-[0_8px_18px_-12px_rgba(15,23,42,0.5)] backdrop-blur-xl transition duration-150 active:cursor-grabbing ${dayPositions[index]} ${dragSourceDay === index ? "z-30 scale-95 border-[#617c55] bg-white/60 opacity-45 shadow-none" : dragTargetDay === index && dragSourceDay !== null ? "scale-110 animate-pulse border-[#617c55] ring-2 ring-[#91aa85]/50" : selectedDay === index ? "border-[#88a277] bg-[#f2f7ef]/95" : index % 2 ? "border-[#ead9bd] bg-[#fffaf0]/92" : "border-[#dbe5ef] bg-white/92"}`}
                  aria-label={`${date.toLocaleDateString("en-GB", { weekday: "short" })} ${date.getDate()} ${dateMeal?.name ?? "Add meal"}. Press and drag to swap.`}
                >
                  <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    {date.toLocaleDateString("en-GB", { weekday: "short" })}
                    <span className="text-slate-800">{date.getDate()}</span>
                  </span>
                  <span className={`mt-0.5 block line-clamp-2 text-[9px] font-semibold leading-[12px] ${dateMeal ? "text-slate-800" : "text-slate-400"}`}>
                    {dateMeal?.name ?? "Add meal"}
                  </span>
                </button>
              );
            })}
          </section>

          <section className="shrink-0 rounded-[22px] border border-[#d7e3d1] bg-[#f1f6ee]/92 p-3 shadow-[0_14px_30px_-24px_rgba(35,54,43,0.55)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#718c65]">Tonight - {selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}</p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className={`min-w-0 flex-1 truncate text-base font-semibold tracking-tight ${selectedMeal ? "" : "text-slate-400"}`}>
                {selectedMeal?.name ?? "No meal planned"}
              </h2>
              <span className="rounded-full bg-white/70 px-2 py-1 text-[7px] font-bold uppercase tracking-wide text-[#6f8564]">
                {repositoryMode === "supabase" ? "Synced" : "This device"}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-3 text-[9px] text-slate-500">
              <span className="flex items-center gap-1"><UiIcon name="clock" className="h-3 w-3" />{selectedMeal?.cookTime ?? "Choose a meal"}</span>
              <span className="flex items-center gap-1"><UiIcon name="users" className="h-3 w-3" />{selectedMeal?.servings ?? (diners.length || 1)} servings</span>
            </p>
            <p className="mt-1 truncate text-[9px] text-slate-500">{selectedMeal?.note ?? "Add a meal to complete this day."}</p>
            <div className="mt-2 flex gap-1.5">
              {selectedMeal ? (
                <>
                  {selectedRecipe ? (
                    <Link href={`/kitchen/recipes?recipe=${encodeURIComponent(selectedRecipe.id)}&cook=1`} className="rounded-full bg-[#263b35] px-3 py-1.5 text-[9px] font-semibold text-white">Cook</Link>
                  ) : null}
                  <button type="button" onClick={openEditor} className="rounded-full bg-[#6f8b62] px-4 py-1.5 text-[9px] font-semibold text-white">Edit meal</button>
                  <button type="button" onClick={() => setSheetMode("swap")} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold text-slate-700">Replace</button>
                  <button type="button" onClick={() => setSheetMode("move")} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold text-slate-700">Move</button>
                  <button type="button" onClick={() => setMeal(selectedKey, null)} className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-500" aria-label="Clear meal">×</button>
                </>
              ) : (
                <button type="button" onClick={openEditor} className="rounded-full bg-[#6f8b62] px-5 py-1.5 text-[9px] font-semibold text-white">Add meal</button>
              )}
            </div>
          </section>

          <section className="flex h-11 shrink-0 items-center rounded-[18px] border border-white/90 bg-white/72 px-3 shadow-sm backdrop-blur-xl">
            <span className="text-[10px] font-semibold text-slate-600">Who&apos;s eating?</span>
            <div className="ml-auto flex items-center -space-x-1.5">
              {mealProfiles.slice(0, 4).map((profile, index) => {
                const active = diners.includes(profile.id);
                const initials =
                  profile.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("") || "LD";
                return (
                  <button key={profile.id} type="button" title={profile.name} onClick={() => setDiners(current => active ? current.filter(item => item !== profile.id) : [...current, profile.id])} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold shadow-sm ${active ? ["bg-[#dce8d6] text-[#58704f]", "bg-[#dbe8ec] text-[#50727b]", "bg-[#efdcd5] text-[#8b6154]", "bg-[#f1e7c8] text-[#79612d]"][index % 4] : "bg-slate-100 text-slate-400"}`} aria-pressed={active} aria-label={`${active ? "Remove" : "Add"} ${profile.name} ${active ? "from" : "to"} dinner`}>
                    {initials}
                  </button>
                );
              })}
              <Link href="/family/household" className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-500 shadow-sm" aria-label="Manage household diners">
                <UiIcon name="plus" className="h-3 w-3" />
              </Link>
            </div>
          </section>
        </main>
      </div>

      {sheetMode ? (
        <div className="absolute inset-0 z-[60] flex items-end bg-slate-950/20 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[2px]" role="presentation" onClick={() => setSheetMode(null)}>
          <section className="mx-auto w-full max-w-lg rounded-[28px] border border-white/90 bg-[#fbfcf9]/96 p-4 shadow-2xl backdrop-blur-2xl" role="dialog" aria-modal="true" aria-label="Manage meal" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#718c65]">{selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
                <h2 className="mt-1 text-lg font-semibold">
                  {sheetMode === "swap" ? "Replace meal" : sheetMode === "edit" ? (selectedMeal ? "Edit meal" : "Add meal") : sheetMode === "move" ? "Move or swap" : selectedMeal?.name}
                </h2>
              </div>
              <button type="button" onClick={() => setSheetMode(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500" aria-label="Close">×</button>
            </div>
            {sheetMode === "swap" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {defaultMeals.map(option => (
                  <button key={option.name} type="button" onClick={() => { setMeal(selectedKey, { ...option }); setSheetMode(null); }} className={`rounded-2xl border px-3 py-2.5 text-left text-[11px] font-semibold ${option.name === selectedMeal?.name ? "border-[#759267] bg-[#edf4e9] text-[#55704c]" : "border-slate-200 bg-white text-slate-700"}`}>
                    {option.name}
                  </button>
                ))}
                <button type="button" onClick={openEditor} className="rounded-2xl border border-dashed border-[#8aa07f] bg-[#f4f8f1] px-3 py-2.5 text-left text-[11px] font-semibold text-[#5d7753]">Create custom meal</button>
              </div>
            ) : sheetMode === "edit" ? (
              <div className="mt-3 space-y-2.5">
                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Meal name</span>
                  <input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="What are you having?" className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#7f9973]" autoFocus />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Cooking time</span>
                    <input value={draft.cookTime} onChange={event => setDraft(current => ({ ...current, cookTime: event.target.value }))} placeholder="30 min" className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#7f9973]" />
                  </label>
                  <label>
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Servings</span>
                    <input type="number" min="1" max="20" value={draft.servings} onChange={event => setDraft(current => ({ ...current, servings: Math.max(1, Number(event.target.value) || 1) }))} className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#7f9973]" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Meal image</span>
                  <span className="grid grid-cols-7 gap-1">
                    {defaultMeals.map((option, index) => (
                      <button key={option.name} type="button" onClick={() => setDraft(current => ({ ...current, imageIndex: index }))} className={`h-9 overflow-hidden rounded-xl border-2 bg-cover bg-center ${draft.imageIndex === index ? "border-[#6f8b62]" : "border-white"}`} style={{ backgroundImage: "url('/images/weekly-meal-thumbnails.png')", backgroundSize: "100% 700%", backgroundPosition: `center ${(index / 6) * 100}%` }} aria-label={`Use ${option.name} image`} />
                    ))}
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Notes</span>
                  <input value={draft.note} onChange={event => setDraft(current => ({ ...current, note: event.target.value }))} placeholder="Sides, ingredients or family notes" className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#7f9973]" />
                </label>
                <button type="button" onClick={saveDraft} disabled={!draft.name.trim()} className="h-10 w-full rounded-2xl bg-[#263b35] text-xs font-semibold text-white disabled:opacity-40">Save meal</button>
              </div>
            ) : sheetMode === "move" ? (
              <div className="mt-3">
                <p className="mb-2 rounded-2xl bg-[#edf4e9] px-3 py-2 text-[10px] font-medium text-[#5d7753]">
                  Drag any meal onto another day to swap them, or tap a day to move the selected meal.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {dates.map((date, index) => {
                    const targetMeal = getPlannedMeal(state.mealPlan, date, index);
                    return (
                      <button
                        key={getMealKey(date)}
                        type="button"
                        data-meal-day={index}
                        onClick={() => {
                          if (suppressClickRef.current || index === selectedDay) return;
                          swapDays(selectedDay, index);
                          setSheetMode(null);
                        }}
                        onPointerDown={event => beginDrag(index, event)}
                        onPointerMove={continueDrag}
                        onPointerUp={finishDrag}
                        onPointerCancel={finishDrag}
                        className={`touch-none cursor-grab select-none rounded-2xl border px-3 py-2.5 text-left transition duration-150 active:cursor-grabbing ${dragSourceDay === index ? "scale-95 border-[#617c55] bg-white/60 opacity-45" : dragTargetDay === index && dragSourceDay !== null ? "scale-105 animate-pulse border-[#617c55] bg-[#edf4e9] ring-2 ring-[#91aa85]/50" : index === selectedDay ? "border-[#88a277] bg-[#edf4e9]" : "border-slate-200 bg-white"}`}
                        aria-label={`${date.toLocaleDateString("en-GB", { weekday: "long" })}, ${targetMeal?.name ?? "empty day"}. Drag to swap.`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="block text-[9px] font-bold uppercase tracking-wide text-[#718c65]">{date.toLocaleDateString("en-GB", { weekday: "long" })}</span>
                          {index === selectedDay ? <span className="rounded-full bg-white px-1.5 py-0.5 text-[7px] font-bold uppercase text-[#65805a]">Selected</span> : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-700">{targetMeal?.name ?? "Empty day"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-[22px] bg-[#edf4e9] p-4">
                <div className="flex items-center gap-4 text-xs font-semibold text-[#5f7855]"><span>{selectedMeal?.cookTime}</span><span>{selectedMeal?.servings ?? 1} servings</span></div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{selectedMeal?.note}</p>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {shoppingOpen ? (
        <div className="absolute inset-0 z-[70] flex items-end bg-slate-950/20 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[3px]" role="presentation" onClick={() => setShoppingOpen(false)}>
          <section className="mx-auto w-full max-w-lg rounded-[28px] border border-white/90 bg-[#fbfcf9]/98 p-4 shadow-2xl" role="dialog" aria-modal="true" aria-label="Weekly shopping list" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#718c65]">Pantry checked</p>
                <h2 className="mt-1 text-lg font-semibold">Shopping for the week</h2>
                <p className="mt-1 text-[10px] text-slate-500">{weeklyMissingIngredients.length} missing ingredient{weeklyMissingIngredients.length === 1 ? "" : "s"} across linked recipes.</p>
              </div>
              <button type="button" onClick={() => setShoppingOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500" aria-label="Close weekly shopping">x</button>
            </div>
            <div className="mt-4 grid max-h-[42svh] grid-cols-2 gap-2 overflow-y-auto">
              {weeklyMissingIngredients.map(ingredient => (
                <span key={normaliseRecipeIngredient(ingredient)} className="truncate rounded-2xl bg-[#edf4e9] px-3 py-2.5 text-[10px] font-medium text-[#52684a]">{ingredient}</span>
              ))}
              {!weeklyMissingIngredients.length ? <p className="col-span-2 rounded-2xl bg-[#edf4e9] px-3 py-5 text-center text-xs text-[#607b55]">Everything is already in your pantry.</p> : null}
            </div>
            <button type="button" onClick={addWeekToShopping} disabled={!weeklyMissingIngredients.length} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#263b35] text-xs font-semibold text-white disabled:opacity-40">
              <UiIcon name="plus" className="h-4 w-4" />Add missing items
            </button>
            {shoppingMessage ? <p className="mt-2 text-center text-[10px] font-semibold text-[#607b55]">{shoppingMessage}</p> : null}
          </section>
        </div>
      ) : null}

      {dragPoint && dragSourceDay !== null ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[100] flex max-w-[150px] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl border border-white/95 bg-white/94 px-2.5 py-2 shadow-[0_16px_35px_rgba(24,39,31,0.3)] backdrop-blur-xl"
          style={{ left: dragPoint.x, top: dragPoint.y }}
        >
          <span
            className="h-8 w-8 shrink-0 rounded-xl bg-cover bg-center"
            style={{
              backgroundImage: "url('/images/weekly-meal-thumbnails.png')",
              backgroundSize: "100% 700%",
              backgroundPosition: `center ${((getPlannedMeal(state.mealPlan, dates[dragSourceDay], dragSourceDay)?.imageIndex ?? dragSourceDay) / 6) * 100}%`
            }}
          />
          <span className="min-w-0">
            <span className="block text-[8px] font-bold uppercase tracking-wide text-[#718c65]">
              {dates[dragSourceDay].toLocaleDateString("en-GB", { weekday: "long" })}
            </span>
            <span className="block truncate text-[10px] font-semibold text-slate-800">
              {getPlannedMeal(state.mealPlan, dates[dragSourceDay], dragSourceDay)?.name ?? "Empty day"}
            </span>
          </span>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}

function Recipes() {
  const recipes = [{ id:"roast",name:"Sunday roast chicken",time:"1 hr 30",note:"Family favourite" },{ id:"pasta",name:"Tomato garden pasta",time:"25 min",note:"Quick weekday meal" },{ id:"salmon",name:"Lemon herb salmon",time:"35 min",note:"Fresh and simple" }];
  const [favourites,setFavourites] = useStoredState<string[]>("lifedock-favourite-recipes", ["roast"]);
  return <FeatureShell title="Family recipes" subtitle="The recipes everyone asks for, kept together in the Kitchen."><div className="space-y-3">{recipes.map(recipe => <article key={recipe.id} className="rounded-[24px] border border-white/90 bg-white/76 p-4"><div className="flex items-start justify-between"><div><h2 className="font-semibold">{recipe.name}</h2><p className="mt-1 text-xs text-slate-500">{recipe.time} · {recipe.note}</p></div><button aria-label="Toggle favourite" onClick={() => setFavourites(current => current.includes(recipe.id) ? current.filter(id => id !== recipe.id) : [...current, recipe.id])} className={"flex h-9 w-9 items-center justify-center rounded-full " + (favourites.includes(recipe.id) ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400")}><UiIcon name="star" className="h-4 w-4" /></button></div></article>)}</div></FeatureShell>;
}

function KitchenDocuments() {
  const { state } = useLifeDockData();
  const saved = state.vaultDocuments.filter(document => document.roomId === "kitchen" || document.roomName === "Kitchen");
  const examples = saved.length ? saved : [{ id:"sample-warranty",title:"Dishwasher Warranty",category:"Home & Property",updated:"Today" },{ id:"sample-manual",title:"Oven User Manual",category:"Home & Property",updated:"Last month" },{ id:"sample-inventory",title:"Kitchen Appliance Inventory",category:"Home & Property",updated:"May" }];
  return <FeatureShell title="Kitchen documents" subtitle="Manuals, warranties, appliance receipts and kitchen records."><Link href="/capture?room=kitchen" className="flex items-center justify-center gap-2 rounded-[22px] bg-[#263b35] py-3.5 text-sm font-semibold text-white"><UiIcon name="plus" className="h-4 w-4" />Add Kitchen document</Link><div className="mt-4 space-y-2.5">{examples.map(document => <article key={document.id} className="flex items-center gap-3 rounded-[22px] border border-white/90 bg-white/78 p-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f0e2] text-[#5b7751]"><UiIcon name="file" className="h-5 w-5" /></span><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{document.title}</h2><p className="mt-0.5 text-[11px] text-slate-500">{document.category} · {document.updated}</p></div></article>)}</div></FeatureShell>;
}

export function KitchenFeatureWorkspace({ feature }: { feature: KitchenFeature }) {
  if (feature === "calendar") return <FamilyCalendar />;
  if (feature === "meal-planner") return <MealPlanner />;
  if (feature === "pantry") return <KitchenPantryPlanner />;
  if (feature === "recipes") return <KitchenRecipes />;
  if (feature === "notes") return <KitchenNoticeboard />;
  return <KitchenDocuments />;
}
