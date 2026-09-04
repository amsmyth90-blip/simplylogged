"use client";

import { PageHeader } from "@/components/PageHeader";

import {
  AreasStep,
  DashboardPreviewStep,
} from "./onboarding/OnboardingAreaSteps";
import {
  OnboardingNavigation,
  OnboardingProgress,
} from "./onboarding/OnboardingControls";
import {
  LifeDetailsStep,
  PreferencesStep,
} from "./onboarding/OnboardingLifeSteps";
import {
  HouseholdStep,
  ProfileStep,
} from "./onboarding/OnboardingProfileSteps";
import { useOnboarding } from "./onboarding/useOnboarding";

export function OnboardingWorkspace() {
  const view = useOnboarding();

  return (
    <div className="immersive-page">
      <PageHeader
        eyebrow="Welcome to DiaryDock"
        title="Let’s make it yours"
        subtitle="A few simple questions will create a calmer dashboard for your life. Nothing is permanent."
        heroImage="/images/estate-map-light.png"
        heroPosition="center 20%"
        badge={
          view.repositoryMode === "supabase" ? "Private setup" : "Session setup"
        }
      />
      <OnboardingProgress view={view} />
      {view.step === 0 ? <ProfileStep view={view} /> : null}
      {view.step === 1 ? <HouseholdStep view={view} /> : null}
      {view.step === 2 ? <LifeDetailsStep view={view} /> : null}
      {view.step === 3 ? <PreferencesStep view={view} /> : null}
      {view.step === 4 ? <AreasStep view={view} /> : null}
      {view.step === 5 ? <DashboardPreviewStep view={view} /> : null}
      <OnboardingNavigation view={view} />
    </div>
  );
}
