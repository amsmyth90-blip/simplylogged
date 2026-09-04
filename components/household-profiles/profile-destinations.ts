import type { IconName } from "@/components/UiIcon";
import type { DiaryDockAppState, HouseholdProfile } from "@/lib/diarydock-data";

export type ProfileDestination = {
  detail: string;
  enabled: boolean;
  href: string;
  icon: IconName;
  label: string;
  tone: string;
};

export function buildProfileDestinations(
  profile: HouseholdProfile,
  state: Pick<DiaryDockAppState, "kidSchedules" | "reminders">
): ProfileDestination[] {
  const name = profile.name.toLowerCase();
  return [
    {
      label: "Schedules",
      icon: "calendar",
      enabled: profile.showInSchedules,
      detail: `${state.kidSchedules.filter((routine) => routine.childName.toLowerCase() === name).length} weekly activities`,
      tone: "bg-[#dfead9] text-[#5b7451]",
      href: `/family/schedules?person=${encodeURIComponent(profile.name)}`
    },
    {
      label: "Meals",
      icon: "home",
      enabled: profile.showInMeals,
      detail: "Included in the family meal plan",
      tone: "bg-[#f2dfd3] text-[#9a6547]",
      href: `/kitchen/meal-planner?profile=${encodeURIComponent(profile.id)}&person=${encodeURIComponent(profile.name)}`
    },
    {
      label: "Reminders",
      icon: "check",
      enabled: profile.showInReminders,
      detail: `${state.reminders.filter((reminder) => reminder.assignedTo?.toLowerCase() === name).length} assigned reminders`,
      tone: "bg-[#dce8f1] text-[#58778d]",
      href: `/reminders?person=${encodeURIComponent(profile.name)}`
    }
  ];
}
