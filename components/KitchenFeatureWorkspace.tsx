"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useLifeDockData } from "@/components/LifeDockDataProvider";
import { UiIcon } from "@/components/UiIcon";

type KitchenFeature = "calendar" | "meal-planner" | "pantry" | "recipes" | "notes" | "documents";
type PantryItem = { id: string; name: string; checked: boolean; section: "Pantry" | "Shopping" };

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
  const now = new Date();
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(now.getDate());
  const [events, setEvents] = useStoredState<Record<string, string[]>>("lifedock-family-calendar", {});
  const [newEvent, setNewEvent] = useState("");
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay(), dayCount = new Date(year, month + 1, 0).getDate();
  const dateKey = (day: number) => [year, String(month + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
  const key = dateKey(selected);
  const cells = Array.from({ length: 42 }, (_, index) => { const day = index - firstDay + 1; return day > 0 && day <= dayCount ? day : null; });
  return <FeatureShell title="Family calendar" subtitle="Appointments, school dates, meals and family plans in one shared view.">
    <section className="rounded-[28px] border border-white/90 bg-white/76 p-4 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between"><button onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelected(1); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf3e9]" aria-label="Previous month"><UiIcon name="arrow-left" className="h-4 w-4" /></button><h2 className="font-semibold">{cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2><button onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelected(1); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf3e9]" aria-label="Next month"><UiIcon name="chevron-right" className="h-4 w-4" /></button></div>
      <div className="mt-5 grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">{["S","M","T","W","T","F","S"].map((day,index) => <span key={day + index}>{day}</span>)}</div>
      <div className="mt-2 grid grid-cols-7 gap-1.5">{cells.map((day,index) => day ? <button key={index} onClick={() => setSelected(day)} className={"relative aspect-square rounded-xl text-xs font-semibold " + (selected === day ? "bg-[#718c65] text-white" : "bg-white/70 text-slate-700")}>{day}{events[dateKey(day)]?.length ? <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-400" /> : null}</button> : <span key={index} />)}</div>
    </section>
    <section className="mt-4 rounded-[24px] border border-white/90 bg-white/72 p-4 backdrop-blur-xl"><h3 className="font-semibold">{new Date(year, month, selected).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</h3><div className="mt-3 space-y-2">{(events[key] ?? []).map((event,index) => <div key={event + index} className="rounded-2xl bg-[#eef4ea] px-3 py-2 text-sm">{event}</div>)}</div><div className="mt-3 flex gap-2"><input value={newEvent} onChange={event => setNewEvent(event.target.value)} placeholder="Add family event" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none" /><button onClick={() => { if (!newEvent.trim()) return; setEvents(current => ({ ...current, [key]: [...(current[key] ?? []), newEvent.trim()] })); setNewEvent(""); }} className="rounded-2xl bg-[#263b35] px-4 text-sm font-semibold text-white">Add</button></div></section>
  </FeatureShell>;
}

function MealPlanner() {
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
  const dates = Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return date; });
  const [meals, setMeals] = useStoredState<Record<string,string>>("lifedock-meal-plan", {});
  return <FeatureShell title="Weekly meal planner" subtitle="Plan the week together. Every change is saved automatically."><div className="space-y-2.5">{dates.map(date => { const key = date.toISOString().slice(0,10); return <label key={key} className="flex items-center gap-3 rounded-[22px] border border-white/90 bg-white/76 p-3 backdrop-blur-xl"><span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#e7f0e2] text-[#58704f]"><span className="text-[9px] font-bold uppercase">{date.toLocaleDateString("en-GB", { weekday: "short" })}</span><span className="text-lg font-semibold leading-none">{date.getDate()}</span></span><input value={meals[key] ?? ""} onChange={event => setMeals(current => ({ ...current, [key]: event.target.value }))} placeholder="What are we having?" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" /></label>; })}</div></FeatureShell>;
}

function PantryPlanner() {
  const [items, setItems] = useStoredState<PantryItem[]>("lifedock-kitchen-list", [{ id:"milk",name:"Milk",checked:false,section:"Shopping" },{ id:"pasta",name:"Pasta",checked:true,section:"Pantry" },{ id:"rice",name:"Rice",checked:true,section:"Pantry" }]);
  const [name,setName] = useState(""); const [section,setSection] = useState<PantryItem["section"]>("Shopping");
  return <FeatureShell title="Pantry & shopping" subtitle="See what is in the cupboard and keep one shared shopping list."><div className="grid grid-cols-2 gap-3">{(["Shopping","Pantry"] as const).map(group => <section key={group} className="rounded-[24px] border border-white/90 bg-white/76 p-3"><h2 className="font-semibold">{group}</h2><div className="mt-3 space-y-2">{items.filter(item => item.section === group).map(item => <button key={item.id} onClick={() => setItems(current => current.map(entry => entry.id === item.id ? { ...entry, checked: !entry.checked } : entry))} className="flex w-full items-center gap-2 rounded-xl bg-[#f2f6ef] px-2.5 py-2 text-left text-xs"><span className={"flex h-5 w-5 items-center justify-center rounded-full border " + (item.checked ? "border-[#739166] bg-[#739166] text-white" : "border-slate-300 bg-white")}>{item.checked ? <UiIcon name="check" className="h-3 w-3" /> : null}</span><span className={item.checked ? "text-slate-400 line-through" : "text-slate-700"}>{item.name}</span></button>)}</div></section>)}</div><section className="mt-4 rounded-[24px] border border-white/90 bg-white/76 p-4"><div className="flex gap-2"><input value={name} onChange={event => setName(event.target.value)} placeholder="Add an item" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" /><select value={section} onChange={event => setSection(event.target.value as PantryItem["section"])} className="rounded-2xl border border-slate-200 bg-white px-2 text-xs"><option>Shopping</option><option>Pantry</option></select><button onClick={() => { if (!name.trim()) return; setItems(current => [...current, { id: crypto.randomUUID(), name: name.trim(), checked:false, section }]); setName(""); }} className="rounded-2xl bg-[#263b35] px-4 text-sm font-semibold text-white">Add</button></div></section></FeatureShell>;
}

function Recipes() {
  const recipes = [{ id:"roast",name:"Sunday roast chicken",time:"1 hr 30",note:"Family favourite" },{ id:"pasta",name:"Tomato garden pasta",time:"25 min",note:"Quick weekday meal" },{ id:"salmon",name:"Lemon herb salmon",time:"35 min",note:"Fresh and simple" }];
  const [favourites,setFavourites] = useStoredState<string[]>("lifedock-favourite-recipes", ["roast"]);
  return <FeatureShell title="Family recipes" subtitle="The recipes everyone asks for, kept together in the Kitchen."><div className="space-y-3">{recipes.map(recipe => <article key={recipe.id} className="rounded-[24px] border border-white/90 bg-white/76 p-4"><div className="flex items-start justify-between"><div><h2 className="font-semibold">{recipe.name}</h2><p className="mt-1 text-xs text-slate-500">{recipe.time} · {recipe.note}</p></div><button aria-label="Toggle favourite" onClick={() => setFavourites(current => current.includes(recipe.id) ? current.filter(id => id !== recipe.id) : [...current, recipe.id])} className={"flex h-9 w-9 items-center justify-center rounded-full " + (favourites.includes(recipe.id) ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400")}><UiIcon name="star" className="h-4 w-4" /></button></div></article>)}</div></FeatureShell>;
}

function KitchenNotes() {
  const [notes,setNotes] = useStoredState("lifedock-kitchen-notes", "School bags by the door on Thursday.\nRemember Mum's birthday dinner on Saturday.");
  const [saved,setSaved] = useState(false);
  return <FeatureShell title="Family noticeboard" subtitle="A shared place for the small notes that keep home life moving."><section className="rounded-[28px] border border-white/90 bg-white/78 p-4"><textarea value={notes} onChange={event => { setNotes(event.target.value); setSaved(false); }} className="min-h-64 w-full resize-none rounded-[20px] border border-[#dfe8da] bg-[#fbfcf9] p-4 text-sm leading-7 outline-none" /><button onClick={() => setSaved(true)} className="mt-3 w-full rounded-2xl bg-[#263b35] py-3 text-sm font-semibold text-white">{saved ? "Saved" : "Save noticeboard"}</button></section></FeatureShell>;
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
  if (feature === "pantry") return <PantryPlanner />;
  if (feature === "recipes") return <Recipes />;
  if (feature === "notes") return <KitchenNotes />;
  return <KitchenDocuments />;
}
