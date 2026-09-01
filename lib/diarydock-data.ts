"use client";

import {
  roomDetails,
  type EmergencyContact,
  type EmergencyPlan,
  type FamilyMember,
  type Reminder,
  type RoomActivity,
  type RoomDocument,
  type RoomTask,
  type VaultDocument,
} from "@/lib/mock-data";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  loadHouseholdDirectory,
  type HouseholdDirectory,
  type HouseholdRole,
} from "@/lib/household-sharing";
import { loadStructuredDocumentsAndReminders } from "@/lib/structured-data";
import type { MealPlan } from "@/lib/meal-planner";
import {
  type KitchenCookingProgress,
  type KitchenRecipe,
} from "@/lib/kitchen-recipes";
import {
  createInitialWillRecord,
  hydrateWillRecord,
  type WillRecord,
} from "@/lib/will-records";
import {
  createInitialLettersRecord,
  hydrateLettersRecord,
  type LettersOfWishesRecord,
} from "@/lib/letter-records";
import {
  createInitialBillsRecord,
  hydrateBillsRecord,
  type BillsRecord,
} from "@/lib/bill-records";
import {
  createInitialInsuranceRecord,
  hydrateInsuranceRecord,
  type InsuranceRecord,
} from "@/lib/insurance-records";
import {
  createInitialContractsRecord,
  hydrateContractsRecord,
  type ContractsRecord,
} from "@/lib/contract-records";
import {
  createInitialCorrespondenceCollection,
  hydrateCorrespondenceCollection,
  type CorrespondenceCollection,
} from "@/lib/correspondence-records";
import {
  createInitialProfessionalContactsRecord,
  hydrateProfessionalContactsRecord,
  type ProfessionalContactsRecord,
} from "@/lib/professional-contact-records";
import {
  createInitialVehiclesRecord,
  hydrateVehiclesRecord,
  type VehiclesRecord,
} from "@/lib/vehicle-records";
import {
  createInitialTripsRecord,
  hydrateTripsRecord,
  type TripsRecord,
} from "@/lib/trip-records";
import {
  createInitialTravelChecklistRecord,
  hydrateTravelChecklistRecord,
  type TravelChecklistRecord,
} from "@/lib/travel-checklist-records";
import {
  createInitialHealthRecord,
  hydrateHealthRecord,
  type HealthRecord,
} from "@/lib/health-records";
import {
  hydrateFamilyStories,
  type FamilyStoryRecord,
} from "@/lib/family-story-records";
import { removeNonOwnedDocumentsFromCache } from "@/lib/resource-cache";

export type Invite = {
  id: string;
  email?: string;
  expiresAt?: string;
  name: string;
  relation: string;
  access: string;
  sentAgo: string;
  initials: string;
  status: "pending" | "accepted";
};

export type CareContact = {
  id: string;
  name: string;
  relation: string;
  detail: string;
  phone: string;
  initials: string;
};

export type HouseholdMember = FamilyMember & {
  userId?: string;
  householdRole?: HouseholdRole;
  joinedAt?: string;
};

export type HomeInfoEntry = {
  label: string;
  value: string;
};

export type SettingsProfile = {
  name: string;
  email: string;
  plan: string;
  memberSince: string;
  initials: string;
};

export type SettingRow =
  | { kind: "toggle"; label: string; hint?: string; value: boolean }
  | { kind: "value"; label: string; hint?: string; value: string }
  | { kind: "link"; label: string; hint?: string; href: string };

export type SettingGroup = {
  title: string;
  icon: string;
  rows: SettingRow[];
};

export type MailItem = {
  id: string;
  title: string;
  source: string;
  kind: "Letter" | "Form" | "Bill" | "Statement";
  suggestedRoom?: string;
  routeStatus: "new" | "vault" | "reminder" | "room" | "ignored";
  assignedTo?: string;
  dueDate?: string;
  familyCompletedAt?: string;
};

export type KitchenListItem = {
  id: string;
  name: string;
  checked: boolean;
  section: "Pantry" | "Shopping";
};

export type NoticeCategory = "School" | "Home" | "Health" | "Plans";

