"use client";

import {
  AreasStep,
  DashboardPreviewStep,
} from "./onboarding/OnboardingAreaSteps";
import { OnboardingBotanicalHeader } from "./onboarding/OnboardingBotanicalHeader";
import {
  OnboardingNavigation,
  OnboardingProgress,
} from "./onboarding/OnboardingControls";
import {
  LifeDetailsStep,
} from "./onboarding/OnboardingLifeSteps";
import {
  HouseholdStep,
  ProfileStep,
} from "./onboarding/OnboardingProfileSteps";
import { useOnboarding } from "./onboarding/useOnboarding";

export function OnboardingWorkspace() {
  const view = useOnboarding();

  return (
    <div className="onboarding-shell space-y-5 pb-2">
      <OnboardingBotanicalHeader badge={view.repositoryMode === "supabase"
        ? "Private setup" : "Session setup"} />
      <OnboardingProgress view={view} />
      {view.step === 0 ? <ProfileStep view={view} /> : null}
      {view.step === 1 ? <HouseholdStep view={view} /> : null}
      {view.step === 2 ? <LifeDetailsStep view={view} /> : null}
      {view.step === 3 ? <AreasStep view={view} /> : null}
      {view.step === 4 ? <DashboardPreviewStep view={view} /> : null}
      <OnboardingNavigation view={view} />
    </div>
  );
}
