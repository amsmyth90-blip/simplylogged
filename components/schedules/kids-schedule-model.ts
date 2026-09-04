import type { KidScheduleRoutine } from "@/lib/diarydock-data";

export type PlannerMode = "week" | "editor";
export type HouseholdStyle = "children" | "adults" | "shared" | "solo";
export type RoutineDraft = Omit<KidScheduleRoutine, "id">;

export const scheduleDayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const scheduleTimeLabels = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM"];
export const scheduleColours: KidScheduleRoutine["colour"][] = ["sage", "blue", "clay", "gold"];
export const scheduleColourStyles: Record<KidScheduleRoutine["colour"], { card: string; dot: string; solid: string }> = {
  sage: { card: "border-[#b9cba8] bg-[#dfe9d6] text-[#3f5637]", dot: "bg-[#729164]", solid: "bg-[#729164]" },
  blue: { card: "border-[#b9cee0] bg-[#dceaf4] text-[#405d72]", dot: "bg-[#7198b5]", solid: "bg-[#7198b5]" },
  clay: { card: "border-[#e4c5b1] bg-[#f2dfd2] text-[#7c513a]", dot: "bg-[#bd7c58]", solid: "bg-[#bd7c58]" },
  gold: { card: "border-[#e2d1a9] bg-[#f3e8cb] text-[#765e2f]", dot: "bg-[#b5964e]", solid: "bg-[#b5964e]" }
};

export const emptyRoutineDraft: RoutineDraft = {
  title: "",
  childName: "",
  day: 2,
  startTime: "16:00",
  endTime: "17:00",
  repeat: "weekly",
  location: "",
  responsibleAdult: "",
  transport: "Car",
  colour: "blue",
  paused: false
};

export function minutesFromScheduleTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatScheduleTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(2026, 0, 1, hours, minutes).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
}

export function scheduleActivityPosition(routine: KidScheduleRoutine) {
  const dayStart = 8 * 60;
  const dayEnd = 19 * 60;
  const total = dayEnd - dayStart;
  const start = Math.min(dayEnd, Math.max(dayStart, minutesFromScheduleTime(routine.startTime)));
  const end = Math.min(dayEnd, Math.max(start + 30, minutesFromScheduleTime(routine.endTime)));
  return { top: `${((start - dayStart) / total) * 100}%`, height: `${Math.max(10, ((end - start) / total) * 100)}%` };
}

export function groupRoutinesBySlot(routines: KidScheduleRoutine[]) {
  const groups = new Map<string, KidScheduleRoutine[]>();
  routines.sort((first, second) => `${first.startTime}-${first.endTime}-${first.childName}`.localeCompare(`${second.startTime}-${second.endTime}-${second.childName}`)).forEach((routine) => {
    const key = `${routine.startTime}-${routine.endTime}`;
    groups.set(key, [...(groups.get(key) ?? []), routine]);
  });
  return Array.from(groups.entries()).map(([key, slotRoutines]) => ({ key, routines: slotRoutines }));
}

export const scheduleTitleFor = (style: HouseholdStyle) => ({ children: "Family Schedules", adults: "Adult Schedules", shared: "Home Rota", solo: "My Schedule" })[style];
export const householdLabelFor = (style: HouseholdStyle) => ({ children: "Family with children", adults: "Adults only", shared: "Shared home", solo: "Just me" })[style];
