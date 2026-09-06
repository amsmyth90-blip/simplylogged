import type { LifeCheckTarget } from "@diarydock/life-check";
import type { MobileDestination } from "@mobile/components/MobileBottomNav";

const kitchenDestinations: Record<string, MobileDestination> = {
  calendar: "KITCHEN_CALENDAR",
  documents: "FILES",
  "meal-planner": "KITCHEN_MEALS",
  noticeboard: "KITCHEN_NOTICES",
  pantry: "KITCHEN",
  recipes: "KITCHEN_RECIPES",
};

const lifeCheckRooms: Partial<Record<LifeCheckTarget, string>> = {
  DRIVEWAY: "driveway",
  FRONT_GATE: "front-gate",
  GARAGE: "garage",
  GARDEN: "garden",
  MAILBOX: "mailbox",
  OFFICE: "office",
};

export function kitchenDestinationFor(actionId: string): MobileDestination {
  return kitchenDestinations[actionId] ?? "KITCHEN";
}

export function lifeCheckRoomFor(target: LifeCheckTarget): string | undefined {
  return lifeCheckRooms[target];
}