export type KitchenNotice = {
  id: string;
  title: string;
  detail: string;
  category: NoticeCategory;
  assignedTo: string;
  due: string;
  colour: "cream" | "sage" | "blue" | "clay";
  pinned: boolean;
  completed: boolean;
  archived: boolean;
  createdAt: string;
  completedAt?: string;
  archivedAt?: string;
  source?: "manual" | "photo" | "voice";
  linkedReminderId?: string;
  linkedCalendarEventId?: string;
};

export type FamilyCalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  category: "appointments" | "school" | "meals" | "family";
  assignedTo?: string;
  noticeId?: string;
};

export type KidScheduleRoutine = {
  id: string;
  title: string;
  childName: string;
  day: number;
  startTime: string;
  endTime: string;
  repeat: "weekly" | "term-time";
  location: string;
  responsibleAdult: string;
  transport: string;
  colour: "sage" | "blue" | "clay" | "gold";
  paused: boolean;
};

export type HouseholdProfile = {
  id: string;
  name: string;
  kind: "adult" | "child" | "housemate" | "trusted";
  relationship: string;
  colour: "sage" | "blue" | "clay" | "gold";
  appAccess: "none" | "viewer" | "member";
  showInSchedules: boolean;
  showInMeals: boolean;
  showInReminders: boolean;
  linkedUserId?: string;
};

export type WillsWishesRecord = {
  fullName: string;
  address: string;
  dateOfBirth: string;
  willStatus: string;
  executorName: string;
  solicitorName: string;
  originalWillLocation: string;
  funeralPreference: string;
  funeralDetails: string;
  musicAndReadings: string;
  personalMessage: string;
  specialBelongings: string;
  petCareWishes: string;
  trustedPeople: string;
  reviewFrequency: string;
  lastReviewed: string;
  updatedAt: string;
  myWill: WillRecord;
  lettersOfWishes: LettersOfWishesRecord;
};

export type OnboardingStarterDocument = {
  id: string;
  title: string;
  roomId: string;
  roomName: string;
  done: boolean;
};

export type ApplicabilityAnswer = "not-set" | "yes" | "no";
export type HomeTenureAnswer = "not-set" | "own" | "rent" | "other" | "not-applicable";

export type LifeCheckState = {
  homeTenure: HomeTenureAnswer;
  vehicles: ApplicabilityAnswer;
  pets: ApplicabilityAnswer;
  internationalTravel: ApplicabilityAnswer;
  householdCollaboration: ApplicabilityAnswer;
  documentStorage: ApplicabilityAnswer;
  reminders: ApplicabilityAnswer;
  completedAt?: string;
};

export type OnboardingState = {
  completed: boolean;
  dashboardAreasConfigured: boolean;
  householdName: string;
  householdMembers: string;
  selectedRooms: string[];
  starterDocuments: OnboardingStarterDocument[];
  emergencyContactAdded: boolean;
  familyInviteAdded: boolean;
  lifeCheck: LifeCheckState;
};

export type DiaryDockAppState = {
  reminders: Reminder[];
  vaultDocuments: VaultDocument[];
  householdMembers: HouseholdMember[];
  familyInvites: Invite[];
  careContacts: CareContact[];
  emergencyContacts: EmergencyContact[];
  emergencyPlans: EmergencyPlan[];
  homeInfo: HomeInfoEntry[];
  settingsProfile: SettingsProfile;
  settingsGroups: SettingGroup[];
  roomTasks: Record<string, RoomTask[]>;
  roomDocuments: Record<string, RoomDocument[]>;
  roomActivity: Record<string, RoomActivity[]>;
  mailboxItems: MailItem[];
  onboarding: OnboardingState;
  mealPlan: MealPlan;
  kitchenItems: KitchenListItem[];
  kitchenRecipes: KitchenRecipe[];
  kitchenCookingProgress: KitchenCookingProgress | null;
  kitchenNoticeboard: KitchenNotice[];
  familyCalendarEvents: FamilyCalendarEvent[];
  kidSchedules: KidScheduleRoutine[];
  householdProfiles: HouseholdProfile[];
  willsWishes: WillsWishesRecord;
  bills: BillsRecord;
  insurance: InsuranceRecord;
  contracts: ContractsRecord;
  correspondence: CorrespondenceCollection;
  professionalContacts: ProfessionalContactsRecord;
  vehicles: VehiclesRecord;
  trips: TripsRecord;
  travelChecklist: TravelChecklistRecord;
  health: HealthRecord;
  familyStories: FamilyStoryRecord[];
};

