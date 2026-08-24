import type { AreaIcon } from "@/lib/mock-data/estate";

export type FamilyMember = {
  id: string;
  name: string;
  role: string;
  access: string;
  accessTone: "full" | "shared" | "limited";
  note: string;
  initials: string;
  manages: string[];
  lastActive: string;
};

export const familyMembers: FamilyMember[] = [];

export const pendingInvite = {
  name: "",
  relation: "",
  access: "",
  sentAgo: "",
  initials: "",
};

export type TrustedContact = {
  id: string;
  name: string;
  relation: string;
  detail: string;
  phone: string;
  initials: string;
};

export const trustedContacts: TrustedContact[] = [];

export type SharedAccessRow = {
  area: string;
  icon: AreaIcon | "heart" | "star" | "file";
  who: string;
};

export const sharedAccess: SharedAccessRow[] = [];

export type QuickDial = {
  id: string;
  label: string;
  sub: string;
  number: string;
  tone: "danger" | "calm";
};

export const quickDials: QuickDial[] = [];

export type EmergencyContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
  note?: string;
};

export const emergencyContacts: EmergencyContact[] = [];

export type EmergencyPlan = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
};

export const emergencyPlans: EmergencyPlan[] = [];

export const homeInfo: Array<{ label: string; value: string }> = [];

export const profile = {
  name: "",
  email: "",
  plan: "DiaryDock",
  memberSince: "",
  initials: "",
};
