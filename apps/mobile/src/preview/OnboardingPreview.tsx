import { useState } from "react";

import { ONBOARDING_SCHEMA_VERSION, type OnboardingSnapshot } from "@diarydock/onboarding";

import { OnboardingScreen } from "@mobile/onboarding/OnboardingScreen";
import type { MobileOnboardingModel } from "@mobile/onboarding/use-mobile-onboarding";

const initial: OnboardingSnapshot = {
  schemaVersion: ONBOARDING_SCHEMA_VERSION,
  revision: "2026-09-04T10:00:00.000Z",
  completed: false,
  dashboardAreasConfigured: false,
  profileName: "Amy Smyth",
  householdName: "The Smyth household",
  householdMembers: "Me and my partner",
  selectedAreaIds: [
    "office", "kitchen", "mailbox", "front-gate", "family-room", "garage", "driveway",
  ],
  answers: { homeTenure: "own", vehicles: "yes", pets: "no", internationalTravel: "yes",
    householdCollaboration: "yes", documentStorage: "yes", reminders: "yes", completedAt: null },
};

export function OnboardingPreview() {
  const [snapshot, setSnapshot] = useState(initial);
  const model = { busy: false, loading: false, message: null, online: true, snapshot,
    refresh: async () => undefined,
    save: async () => { const next = { ...snapshot, completed: true,
      dashboardAreasConfigured: true } as OnboardingSnapshot; setSnapshot(next); return next; },
  } as MobileOnboardingModel;
  return <OnboardingScreen model={model} onComplete={() => undefined} onSignOut={() => undefined} />;
}
