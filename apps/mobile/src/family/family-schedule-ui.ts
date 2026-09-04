import type {
  HouseholdScheduleRoutine,
  SaveHouseholdScheduleRoutine,
} from "@diarydock/household";

export const familyScheduleDays = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

export const emptyFamilyRoutine: SaveHouseholdScheduleRoutine = {
  title: "",
  childName: "",
  day: 0,
  startTime: "16:00",
  endTime: "17:00",
  repeat: "weekly",
  location: "",
  responsibleAdult: "",
  transport: "Car",
  colour: "blue",
  paused: false,
};

export function scheduleMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function familyScheduleTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(2026, 0, 1, hours, minutes).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function sortFamilyRoutines(routines: HouseholdScheduleRoutine[]) {
  return [...routines].sort((first, second) =>
    `${first.day}-${first.startTime}-${first.title}`
      .localeCompare(`${second.day}-${second.startTime}-${second.title}`));
}
