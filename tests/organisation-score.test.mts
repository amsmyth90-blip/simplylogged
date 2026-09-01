import assert from "node:assert/strict";
import test from "node:test";

import type { DiaryDockAppState } from "../lib/diarydock-data.ts";
import { calculateOrganisationScore } from "../lib/organisation-score.ts";

function state(overrides: Partial<DiaryDockAppState> = {}) {
  return {
    onboarding: {
      completed: true,
      dashboardAreasConfigured: true,
      householdName: "Test home",
      householdMembers: "Just me",
      selectedRooms: [],
      starterDocuments: [],
      emergencyContactAdded: true,
      familyInviteAdded: false,
      lifeCheck: {
        homeTenure: "not-applicable",
        vehicles: "no",
        pets: "no",
        internationalTravel: "no",
        householdCollaboration: "no",
        documentStorage: "no",
        reminders: "no",
        completedAt: "2026-09-01T00:00:00.000Z"
      }
    },
    settingsProfile: { name: "Test User", email: "", plan: "", memberSince: "", initials: "TU" },
    vaultDocuments: [{ id: "doc-1", title: "ID", roomId: "office", reviewStatus: "reviewed" }],
    reminders: [],
    vehicles: { vehicles: [] },
    trips: { trips: [] },
    insurance: { policies: [], claims: [], homeInventory: [], homeCoverChecks: [], lifeBeneficiaries: [], lifePolicyDetails: [] },
    bills: { bills: [] },
    homeInfo: [],
    emergencyContacts: [{ id: "contact-1" }],
    householdMembers: [],
    householdProfiles: [],
    familyInvites: [],
    ...overrides
  } as unknown as DiaryDockAppState;
}

test("no pet or vehicle excludes those categories without a penalty", () => {
  const result = calculateOrganisationScore(state());
  assert.equal(result.score, 100);
  assert.equal(result.categories.some((category) => category.id === "pets"), false);
  assert.equal(result.categories.some((category) => category.id === "vehicles"), false);
});

test("an applicable vehicle category is included and fully explainable", () => {
  const base = state();
  base.onboarding.lifeCheck.vehicles = "yes";
  const result = calculateOrganisationScore(base);
  const vehicles = result.categories.find((category) => category.id === "vehicles");
  assert.deepEqual(vehicles && { score: vehicles.score, completed: vehicles.completed, total: vehicles.total }, { score: 0, completed: 0, total: 3 });
  assert.equal(result.recommendations.some((item) => item.id === "vehicle-record" && item.href === "/room/garage"), true);
  assert.ok(result.score < 100);
});

test("unanswered applicability produces a direct Life Check recommendation", () => {
  const base = state();
  base.onboarding.lifeCheck.pets = "not-set";
  const result = calculateOrganisationScore(base);
  assert.equal(result.answered, 6);
  assert.equal(result.recommendations[0]?.id, "finish-life-check");
});
