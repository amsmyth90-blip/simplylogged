import { useMemo } from "react";

import type { HouseholdDirectory, HouseholdSchedulesSnapshot } from "@diarydock/household";

import { FamilyScreen } from "@mobile/family/FamilyScreen";
import { PreviewStore } from "./MobilePreview";

const household: HouseholdDirectory = {
  householdId: "30bb4d5a-037b-49ea-88bc-1ae5299cfda1",
  householdName: "Greenwood Household",
  currentUserId: "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51",
  role: "owner",
  members: [
    { userId: "f330a7d2-8ef1-4f6e-a6ec-118ea3a14f51", name: "Amy Smyth", relation: "Me", role: "owner", joinedAt: "2025-11-04T12:00:00.000Z" },
    { userId: "d02eddb5-ccf3-4434-a0b0-744f294a1d99", name: "Sam Greenwood", relation: "Partner", role: "member", joinedAt: "2026-01-18T12:00:00.000Z" },
  ],
  invites: [{
    token: "preview-secure-invite-token",
    email: "alex@example.com",
    name: "Alex Greenwood",
    relation: "Family",
    access: "viewer",
    createdAt: "2026-08-28T12:00:00.000Z",
    expiresAt: "2026-09-11T12:00:00.000Z",
  }],
  ownershipTransfer: null,
};

const schedules: HouseholdSchedulesSnapshot = {
  schemaVersion: 1,
  revision: "2026-09-04T09:00:00.000Z",
  people: ["Amy Smyth", "Sam Greenwood", "Alex Greenwood"],
  routines: [
    { id: "routine-1", title: "Swimming lessons", childName: "Alex Greenwood", day: 2,
      startTime: "16:00", endTime: "17:00", repeat: "weekly", location: "Riverside Pool",
      responsibleAdult: "Amy Smyth", transport: "Car", colour: "blue", paused: false },
    { id: "routine-2", title: "Household planning", childName: "Amy Smyth", day: 0,
      startTime: "19:00", endTime: "19:30", repeat: "weekly", location: "Home",
      responsibleAdult: "", transport: "", colour: "sage", paused: false },
    { id: "routine-3", title: "Football practice", childName: "Alex Greenwood", day: 5,
      startTime: "10:00", endTime: "11:30", repeat: "term-time", location: "Community Pitch",
      responsibleAdult: "Sam Greenwood", transport: "Car", colour: "gold", paused: false },
  ],
};

export function FamilyPreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return <FamilyScreen
    accessToken="preview-token-not-used-123456"
    disableScheduleOnline
    initialHousehold={household}
    initialScheduleSnapshot={schedules}
    store={store}
    syncStatus="READY"
    synchronize={async () => true}
    onBack={() => undefined}
    onNavigate={() => undefined}
    onScan={() => undefined}
  />;
}
