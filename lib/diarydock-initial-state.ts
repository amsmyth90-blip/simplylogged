import { createInitialBillsRecord, hydrateBillsRecord } from "@/lib/bill-records";
import { createInitialContractsRecord, hydrateContractsRecord } from "@/lib/contract-records";
import { createInitialCorrespondenceCollection, hydrateCorrespondenceCollection } from "@/lib/correspondence-records";
import type { DiaryDockAppState, KitchenNotice, MailItem, OnboardingState, SettingGroup, WillsWishesRecord } from "@/lib/diarydock-types";
import { hydrateFamilyStories } from "@/lib/family-story-records";
import { createInitialHealthRecord, hydrateHealthRecord } from "@/lib/health-records";
import { createInitialInsuranceRecord, hydrateInsuranceRecord } from "@/lib/insurance-records";
import { createInitialLettersRecord, hydrateLettersRecord } from "@/lib/letter-records";
import { roomDetails } from "@/lib/mock-data";
import { createInitialProfessionalContactsRecord, hydrateProfessionalContactsRecord } from "@/lib/professional-contact-records";
import { createInitialTravelChecklistRecord, hydrateTravelChecklistRecord } from "@/lib/travel-checklist-records";
import { createInitialTripsRecord, hydrateTripsRecord } from "@/lib/trip-records";
import { createInitialVehiclesRecord, hydrateVehiclesRecord } from "@/lib/vehicle-records";
import { createInitialWillRecord, hydrateWillRecord } from "@/lib/will-records";

export const initialMailboxItems: MailItem[] = [];
export const initialKitchenNoticeboard: KitchenNotice[] = [];
export const initialWillsWishes: WillsWishesRecord = {
  fullName: "", address: "", dateOfBirth: "", willStatus: "", executorName: "", solicitorName: "",
  originalWillLocation: "", funeralPreference: "", funeralDetails: "", musicAndReadings: "",
  personalMessage: "", specialBelongings: "", petCareWishes: "", trustedPeople: "", reviewFrequency: "",
  lastReviewed: "", updatedAt: "", myWill: createInitialWillRecord(), lettersOfWishes: createInitialLettersRecord()
};

export const initialSettingGroups: SettingGroup[] = [
  { title: "Notifications", icon: "bell", rows: [
    { kind: "toggle", label: "Reminder alerts", hint: "Nudges for due and overdue items", value: true },
    { kind: "toggle", label: "Mailbox arrivals", hint: "When a new item lands to be filed", value: true },
    { kind: "toggle", label: "Weekly digest", hint: "A calm Sunday summary of the estate", value: false }
  ] },
  { title: "Privacy & security", icon: "shield", rows: [
    { kind: "value", label: "Document storage", hint: "Authenticated access with short-lived file links", value: "Private" },
    { kind: "value", label: "End-to-end encryption", hint: "Not currently enabled for Vault documents", value: "Not enabled" },
    { kind: "link", label: "Account recovery", hint: "Use the secure password reset flow", href: "/forgot-password" },
    { kind: "link", label: "Product analytics", hint: "Off by default; choose what to share", href: "/analytics-privacy" }
  ] },
  { title: "Appearance", icon: "sun", rows: [
    { kind: "value", label: "Theme", value: "Light" },
    { kind: "value", label: "Estate map style", value: "Daylight" },
    { kind: "toggle", label: "Reduce motion", value: false }
  ] },
  { title: "Household", icon: "home", rows: [
    { kind: "value", label: "Home address", value: "Not added" },
    { kind: "link", label: "Family & access", hint: "Manage household members", href: "/family" },
    { kind: "link", label: "Emergency panel", hint: "Keep important contacts ready", href: "/emergency" },
    { kind: "link", label: "Physical Links", hint: "Manage private QR and NFC tags", href: "/physical-links" },
    { kind: "link", label: "Home Handover", hint: "Prepare a private property handover draft", href: "/home-handover" }
  ] },
  { title: "Data & backups", icon: "archive", rows: [
    { kind: "toggle", label: "Nightly backup", hint: "Configure secure backups", value: true },
    { kind: "link", label: "Export estate archive", hint: "Everything as a sealed file", href: "/files" }
  ] }
];

export function createInitialOnboardingState(): OnboardingState {
  return {
    completed: false,
    dashboardAreasConfigured: false,
    householdName: "",
    householdMembers: "",
    selectedRooms: [],
    emergencyContactAdded: false,
    familyInviteAdded: false,
    lifeCheck: { homeTenure: "not-set", vehicles: "not-set", pets: "not-set", internationalTravel: "not-set", householdCollaboration: "not-set", documentStorage: "not-set", reminders: "not-set" },
    starterDocuments: [
      { id: "passport", title: "Passport or ID", roomId: "office", roomName: "Office", done: false },
      { id: "home-insurance", title: "Home insurance", roomId: "safe-room", roomName: "Safe Room", done: false },
      { id: "car-insurance", title: "Car insurance or MOT", roomId: "garage", roomName: "Garage", done: false },
      { id: "gp-info", title: "GP and health details", roomId: "bedroom", roomName: "Bedroom", done: false },
      { id: "will", title: "Will or power of attorney", roomId: "office", roomName: "Office", done: false },
      { id: "pet-record", title: "Pet vaccination record", roomId: "garden", roomName: "Garden", done: false }
    ]
  };
}

