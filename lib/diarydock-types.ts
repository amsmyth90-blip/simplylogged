import type { BillsRecord } from "@/lib/bill-records";
import type { ContractsRecord } from "@/lib/contract-records";
import type { CorrespondenceCollection } from "@/lib/correspondence-records";
import type { FamilyStoryRecord } from "@/lib/family-story-records";
import type { HealthRecord } from "@/lib/health-records";
import type { HouseholdDirectory, HouseholdRole } from "@/lib/household-sharing";
import type { InsuranceRecord } from "@/lib/insurance-records";
import type { KitchenCookingProgress, KitchenRecipe } from "@/lib/kitchen-recipes";
import type { LettersOfWishesRecord } from "@/lib/letter-records";
import type { MealPlan } from "@/lib/meal-planner";
import type { EmergencyContact, EmergencyPlan, FamilyMember, Reminder, RoomActivity, RoomDocument, RoomTask, VaultDocument } from "@/lib/mock-data";
import type { ProfessionalContactsRecord } from "@/lib/professional-contact-records";
import type { TravelChecklistRecord } from "@/lib/travel-checklist-records";
import type { TripsRecord } from "@/lib/trip-records";
import type { VehiclesRecord } from "@/lib/vehicle-records";
import type { WillRecord } from "@/lib/will-records";

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

export type CareContact = { id: string; name: string; relation: string; detail: string; phone: string; initials: string };
export type HouseholdMember = FamilyMember & { userId?: string; householdRole?: HouseholdRole; joinedAt?: string };
export type HomeInfoEntry = { label: string; value: string };
export type SettingsProfile = { name: string; email: string; plan: string; memberSince: string; initials: string };
export type SettingRow =
  | { kind: "toggle"; label: string; hint?: string; value: boolean }
  | { kind: "value"; label: string; hint?: string; value: string }
  | { kind: "link"; label: string; hint?: string; href: string };
export type SettingGroup = { title: string; icon: string; rows: SettingRow[] };

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

export type KitchenListItem = { id: string; name: string; checked: boolean; section: "Pantry" | "Shopping" };
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

export type OnboardingStarterDocument = { id: string; title: string; roomId: string; roomName: string; done: boolean };
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
export type DiaryDockRepository = {
  mode: RepositoryMode;
  load: () => Promise<DiaryDockAppState>;
  save: (state: DiaryDockAppState) => Promise<void>;
  adoptRevisions: (privateRevision: string | null, householdRevision: string | null) => void;
};
export const householdStateKeys = ["reminders", "mealPlan", "kitchenItems", "kitchenRecipes", "kitchenNoticeboard", "familyCalendarEvents", "kidSchedules", "householdProfiles"] as const satisfies ReadonlyArray<keyof DiaryDockAppState>;
export type HouseholdState = Pick<DiaryDockAppState, (typeof householdStateKeys)[number]>;
export type DiaryDockBootstrapPayload = {
  userId: string;
  privateRevision: string | null;
  privateState: DiaryDockAppState | null;
  householdRevision: string | null;
  householdState: Partial<HouseholdState> | null;
  household: HouseholdDirectory | null;
  documents: VaultDocument[];
  reminders: Reminder[];
  documentCursor: string | null;
  reminderCursor: string | null;
};
