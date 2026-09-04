"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { normaliseDashboardAreaIds } from "@/lib/dashboard-areas";
import type { LifeCheckState } from "@/lib/diarydock-data";
import { estateAreas } from "@/lib/mock-data";
import {
  calculateOrganisationScore,
  isLifeCheckComplete,
} from "@/lib/organisation-score";
import {
  PRODUCT_ANALYTICS_EVENTS,
  trackProductAnalytics,
} from "@/lib/product-analytics";

import { initialsForName, onboardingStepTitles } from "./onboarding-model";

export function useOnboarding() {
  const router = useRouter();
  const { state, repositoryMode, updateState } = useDiaryDockData();
  const [step, setStep] = useState(0);
  const onboarding = state.onboarding;
  const selectedAreaIds = useMemo(
    () => normaliseDashboardAreaIds(onboarding.selectedRooms),
    [onboarding.selectedRooms],
  );
  const selectedAreas = estateAreas.filter((area) =>
    selectedAreaIds.includes(area.id),
  );
  const score = calculateOrganisationScore(state);

  const updateProfile = (field: "name" | "householdName", value: string) => {
    updateState((current) => ({
      ...current,
      settingsProfile:
        field === "name"
          ? {
              ...current.settingsProfile,
              name: value,
              initials: initialsForName(value),
            }
          : current.settingsProfile,
      onboarding: {
        ...current.onboarding,
        completed: false,
        householdName:
          field === "householdName" ? value : current.onboarding.householdName,
      },
    }));
  };

  const chooseHousehold = (value: string) => {
    updateState((current) => {
      const shouldShowFamily = value !== "Just me";
      const selectedRooms = shouldShowFamily
        ? [...current.onboarding.selectedRooms, "family-room"]
        : current.onboarding.selectedRooms.filter(
            (roomId) => roomId !== "family-room",
          );
      return {
        ...current,
        onboarding: {
          ...current.onboarding,
          completed: false,
          householdMembers: value,
          selectedRooms: normaliseDashboardAreaIds(selectedRooms),
        },
      };
    });
  };

  const toggleArea = (roomId: string) => {
    updateState((current) => {
      const selectedRooms = current.onboarding.selectedRooms.includes(roomId)
        ? current.onboarding.selectedRooms.filter((id) => id !== roomId)
        : [...current.onboarding.selectedRooms, roomId];
      return {
        ...current,
        onboarding: {
          ...current.onboarding,
          completed: false,
          selectedRooms: normaliseDashboardAreaIds(selectedRooms),
        },
      };
    });
  };

  const updateLifeCheck = <K extends keyof Omit<LifeCheckState, "completedAt">>(
    key: K,
    value: LifeCheckState[K],
  ) => {
    updateState((current) => {
      const roomForKey: Partial<
        Record<keyof Omit<LifeCheckState, "completedAt">, string>
      > = {
        vehicles: "garage",
        pets: "garden",
        internationalTravel: "driveway",
        householdCollaboration: "family-room",
      };
      const roomId = roomForKey[key];
      const nextRooms = roomId
        ? value === "yes"
          ? [...current.onboarding.selectedRooms, roomId]
          : current.onboarding.selectedRooms.filter((id) => id !== roomId)
        : current.onboarding.selectedRooms;
      const lifeCheck = {
        ...current.onboarding.lifeCheck,
        [key]: value,
        completedAt: undefined,
      };
      return {
        ...current,
        onboarding: {
          ...current.onboarding,
          completed: false,
          lifeCheck,
          selectedRooms: normaliseDashboardAreaIds(nextRooms),
        },
      };
    });
  };

  const canContinue =
    step === 0
      ? Boolean(
          state.settingsProfile.name.trim() && onboarding.householdName.trim(),
        )
      : step === 1
        ? Boolean(onboarding.householdMembers.trim())
        : step === 2
          ? onboarding.lifeCheck.homeTenure !== "not-set" &&
            onboarding.lifeCheck.vehicles !== "not-set" &&
            onboarding.lifeCheck.pets !== "not-set"
          : step === 3
            ? [
                onboarding.lifeCheck.internationalTravel,
                onboarding.lifeCheck.householdCollaboration,
                onboarding.lifeCheck.documentStorage,
                onboarding.lifeCheck.reminders,
              ].every((answer) => answer !== "not-set")
            : true;

  const finishSetup = () => {
    updateState((current) => {
      const lifeCheck = current.onboarding.lifeCheck;
      return {
        ...current,
        onboarding: {
          ...current.onboarding,
          completed: true,
          dashboardAreasConfigured: true,
          selectedRooms: normaliseDashboardAreaIds(
            current.onboarding.selectedRooms,
          ),
          lifeCheck: {
            ...lifeCheck,
            completedAt: isLifeCheckComplete(lifeCheck)
              ? new Date().toISOString()
              : undefined,
          },
        },
      };
    });
    void trackProductAnalytics(
      PRODUCT_ANALYTICS_EVENTS.ONBOARDING_COMPLETED,
      {},
    );
    router.push("/dashboard");
  };

  const continueSetup = () => {
    if (step === onboardingStepTitles.length - 1) finishSetup();
    else setStep((current) => current + 1);
  };

  return {
    state,
    repositoryMode,
    onboarding,
    step,
    setStep,
    selectedAreaIds,
    selectedAreas,
    score,
    updateProfile,
    chooseHousehold,
    toggleArea,
    updateLifeCheck,
    canContinue,
    continueSetup,
  };
}

export type OnboardingViewModel = ReturnType<typeof useOnboarding>;
