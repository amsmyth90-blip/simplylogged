export const EMERGENCY_SCHEMA_VERSION = 1;

export type EmergencyContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
  note?: string;
};

export type EmergencyPlan = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
};

export type EmergencyHomeInfo = {
  label: string;
  value: string;
};

export type EmergencyCareContact = {
  id: string;
  name: string;
  relation: string;
  detail: string;
  phone: string;
  initials: string;
};

export type EmergencySnapshot = {
  schemaVersion: typeof EMERGENCY_SCHEMA_VERSION;
  revision: string | null;
  contacts: EmergencyContact[];
  plans: EmergencyPlan[];
  homeInfo: EmergencyHomeInfo[];
  careContacts: EmergencyCareContact[];
};

export type EmergencyMutation =
  | { operation: "ADD_CONTACT"; revision: string | null; name: string; relation: string; phone: string; note?: string }
  | { operation: "ADD_PLAN"; revision: string | null; title: string; summary: string; steps: string[] }
  | { operation: "ADD_HOME_INFO"; revision: string | null; label: string; value: string };