export type RepositoryMode = "session" | "supabase";

export const initialMailboxItems: MailItem[] = [];

export const initialKitchenNoticeboard: KitchenNotice[] = [];

export const initialWillsWishes: WillsWishesRecord = {
  fullName: "",
  address: "",
  dateOfBirth: "",
  willStatus: "",
  executorName: "",
  solicitorName: "",
  originalWillLocation: "",
  funeralPreference: "",
  funeralDetails: "",
  musicAndReadings: "",
  personalMessage: "",
  specialBelongings: "",
  petCareWishes: "",
  trustedPeople: "",
  reviewFrequency: "",
  lastReviewed: "",
  updatedAt: "",
  myWill: createInitialWillRecord(),
  lettersOfWishes: createInitialLettersRecord(),
};

export const initialSettingGroups: SettingGroup[] = [
  {
    title: "Notifications",
    icon: "bell",
    rows: [
      {
        kind: "toggle",
        label: "Reminder alerts",
        hint: "Nudges for due and overdue items",
        value: true,
      },
      {
        kind: "toggle",
        label: "Mailbox arrivals",
        hint: "When a new item lands to be filed",
        value: true,
      },
      {
        kind: "toggle",
        label: "Weekly digest",
        hint: "A calm Sunday summary of the estate",
        value: false,
      },
    ],
  },
  {
    title: "Privacy & security",
    icon: "shield",
    rows: [
      {
        kind: "value",
        label: "Document storage",
        hint: "Authenticated access with short-lived file links",
        value: "Private",
      },
      {
        kind: "value",
        label: "End-to-end encryption",
        hint: "Not currently enabled for Vault documents",
        value: "Not enabled",
      },
      {
        kind: "link",
        label: "Account recovery",
        hint: "Use the secure password reset flow",
        href: "/forgot-password",
      },
    ],
  },
  {
    title: "Appearance",
    icon: "sun",
    rows: [
      { kind: "value", label: "Theme", value: "Light" },
      { kind: "value", label: "Estate map style", value: "Daylight" },
      { kind: "toggle", label: "Reduce motion", value: false },
    ],
  },
  {
    title: "Household",
    icon: "home",
    rows: [
      {
        kind: "value",
        label: "Home address",
        value: "Not added",
      },
      {
        kind: "link",
        label: "Family & access",
        hint: "Manage household members",
        href: "/family",
      },
      {
        kind: "link",
        label: "Emergency panel",
        hint: "Keep important contacts ready",
        href: "/emergency",
      },
    ],
  },
  {
    title: "Data & backups",
    icon: "archive",
    rows: [
      {
        kind: "toggle",
        label: "Nightly backup",
        hint: "Configure secure backups",
        value: true,
      },
      {
        kind: "link",
        label: "Export estate archive",
        hint: "Everything as a sealed file",
        href: "/files",
      },
    ],
  },
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
    lifeCheck: {
      homeTenure: "not-set",
      vehicles: "not-set",
      pets: "not-set",
      internationalTravel: "not-set",
      householdCollaboration: "not-set",
      documentStorage: "not-set",
      reminders: "not-set",
    },
    starterDocuments: [
      {
        id: "passport",
        title: "Passport or ID",
        roomId: "office",
        roomName: "Office",
        done: false,
      },
      {
        id: "home-insurance",
        title: "Home insurance",
        roomId: "safe-room",
        roomName: "Safe Room",
        done: false,
      },
      {
        id: "car-insurance",
        title: "Car insurance or MOT",
        roomId: "garage",
        roomName: "Garage",
        done: false,
      },
      {
        id: "gp-info",
        title: "GP and health details",
        roomId: "bedroom",
        roomName: "Bedroom",
        done: false,
      },
      {
        id: "will",
        title: "Will or power of attorney",
        roomId: "office",
        roomName: "Office",
        done: false,
      },
      {
        id: "pet-record",
        title: "Pet vaccination record",
        roomId: "garden",
        roomName: "Garden",
        done: false,
      },
    ],
  };
}

function mapRoomEntries<T>(selector: (roomId: string) => T) {
  return Object.fromEntries(
    Object.keys(roomDetails).map((roomId) => [roomId, selector(roomId)]),
  );
}

