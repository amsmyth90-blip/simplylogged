import { lazy } from "react";

export const AtticScreen = lazy(() =>
  import("@mobile/attic/AtticScreen").then((module) => ({
    default: module.AtticScreen,
  })),
);
export const CaptureScreen = lazy(() =>
  import("@mobile/capture/CaptureScreen").then((module) => ({
    default: module.CaptureScreen,
  })),
);
export const EmergencyScreen = lazy(() =>
  import("@mobile/emergency/EmergencyScreen").then((module) => ({
    default: module.EmergencyScreen,
  })),
);
export const DrivewayScreen = lazy(() =>
  import("@mobile/travel/DrivewayScreen").then((module) => ({
    default: module.DrivewayScreen,
  })),
);
export const FamilyScreen = lazy(() =>
  import("@mobile/family/FamilyScreen").then((module) => ({
    default: module.FamilyScreen,
  })),
);
export const HouseholdInviteScreen = lazy(() =>
  import("@mobile/family/HouseholdInviteScreen").then((module) => ({
    default: module.HouseholdInviteScreen,
  })),
);
export const FilesScreen = lazy(() =>
  import("@mobile/files/FilesScreen").then((module) => ({
    default: module.FilesScreen,
  })),
);
export const GarageScreen = lazy(() =>
  import("@mobile/garage/GarageScreen").then((module) => ({
    default: module.GarageScreen,
  })),
);
export const GardenScreen = lazy(() =>
  import("@mobile/garden/GardenScreen").then((module) => ({
    default: module.GardenScreen,
  })),
);
export const GuardianScreen = lazy(() =>
  import("@mobile/guardian/GuardianScreen").then((module) => ({
    default: module.GuardianScreen,
  })),
);
export const HealthScreen = lazy(() =>
  import("@mobile/health/HealthScreen").then((module) => ({
    default: module.HealthScreen,
  })),
);
export const HomeHandoverScreen = lazy(() =>
  import("@mobile/home-handover/HomeHandoverScreen").then((module) => ({
    default: module.HomeHandoverScreen,
  })),
);
export const KitchenScreen = lazy(() =>
  import("@mobile/kitchen/KitchenScreen").then((module) => ({
    default: module.KitchenScreen,
  })),
);
export const KitchenNoticeboardScreen = lazy(() =>
  import("@mobile/kitchen/KitchenNoticeboardScreen").then((module) => ({
    default: module.KitchenNoticeboardScreen,
  })),
);
export const KitchenPlanningScreen = lazy(() =>
  import("@mobile/kitchen/KitchenPlanningScreen").then((module) => ({
    default: module.KitchenPlanningScreen,
  })),
);
export const LifeCheckScreen = lazy(() =>
  import("@mobile/life-check/LifeCheckScreen").then((module) => ({
    default: module.LifeCheckScreen,
  })),
);
export const MailboxScreen = lazy(() =>
  import("@mobile/mailbox/MailboxScreen").then((module) => ({
    default: module.MailboxScreen,
  })),
);
export const OfficeScreen = lazy(() =>
  import("@mobile/office/OfficeScreen").then((module) => ({
    default: module.OfficeScreen,
  })),
);
export const OnboardingScreen = lazy(() =>
  import("@mobile/onboarding/OnboardingScreen").then((module) => ({
    default: module.OnboardingScreen,
  })),
);
export const PhysicalLinksScreen = lazy(() =>
  import("@mobile/physical-links/PhysicalLinksScreen").then((module) => ({
    default: module.PhysicalLinksScreen,
  })),
);
export const ReminderBoard = lazy(() =>
  import("@mobile/reminders/ReminderBoard").then((module) => ({
    default: module.ReminderBoard,
  })),
);
export const RoomScreen = lazy(() =>
  import("@mobile/rooms/RoomScreen").then((module) => ({
    default: module.RoomScreen,
  })),
);
export const SearchScreen = lazy(() =>
  import("@mobile/search/SearchScreen").then((module) => ({
    default: module.SearchScreen,
  })),
);
export const SafeRoomScreen = lazy(() =>
  import("@mobile/wills/SafeRoomScreen").then((module) => ({
    default: module.SafeRoomScreen,
  })),
);
export const SettingsScreen = lazy(() =>
  import("@mobile/settings/SettingsScreen").then((module) => ({
    default: module.SettingsScreen,
  })),
);
export const TrustedAccessScreen = lazy(() =>
  import("@mobile/emergency-access/TrustedAccessScreen").then((module) => ({
    default: module.TrustedAccessScreen,
  })),
);
