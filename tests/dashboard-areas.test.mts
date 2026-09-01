import assert from "node:assert/strict";
import test from "node:test";

import {
  CORE_DASHBOARD_AREA_IDS,
  isDashboardAreaVisible,
  normaliseDashboardAreaIds,
} from "../lib/dashboard-areas.ts";
import type { OnboardingState } from "../lib/diarydock-data.ts";

function onboarding(overrides: Partial<OnboardingState> = {}): OnboardingState {
  return {
    completed: true,
    dashboardAreasConfigured: true,
    householdName: "Test household",
    householdMembers: "Just me",
    selectedRooms: [],
    starterDocuments: [],
    emergencyContactAdded: false,
    familyInviteAdded: false,
    lifeCheck: {
      homeTenure: "not-set",
      vehicles: "not-set",
      pets: "not-set",
      internationalTravel: "not-set",
      householdCollaboration: "not-set",
      documentStorage: "not-set",
      reminders: "not-set",
    },
    ...overrides,
  };
}

test("dashboard selections always retain the four essential areas", () => {
  assert.deepEqual(
    normaliseDashboardAreaIds(["garden", "garden", "unknown"]),
    [...CORE_DASHBOARD_AREA_IDS, "garden"],
  );
});

test("configured onboarding hides optional areas that were not selected", () => {
  const state = onboarding({ selectedRooms: normaliseDashboardAreaIds(["garage"]) });
  assert.equal(isDashboardAreaVisible("garage", state), true);
  assert.equal(isDashboardAreaVisible("garden", state), false);
  assert.equal(isDashboardAreaVisible("office", state), true);
});

test("existing users keep all areas until they configure their dashboard", () => {
  const state = onboarding({ dashboardAreasConfigured: false, selectedRooms: ["bedroom"] });
  assert.equal(isDashboardAreaVisible("garage", state), true);
  assert.equal(isDashboardAreaVisible("garden", state), true);
});