export function getOnboardingProgress(onboarding: OnboardingState) {
  const checks = [
    Boolean(onboarding.householdName.trim()),
    Boolean(onboarding.householdMembers.trim()),
    onboarding.selectedRooms.length >= 4,
    onboarding.completed,
  ];

  const completed = checks.filter(Boolean).length;

  return {
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
  };
}

function hydrateDiaryDockState(state: DiaryDockAppState): DiaryDockAppState {
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
    onboarding: {
      ...initialOnboarding,
      ...(state.onboarding ?? {}),
      lifeCheck: {
        ...initialOnboarding.lifeCheck,
        ...(state.onboarding?.lifeCheck ?? {}),
      },
    },
    mealPlan: state.mealPlan ?? {},
    kitchenRecipes: state.kitchenRecipes ?? [],
    kitchenCookingProgress: state.kitchenCookingProgress ?? null,
    kitchenNoticeboard: state.kitchenNoticeboard ?? [],
    familyCalendarEvents: state.familyCalendarEvents ?? [],
    kidSchedules: state.kidSchedules ?? [],
    householdProfiles: state.householdProfiles ?? [],
    willsWishes: {
      ...initialWillsWishes,
      ...(state.willsWishes ?? {}),
      myWill: hydrateWillRecord(state.willsWishes?.myWill),
      lettersOfWishes: hydrateLettersRecord(state.willsWishes?.lettersOfWishes),
    },
    bills: hydrateBillsRecord(state.bills),
    insurance: hydrateInsuranceRecord(state.insurance),
    contracts: hydrateContractsRecord(state.contracts),
    correspondence: hydrateCorrespondenceCollection(state.correspondence),
    professionalContacts: hydrateProfessionalContactsRecord(
      state.professionalContacts,
    ),
    vehicles: hydrateVehiclesRecord(state.vehicles),
    trips: hydrateTripsRecord(state.trips),
    travelChecklist: hydrateTravelChecklistRecord(state.travelChecklist),
    health: hydrateHealthRecord(state.health),
    familyStories: hydrateFamilyStories(state.familyStories),
    kitchenItems: state.kitchenItems ?? [],
  };
}

