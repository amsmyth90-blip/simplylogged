import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@diarydock/design-system/theme.css";

import "@mobile/auth/auth.css";
import "@mobile/attic/attic.css";
import "@mobile/attic/attic-editor.css";
import "@mobile/attic/attic-records.css";
import "@mobile/capture/capture.css";
import "@mobile/components/mobile-navigation.css";
import "@mobile/emergency/emergency.css";
import "@mobile/emergency/emergency-sections.css";
import "@mobile/emergency-access/trusted-access.css";
import "@mobile/files/file-editor.css";
import "@mobile/files/files.css";
import "@mobile/files/document-viewer.css";
import "@mobile/family/family.css";
import "@mobile/guardian/guardian.css";
import "@mobile/garage/garage.css";
import "@mobile/garage/garage-records.css";
import "@mobile/garden/garden.css";
import "@mobile/garden/garden-records.css";
import "@mobile/health/health.css";
import "@mobile/health/health-editor.css";
import "@mobile/health/health-records.css";
import "@mobile/home-handover/home-handover.css";
import "@mobile/garage/garage-editor.css";
import "@mobile/kitchen/kitchen.css";
import "@mobile/kitchen/noticeboard.css";
import "@mobile/kitchen/notice-editor.css";
import "@mobile/kitchen/planning.css";
import "@mobile/life-check/life-check.css";
import "@mobile/mailbox/mailbox.css";
import "@mobile/onboarding/onboarding.css";
import "@mobile/physical-links/physical-links.css";
import { MobileApp } from "@mobile/MobileApp";
import "@mobile/mobile.css";
import "@mobile/reminders/reminder-editor.css";
import "@mobile/reminders/reminder-sections.css";
import "@mobile/reminders/reminders.css";
import "@mobile/rooms/rooms.css";
import "@mobile/search/ask.css";
import "@mobile/search/search.css";
import "@mobile/settings/settings.css";
import "@mobile/travel/travel.css";
import "@mobile/travel/travel-records.css";
import "@mobile/travel/travel-links.css";
import "@mobile/wills/wills.css";
import "@mobile/wills/wills-editor.css";
import "@mobile/wills/wills-records.css";
import "@mobile/components/progressive-record-list.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error(
    "DiaryDock could not start because the application root is missing.",
  );
}

async function start() {
  let Application = MobileApp;
  const previewEnabled =
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_MOBILE_PREVIEW === "true";
  const preview = new URLSearchParams(window.location.search).get("preview");
  if (previewEnabled && preview === "reminders") {
    Application = (await import("@mobile/preview/MobilePreview")).MobilePreview;
  } else if (previewEnabled && preview === "login") {
    Application = (await import("@mobile/preview/LoginPreview")).LoginPreview;
  } else if (previewEnabled && preview === "signup") {
    Application = (await import("@mobile/preview/SignUpPreview")).SignUpPreview;
  } else if (previewEnabled && preview === "forgot-password") {
    Application = (await import("@mobile/preview/ForgotPasswordPreview")).ForgotPasswordPreview;
  } else if (previewEnabled && preview === "reset-password") {
    Application = (await import("@mobile/preview/ResetPasswordPreview")).ResetPasswordPreview;
  } else if (previewEnabled && preview === "home") {
    Application = (await import("@mobile/preview/HomePreview")).HomePreview;
  } else if (previewEnabled && preview === "files") {
    Application = (await import("@mobile/preview/FilesPreview")).FilesPreview;
  } else if (previewEnabled && preview === "capture") {
    Application = (await import("@mobile/preview/CapturePreview"))
      .CapturePreview;
  } else if (previewEnabled && preview === "room") {
    Application = (await import("@mobile/preview/RoomPreview")).RoomPreview;
  } else if (previewEnabled && preview === "settings") {
    Application = (await import("@mobile/preview/SettingsPreview"))
      .SettingsPreview;
  } else if (previewEnabled && preview === "family") {
    Application = (await import("@mobile/preview/FamilyPreview")).FamilyPreview;
  } else if (previewEnabled && preview === "household-invite") {
    Application = (await import("@mobile/preview/HouseholdInvitePreview")).HouseholdInvitePreview;
  } else if (previewEnabled && preview === "search") {
    Application = (await import("@mobile/preview/SearchPreview")).SearchPreview;
  } else if (previewEnabled && preview === "guardian") {
    Application = (await import("@mobile/preview/GuardianPreview"))
      .GuardianPreview;
  } else if (previewEnabled && preview === "emergency") {
    Application = (await import("@mobile/preview/EmergencyPreview"))
      .EmergencyPreview;
  } else if (previewEnabled && preview === "trusted-access") {
    Application = (await import("@mobile/preview/TrustedAccessPreview"))
      .TrustedAccessPreview;
  } else if (previewEnabled && preview === "kitchen") {
    Application = (await import("@mobile/preview/KitchenPreview"))
      .KitchenPreview;
  } else if (previewEnabled && preview === "kitchen-noticeboard") {
    Application = (await import("@mobile/preview/KitchenNoticeboardPreview"))
      .KitchenNoticeboardPreview;
  } else if (previewEnabled && preview === "kitchen-recipes") {
    Application = (await import("@mobile/preview/KitchenPlanningPreview"))
      .KitchenRecipesPreview;
  } else if (previewEnabled && preview === "kitchen-meals") {
    Application = (await import("@mobile/preview/KitchenPlanningPreview"))
      .KitchenMealsPreview;
  } else if (previewEnabled && preview === "garage") {
    Application = (await import("@mobile/preview/GaragePreview")).GaragePreview;
  } else if (previewEnabled && preview === "travel") {
    Application = (await import("@mobile/preview/TravelPreview")).TravelPreview;
  } else if (previewEnabled && preview === "mailbox") {
    Application = (await import("@mobile/preview/MailboxPreview")).MailboxPreview;
  } else if (previewEnabled && preview === "garden") {
    Application = (await import("@mobile/preview/GardenPreview")).GardenPreview;
  } else if (previewEnabled && preview === "attic") {
    Application = (await import("@mobile/preview/AtticPreview")).AtticPreview;
  } else if (previewEnabled && preview === "health") {
    Application = (await import("@mobile/preview/HealthPreview")).HealthPreview;
  } else if (previewEnabled && preview === "wills") {
    Application = (await import("@mobile/preview/WillsPreview")).WillsPreview;
  } else if (previewEnabled && preview === "office") {
    Application = (await import("@mobile/preview/OfficePreview")).OfficePreview;
  } else if (previewEnabled && preview === "physical-links") {
    Application = (await import("@mobile/preview/PhysicalLinksPreview"))
      .PhysicalLinksPreview;
  } else if (previewEnabled && preview === "life-check") {
    Application = (await import("@mobile/preview/LifeCheckPreview")).LifeCheckPreview;
  } else if (previewEnabled && preview === "home-handover") {
    Application = (await import("@mobile/preview/HomeHandoverPreview")).HomeHandoverPreview;
  } else if (previewEnabled && preview === "onboarding") {
    Application = (await import("@mobile/preview/OnboardingPreview")).OnboardingPreview;
  }
  createRoot(root!).render(
    <StrictMode>
      <Application />
    </StrictMode>,
  );
}

void start();
