"use client";

import {
  emergencyContacts,
  emergencyPlans,
  familyMembers,
  homeInfo,
  pendingInvite,
  profile,
  remindersList,
  roomDetails,
  sharedAccess,
  trustedContacts,
  vaultDocuments,
  vaultSecurity,
  type EmergencyContact,
  type EmergencyPlan,
  type FamilyMember,
  type Reminder,
  type RoomActivity,
  type RoomDocument,
  type RoomTask,
  type VaultDocument
} from "@/lib/mock-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { loadStructuredDocumentsAndReminders } from "@/lib/structured-data";

export type Invite = {
  id: string;
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

export type HouseholdMember = FamilyMember;

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
};

export type OnboardingStarterDocument = {
  id: string;
  title: string;
  roomId: string;
  roomName: string;
  done: boolean;
};

export type OnboardingState = {
  completed: boolean;
  householdName: string;
  householdMembers: string;
  selectedRooms: string[];
  starterDocuments: OnboardingStarterDocument[];
  emergencyContactAdded: boolean;
  familyInviteAdded: boolean;
};

export type LifeDockAppState = {
  reminders: Reminder[];
  vaultDocuments: VaultDocument[];
  householdMembers: HouseholdMember[];
  familyInvites: Invite[];
  careContacts: CareContact[];
  emergencyContacts: EmergencyContact[];
  emergencyPlans: EmergencyPlan[];
  homeInfo: typeof homeInfo;
  settingsProfile: typeof profile;
  settingsGroups: SettingGroup[];
  roomTasks: Record<string, RoomTask[]>;
  roomDocuments: Record<string, RoomDocument[]>;
  roomActivity: Record<string, RoomActivity[]>;
  mailboxItems: MailItem[];
  onboarding: OnboardingState;
};

export type RepositoryMode = "session" | "supabase";

export const initialMailboxItems: MailItem[] = [
  {
    id: "mail-item-1",
    title: "Council tax renewal",
    source: "Richmond Council",
    kind: "Letter",
    suggestedRoom: "Office",
    routeStatus: "new"
  },
  {
    id: "mail-item-2",
    title: "School trip consent form",
    source: "Greyfriars Primary",
    kind: "Form",
    suggestedRoom: "Family Room",
    routeStatus: "new"
  },
  {
    id: "mail-item-3",
    title: "Water bill Q2",
    source: "Thames Water",
    kind: "Bill",
    suggestedRoom: "Office",
    routeStatus: "new"
  }
];

export const initialSettingGroups: SettingGroup[] = [
  {
    title: "Notifications",
    icon: "bell",
    rows: [
      { kind: "toggle", label: "Reminder alerts", hint: "Nudges for due and overdue items", value: true },
      { kind: "toggle", label: "Mailbox arrivals", hint: "When a new item lands to be filed", value: true },
      { kind: "toggle", label: "Weekly digest", hint: "A calm Sunday summary of the estate", value: false }
    ]
  },
  {
    title: "Privacy & security",
    icon: "shield",
    rows: [
      { kind: "toggle", label: "Unlock with Face ID", value: true },
      { kind: "value", label: "Two-factor authentication", value: "On" },
      { kind: "value", label: "Vault auto-lock", hint: "After inactivity", value: "5 minutes" },
      { kind: "link", label: "Recovery codes", hint: "Last verified this week", href: "/room/office" }
    ]
  },
  {
    title: "Appearance",
    icon: "sun",
    rows: [
      { kind: "value", label: "Theme", value: "Light" },
      { kind: "value", label: "Estate map style", value: "Daylight" },
      { kind: "toggle", label: "Reduce motion", value: false }
    ]
  },
  {
    title: "Household",
    icon: "home",
    rows: [
      { kind: "value", label: "Home address", value: "42 Alder Lane, Richmond" },
      { kind: "link", label: "Family & access", hint: "3 members, 1 invite pending", href: "/family" },
      { kind: "link", label: "Emergency panel", hint: "Reviewed today", href: "/emergency" }
    ]
  },
  {
    title: "Data & backups",
    icon: "archive",
    rows: [
      {
        kind: "toggle",
        label: "Nightly backup",
        hint: `Last ran ${vaultSecurity.lastBackup.toLowerCase()}`,
        value: true
      },
      { kind: "link", label: "Export estate archive", hint: "Everything as a sealed file", href: "/vault" }
    ]
  }
];

export function createInitialOnboardingState(): OnboardingState {
  return {
    completed: false,
    householdName: "Amy's household",
    householdMembers: "Amy, Michael, Lily",
    selectedRooms: ["office", "safe-room", "bedroom", "family-room", "garage"],
    emergencyContactAdded: true,
    familyInviteAdded: true,
    starterDocuments: [
      { id: "passport", title: "Passport or ID", roomId: "office", roomName: "Office", done: true },
      { id: "home-insurance", title: "Home insurance", roomId: "safe-room", roomName: "Safe Room", done: false },
      { id: "car-insurance", title: "Car insurance or MOT", roomId: "garage", roomName: "Garage", done: false },
      { id: "gp-info", title: "GP and health details", roomId: "bedroom", roomName: "Bedroom", done: true },
      { id: "will", title: "Will or power of attorney", roomId: "office", roomName: "Office", done: false },
      { id: "pet-record", title: "Pet vaccination record", roomId: "garden", roomName: "Garden", done: false }
    ]
  };
}