function mergeById<T extends { id: string }>(primary: T[], fallback: T[]) {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function mergeStructuredReminders(primary: Reminder[], fallback: Reminder[]) {
  const fallbackById = new Map(
    fallback.map((reminder) => [reminder.id, reminder]),
  );
  return mergeById(
    primary.map((reminder) => ({
      ...fallbackById.get(reminder.id),
      ...reminder,
    })),
    fallback,
  );
}

function mergeStructuredRoomDocuments(
  state: DiaryDockAppState,
  documents: VaultDocument[],
) {
  const roomDocuments = { ...state.roomDocuments };

  documents.forEach((document) => {
    if (!document.roomId) {
      return;
    }

    const roomDocument: RoomDocument = {
      id: `${document.roomId}-${document.id}`,
      title: document.title,
      kind: document.kind,
      size: document.size,
      updated: document.updated,
    };
    const existing = roomDocuments[document.roomId] ?? [];

    roomDocuments[document.roomId] = [
      roomDocument,
      ...existing.filter(
        (item) => item.id !== roomDocument.id && item.title !== document.title,
      ),
    ];
  });

  return roomDocuments;
}

function removeNonOwnedDocumentCache(state: DiaryDockAppState, userId: string) {
  const filtered = removeNonOwnedDocumentsFromCache({
    userId,
    documents: state.vaultDocuments,
    roomDocuments: state.roomDocuments,
  });

  return hydrateDiaryDockState({
    ...state,
    vaultDocuments: filtered.documents,
    roomDocuments: filtered.roomDocuments,
  });
}

function applyStructuredData(
  state: DiaryDockAppState,
  structured: Awaited<ReturnType<typeof loadStructuredDocumentsAndReminders>>,
) {
  const nextState = hydrateDiaryDockState({
    ...state,
    vaultDocuments: mergeById(structured.documents, state.vaultDocuments),
    reminders: mergeStructuredReminders(structured.reminders, state.reminders),
  });

  nextState.roomDocuments = mergeStructuredRoomDocuments(
    nextState,
    structured.documents,
  );

  return nextState;
}

async function mergeStructuredData(state: DiaryDockAppState) {
  return applyStructuredData(
    state,
    await loadStructuredDocumentsAndReminders(),
  );
}

export function createInitialDiaryDockState(): DiaryDockAppState {
  return hydrateDiaryDockState({
    reminders: [],
    vaultDocuments: [],
    householdMembers: [],
    familyInvites: [],
    careContacts: [],
    emergencyContacts: [],
    emergencyPlans: [],
    homeInfo: [],
    settingsProfile: {
      name: "",
      email: "",
      plan: "DiaryDock",
      memberSince: "",
      initials: "",
    },
    settingsGroups: initialSettingGroups,
    roomTasks: mapRoomEntries(() => []),
    roomDocuments: mapRoomEntries(() => []),
    roomActivity: mapRoomEntries(() => []),
    mailboxItems: [],
    onboarding: createInitialOnboardingState(),
    mealPlan: {},
    kitchenRecipes: [],
    kitchenCookingProgress: null,
    kitchenNoticeboard: [],
    familyCalendarEvents: [],
    kidSchedules: [],
    householdProfiles: [],
    willsWishes: initialWillsWishes,
    bills: createInitialBillsRecord(),
    insurance: createInitialInsuranceRecord(),
    contracts: createInitialContractsRecord(),
    correspondence: createInitialCorrespondenceCollection(),
    professionalContacts: createInitialProfessionalContactsRecord(),
    vehicles: createInitialVehiclesRecord(),
    trips: createInitialTripsRecord(),
    travelChecklist: createInitialTravelChecklistRecord(),
    health: createInitialHealthRecord(),
    familyStories: [],
    kitchenItems: [],
  });
}

const SESSION_KEY = "diarydock-app-state-v2";

export type DiaryDockRepository = {
  mode: RepositoryMode;
  load: () => Promise<DiaryDockAppState>;
  save: (state: DiaryDockAppState) => Promise<void>;
};

const householdStateKeys = [
  "reminders",
  "mealPlan",
  "kitchenItems",
  "kitchenRecipes",
  "kitchenNoticeboard",
  "familyCalendarEvents",
  "kidSchedules",
  "householdProfiles",
] as const satisfies ReadonlyArray<keyof DiaryDockAppState>;

export type HouseholdState = Pick<
  DiaryDockAppState,
  (typeof householdStateKeys)[number]
>;

export type DiaryDockBootstrapPayload = {
  userId: string;
  privateState: DiaryDockAppState | null;
  householdState: Partial<HouseholdState> | null;
  household: HouseholdDirectory | null;
  documents: VaultDocument[];
  reminders: Reminder[];
};

function pickHouseholdState(state: DiaryDockAppState): HouseholdState {
  return Object.fromEntries(
    householdStateKeys.map((key) => [key, state[key]]),
  ) as HouseholdState;
}

function applyHouseholdState(
  state: DiaryDockAppState,
  householdState: Partial<HouseholdState> | null | undefined,
) {
  if (!householdState) {
    return state;
  }

  return hydrateDiaryDockState({
    ...state,
    ...Object.fromEntries(
      householdStateKeys
        .filter((key) => householdState[key] !== undefined)
        .map((key) => [key, householdState[key]]),
    ),
  });
}

function initialsForName(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "LD"
  );
}

