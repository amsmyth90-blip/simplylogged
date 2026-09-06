import type { KitchenCalendarCategory } from "@diarydock/kitchen";
import type { MobileIconName } from "@mobile/components/MobileIcon";

export const calendarCategories: ReadonlyArray<{
  id: KitchenCalendarCategory;
  label: string;
  icon: MobileIconName;
  examples: ReadonlyArray<{ title: string; time: string }>;
}> = [
  { id: "appointments", label: "Appointments", icon: "calendar",
    examples: [{ title: "Dentist", time: "10:30" }, { title: "Eye test", time: "14:00" }] },
  { id: "school", label: "School", icon: "briefcase",
    examples: [{ title: "School pickup", time: "15:15" }, { title: "Parent meeting", time: "18:00" }] },
  { id: "meals", label: "Meals", icon: "leaf",
    examples: [{ title: "Family dinner", time: "18:30" }, { title: "Plan tomorrow", time: "19:30" }] },
  { id: "family", label: "Family", icon: "users",
    examples: [{ title: "Movie night", time: "20:00" }, { title: "Call Grandma", time: "17:00" }] },
] as const;

export function calendarDateKey(year: number, month: number, day: number) {
  return [year, String(month + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}

export function calendarCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= dayCount ? day : null;
  });
}