function mapRoomEntries<T>(selector: (roomId: string) => T) {
  return Object.fromEntries(Object.keys(roomDetails).map((roomId) => [roomId, selector(roomId)]));
}

export function getOnboardingProgress(onboarding: OnboardingState) {
  const checks = [
    Boolean(onboarding.householdName.trim()),
    onboarding.selectedRooms.length >= 4,
    onboarding.starterDocuments.some((document) => document.done),
    onboarding.emergencyContactAdded,
    onboarding.familyInviteAdded
  ];

  const completed = checks.filter(Boolean).length;

  return {
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100)
  };
}

function hydrateLifeDockState(state: LifeDockAppState): LifeDockAppState {
  return {
    ...state,
    householdMembers: state.householdMembers?.length ? state.householdMembers : familyMembers,
    onboarding: {
      ...createInitialOnboardingState(),
      ...(state.onboarding ?? {})
    }
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

function mergeStructuredRoomDocuments(state: LifeDockAppState, documents: VaultDocument[]) {
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
      updated: document.updated
    };
    const existing = roomDocuments[document.roomId] ?? [];

    roomDocuments[document.roomId] = [
      roomDocument,
      ...existing.filter((item) => item.id !== roomDocument.id && item.title !== document.title)
    ];
  });

  return roomDocuments;
}

async function mergeStructuredData(state: LifeDockAppState) {
  const structured = await loadStructuredDocumentsAndReminders();
  const nextState = hydrateLifeDockState({
    ...state,
    vaultDocuments: mergeById(structured.documents, state.vaultDocuments),
    reminders: mergeById(structured.reminders, state.reminders),
    householdMembers: structured.householdMembers.length
      ? mergeById(structured.householdMembers, state.householdMembers ?? familyMembers)
      : state.householdMembers ?? familyMembers,
    familyInvites: structured.familyInvites.length
      ? mergeById(structured.familyInvites, state.familyInvites)
      : state.familyInvites
  });

  nextState.roomDocuments = mergeStructuredRoomDocuments(nextState, structured.documents);


  return nextState;
}

export function createInitialLifeDockState(): LifeDockAppState {
  return hydrateLifeDockState({
    reminders: remindersList,
    vaultDocuments,
    householdMembers: familyMembers,
    familyInvites: [
      {
        id: "pending-rose",
        name: pendingInvite.name,
        relation: pendingInvite.relation,
        access: "Viewer - Memories only",
        sentAgo: pendingInvite.sentAgo,
        initials: pendingInvite.initials,
        status: "pending"
      }
    ],
    careContacts: trustedContacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      relation: contact.relation,
      detail: contact.detail.replace("Â·", "-"),
      phone: contact.phone,
      initials: contact.initials
    })),
    emergencyContacts,
    emergencyPlans,
    homeInfo,
    settingsProfile: {
      ...profile,
      plan: profile.plan.replace("Â·", "-")
    },
    settingsGroups: initialSettingGroups,
    roomTasks: mapRoomEntries((roomId) => roomDetails[roomId].tasks),
    roomDocuments: mapRoomEntries((roomId) => roomDetails[roomId].documents),
    roomActivity: mapRoomEntries((roomId) => roomDetails[roomId].activity),
    mailboxItems: initialMailboxItems,
    onboarding: createInitialOnboardingState()
  });
}

const SESSION_KEY = "lifedock-app-state";

export type LifeDockRepository = {
  mode: RepositoryMode;
  load: () => Promise<LifeDockAppState>;
  save: (state: LifeDockAppState) => Promise<void>;
};

function createSessionRepository(): LifeDockRepository {
  return {
    mode: "session",
    async load() {
      if (typeof window === "undefined") {
        return createInitialLifeDockState();
      }

      try {
        const raw = window.sessionStorage.getItem(SESSION_KEY);
        return raw ? hydrateLifeDockState(JSON.parse(raw) as LifeDockAppState) : createInitialLifeDockState();
      } catch {
        return createInitialLifeDockState();
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
    }
  };
}

function createSupabaseRepository(): LifeDockRepository {
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
        return createInitialLifeDockState();
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        return createInitialLifeDockState();
      }

      const { data, error } = await client
        .from("app_state")
        .select("payload")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data?.payload) {
        const initial = createInitialLifeDockState();
        await this.save(initial);
        return mergeStructuredData(initial);
      }

      return mergeStructuredData(hydrateLifeDockState(data.payload as LifeDockAppState));
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

      await client.from("app_state").upsert(
        {
          id: userId,
          payload: state
        },
        { onConflict: "id" }
      );
    }
  };
}

export function createLifeDockRepository(): LifeDockRepository {
  return isSupabaseConfigured() ? createSupabaseRepository() : createSessionRepository();
}
