"use client";

import { useEffect, useState } from "react";

import { normaliseRecipeIngredient } from "@/lib/kitchen-recipes";

export type KitchenFeature =
  | "calendar"
  | "meal-planner"
  | "pantry"
  | "recipes"
  | "notes"
  | "documents";

export type CalendarCategory = "appointments" | "school" | "meals" | "family";
export type HouseholdEvent = {
  id: string;
  title: string;
  time: string;
  category: CalendarCategory;
};

export const calendarCategories: Array<{
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
  { id: "family", label: "Family", icon: "users", surface: "border-[#cfddea]", iconSurface: "bg-[#e3edf5] text-[#567795]", examples: [{ title: "Movie night", time: "20:00" }, { title: "Call Grandma", time: "17:00" }] },
];

export const dayPositions = [
  "left-1/2 top-[-4px] -translate-x-1/2",
  "right-[4%] top-[15%]",
  "right-[4%] top-[43%]",
  "right-[4%] bottom-1",
  "left-[4%] bottom-1",
  "left-[4%] top-[43%]",
  "left-[4%] top-[15%]",
];

export const platePositions = [
  { left: "50%", top: "24%" },
  { left: "59.5%", top: "41.5%" },
  { left: "60%", top: "57.5%" },
  { left: "59%", top: "79%" },
  { left: "40%", top: "79%" },
  { left: "39%", top: "57.5%" },
  { left: "40.5%", top: "41.5%" },
];

export function aggregateRecipeIngredients(ingredients: string[]) {
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
      fallback: current?.fallback ?? ingredient,
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

export function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      try {
        setValue(JSON.parse(stored) as T);
      } catch {
        // Keep defaults when an older local value is corrupt.
      }
    }
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (loaded) window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, loaded, value]);
  return [value, setValue] as const;
}

export function useFullscreenScrollLock() {
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
}
