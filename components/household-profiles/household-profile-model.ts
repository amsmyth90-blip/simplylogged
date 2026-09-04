import type { DiaryDockAppState, HouseholdProfile } from "@/lib/diarydock-data";

export type ProfileDraft = Omit<HouseholdProfile, "id" | "linkedUserId">;
export type ProfileSurfaceKey =
  | "showInSchedules"
  | "showInMeals"
  | "showInReminders";

export const profileColours: HouseholdProfile["colour"][] = [
  "sage",
  "blue",
  "clay",
  "gold"
];

export const profileColourStyles: Record<
  HouseholdProfile["colour"],
  { avatar: string; dot: string }
> = {
  sage: { avatar: "bg-[#dce8d5] text-[#52694a]", dot: "bg-[#759166]" },
  blue: { avatar: "bg-[#dce9f2] text-[#48677b]", dot: "bg-[#789ab3]" },
  clay: { avatar: "bg-[#f0ded3] text-[#805641]", dot: "bg-[#b97d5c]" },
  gold: { avatar: "bg-[#f2e7c9] text-[#79612d]", dot: "bg-[#b4974d]" }
};

export const profileKindLabels: Record<HouseholdProfile["kind"], string> = {
  adult: "Adult",
  child: "Child",
  housemate: "Housemate",
  trusted: "Trusted person"
};

export const profileAccessLabels: Record<HouseholdProfile["appAccess"], string> = {
  none: "Profile only",
  viewer: "Viewer access",
  member: "Can contribute"
};

export const emptyProfileDraft: ProfileDraft = {
  name: "",
  kind: "adult",
  relationship: "",
  colour: "sage",
  appAccess: "none",
  showInSchedules: true,
  showInMeals: true,
  showInReminders: true
};

export function profileInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "LD"
  );
}

export function buildHouseholdProfiles(
  state: Pick<DiaryDockAppState, "householdMembers" | "householdProfiles" | "kidSchedules">
) {
  const saved = state.householdProfiles;
  const accountProfiles: HouseholdProfile[] = state.householdMembers
    .filter(
      (member) =>
        !saved.some(
          (profile) =>
            profile.id === member.id ||
            profile.linkedUserId === member.userId ||
            profile.name.toLowerCase() === member.name.toLowerCase()
        )
    )
    .map((member, index) => ({
      id: member.id,
      name: member.name,
      kind: "adult",
      relationship: member.role || "Household member",
      colour: profileColours[index % profileColours.length],
      appAccess:
        member.accessTone === "full" || member.accessTone === "shared" ? "member" : "viewer",
      showInSchedules: true,
      showInMeals: true,
      showInReminders: true,
      linkedUserId: member.userId ?? member.id
    }));

  const knownNames = [...saved, ...accountProfiles].map((profile) =>
    profile.name.toLowerCase()
  );
  const scheduleProfiles: HouseholdProfile[] = Array.from(
    new Set(state.kidSchedules.map((routine) => routine.childName.trim()).filter(Boolean))
  )
    .filter((name) => !knownNames.includes(name.toLowerCase()))
    .map((name, index) => ({
      id: `schedule-profile-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      kind: "child",
      relationship: "Child",
      colour:
        profileColours[(saved.length + accountProfiles.length + index) % profileColours.length],
      appAccess: "none",
      showInSchedules: true,
      showInMeals: true,
      showInReminders: true
    }));

  return [...saved, ...accountProfiles, ...scheduleProfiles];
}

export function canRemoveProfile(profile: HouseholdProfile | undefined) {
  return Boolean(profile && !profile.id.startsWith("schedule-profile-") && !profile.linkedUserId);
}