function mapRoomEntries<T>(selector: (roomId: string) => T) {
  return Object.fromEntries(Object.keys(roomDetails).map((roomId) => [roomId, selector(roomId)]));
}

export function getOnboardingProgress(onboarding: OnboardingState) {
  const checks = [Boolean(onboarding.householdName.trim()), Boolean(onboarding.householdMembers.trim()), onboarding.selectedRooms.length >= 4, onboarding.completed];
  const completed = checks.filter(Boolean).length;
  return { completed, total: checks.length, percent: Math.round((completed / checks.length) * 100) };
}

export function hydrateDiaryDockState(state: DiaryDockAppState): DiaryDockAppState {
  const initialOnboarding = createInitialOnboardingState();
  return {
    ...state,
    reminders: state.reminders ?? [],
    vaultDocuments: state.vaultDocuments ?? [],
    householdMembers: state.householdMembers ?? [],
    familyInvites: state.familyInvites ?? [],
    careContacts: state.careContacts ?? [],
    emergencyContacts: state.emergencyContacts ?? [],
    emergencyPlans: state.emergencyPlans ?? [],
    homeInfo: state.homeInfo ?? [],
    roomTasks: state.roomTasks ?? mapRoomEntries(() => []),
    roomDocuments: state.roomDocuments ?? mapRoomEntries(() => []),
    roomActivity: state.roomActivity ?? mapRoomEntries(() => []),
    mailboxItems: state.mailboxItems ?? [],
    onboarding: { ...initialOnboarding, ...(state.onboarding ?? {}), lifeCheck: { ...initialOnboarding.lifeCheck, ...(state.onboarding?.lifeCheck ?? {}) } },
    mealPlan: state.mealPlan ?? {},
    kitchenRecipes: state.kitchenRecipes ?? [],
    kitchenCookingProgress: state.kitchenCookingProgress ?? null,
    kitchenNoticeboard: state.kitchenNoticeboard ?? [],
    familyCalendarEvents: state.familyCalendarEvents ?? [],
    kidSchedules: state.kidSchedules ?? [],
    householdProfiles: state.householdProfiles ?? [],
    willsWishes: { ...initialWillsWishes, ...(state.willsWishes ?? {}), myWill: hydrateWillRecord(state.willsWishes?.myWill), lettersOfWishes: hydrateLettersRecord(state.willsWishes?.lettersOfWishes) },
    bills: hydrateBillsRecord(state.bills),
    insurance: hydrateInsuranceRecord(state.insurance),
    contracts: hydrateContractsRecord(state.contracts),
    correspondence: hydrateCorrespondenceCollection(state.correspondence),
    professionalContacts: hydrateProfessionalContactsRecord(state.professionalContacts),
    vehicles: hydrateVehiclesRecord(state.vehicles),
    trips: hydrateTripsRecord(state.trips),
    travelChecklist: hydrateTravelChecklistRecord(state.travelChecklist),
    health: hydrateHealthRecord(state.health),
    familyStories: hydrateFamilyStories(state.familyStories),
    kitchenItems: state.kitchenItems ?? []
  };
}

export function createInitialDiaryDockState(): DiaryDockAppState {
  return hydrateDiaryDockState({
    reminders: [], vaultDocuments: [], householdMembers: [], familyInvites: [], careContacts: [], emergencyContacts: [], emergencyPlans: [], homeInfo: [],
    settingsProfile: { name: "", email: "", plan: "DiaryDock", memberSince: "", initials: "" },
    settingsGroups: initialSettingGroups,
    roomTasks: mapRoomEntries(() => []), roomDocuments: mapRoomEntries(() => []), roomActivity: mapRoomEntries(() => []),
    mailboxItems: [], onboarding: createInitialOnboardingState(), mealPlan: {}, kitchenRecipes: [], kitchenCookingProgress: null,
    kitchenNoticeboard: [], familyCalendarEvents: [], kidSchedules: [], householdProfiles: [], willsWishes: initialWillsWishes,
    bills: createInitialBillsRecord(), insurance: createInitialInsuranceRecord(), contracts: createInitialContractsRecord(),
    correspondence: createInitialCorrespondenceCollection(), professionalContacts: createInitialProfessionalContactsRecord(),
    vehicles: createInitialVehiclesRecord(), trips: createInitialTripsRecord(), travelChecklist: createInitialTravelChecklistRecord(),
    health: createInitialHealthRecord(), familyStories: [], kitchenItems: []
  });
}