function inviteAge(createdAt: string) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000),
  );

  if (elapsedMinutes < 2) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes} minutes ago`;

  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function householdMembersFromDirectory(directory: HouseholdDirectory): HouseholdMember[] {
  return directory.members.map((member) => ({
      id: member.userId,
      userId: member.userId,
      householdRole: member.role,
      joinedAt: member.joinedAt,
      name: member.name,
      role: member.relation,
      access:
        member.role === "owner"
          ? "Owner access"
          : member.role === "member"
            ? "Shared access"
            : "View only",
      accessTone:
        member.role === "owner"
          ? "full"
          : member.role === "member"
            ? "shared"
            : "limited",
      note:
        member.role === "owner"
          ? "Owns household access, invitations and shared DiaryDock settings."
          : member.role === "member"
            ? "Can update shared household plans, reminders and Kitchen spaces."
            : "Can only view explicitly available household information.",
      initials: initialsForName(member.name),
      manages:
        member.role === "owner"
          ? ["Everything"]
          : member.role === "member"
            ? ["Kitchen", "Calendar", "Reminders"]
            : [],
      lastActive:
        member.userId === directory.currentUserId ? "Now" : "Recently",
    }));
}

export function familyInvitesFromDirectory(directory: HouseholdDirectory): Invite[] {
  return directory.invites.map((invite) => ({
      id: invite.token,
      email: invite.email,
      expiresAt: invite.expiresAt,
      name: invite.name,
      relation: invite.relation,
      access: invite.access,
      sentAgo: inviteAge(invite.createdAt),
      initials: initialsForName(invite.name),
      status: "pending",
    }));
}

function applyHouseholdDirectory(
  state: DiaryDockAppState,
  directory: Awaited<ReturnType<typeof loadHouseholdDirectory>>,
) {
  if (!directory) return state;

  return hydrateDiaryDockState({
    ...state,
    householdMembers: householdMembersFromDirectory(directory),
    familyInvites: familyInvitesFromDirectory(directory),
  });
}

export function hydrateDiaryDockBootstrap(
  payload: DiaryDockBootstrapPayload,
): DiaryDockAppState {
  let state = payload.privateState
    ? hydrateDiaryDockState(payload.privateState)
    : createInitialDiaryDockState();

  state = removeNonOwnedDocumentCache(state, payload.userId);
  state = applyHouseholdState(state, payload.householdState);
  state = applyHouseholdDirectory(state, payload.household);

  return applyStructuredData(state, {
    documents: payload.documents,
    reminders: payload.reminders,
    householdMembers: [],
    familyInvites: [],
  });
}

function createSessionRepository(): DiaryDockRepository {
  return {
    mode: "session",
    async load() {
      if (typeof window === "undefined") {
        return createInitialDiaryDockState();
      }

      try {
        const raw = window.sessionStorage.getItem(SESSION_KEY);
        return raw
          ? hydrateDiaryDockState(JSON.parse(raw) as DiaryDockAppState)
          : createInitialDiaryDockState();
      } catch {
        return createInitialDiaryDockState();
      }
    },
    async save(state) {
      if (typeof window === "undefined") {
        return;
      }

      try {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
      } catch {
        // Ignore storage write issues and keep the in-memory app state.
      }
    },
  };
}

function createSupabaseRepository(): DiaryDockRepository {
  const getCurrentUserId = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return null;
    }

    const { data, error } = await client.auth.getUser();
    if (error || !data.user) {
      return null;
    }

    return data.user.id;
  };

  return {
    mode: "supabase",
    async load() {
      const client = getSupabaseBrowserClient();
      if (!client) {
        return createInitialDiaryDockState();
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        return createInitialDiaryDockState();
      }

      const { data: privateData, error: privateError } = await client
        .from("app_state")
        .select("payload")
        .eq("id", userId)
        .maybeSingle();

      let privateState =
        !privateError && privateData?.payload
          ? hydrateDiaryDockState(privateData.payload as DiaryDockAppState)
          : createInitialDiaryDockState();

      privateState = removeNonOwnedDocumentCache(privateState, userId);

      const { data: householdId, error: householdError } = await client.rpc(
        "ensure_user_household",
      );

      if (!householdError && householdId) {
        const { data: sharedData, error: sharedError } = await client
          .from("household_state")
          .select("payload")
          .eq("household_id", householdId)
          .maybeSingle();

        if (!sharedError && sharedData?.payload) {
          privateState = applyHouseholdState(
            privateState,
            sharedData.payload as Partial<HouseholdState>,
          );
        }
      }

      privateState = applyHouseholdDirectory(
        privateState,
        await loadHouseholdDirectory(),
      );

      return mergeStructuredData(privateState);
    },
    async save(state) {
      const client = getSupabaseBrowserClient();
      if (!client) {
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        return;
      }

      const privateState = removeNonOwnedDocumentCache(state, userId);

      await client.from("app_state").upsert(
        {
          id: userId,
          payload: privateState,
        },
        { onConflict: "id" },
      );

      const { data: householdId, error: householdError } = await client.rpc(
        "ensure_user_household",
      );

      if (!householdError && householdId) {
        await client.from("household_state").upsert(
          {
            household_id: householdId,
            payload: pickHouseholdState(privateState),
          },
          { onConflict: "household_id" },
        );
      }
    },
  };
}

export function createDiaryDockRepository(): DiaryDockRepository {
  return isSupabaseConfigured()
    ? createSupabaseRepository()
    : createSessionRepository();
}
