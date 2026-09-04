export const GUARDIAN_RULE_VERSION = 1;
export const GUARDIAN_SCHEMA_VERSION = 1;

export type GuardianSeverity = "INFO" | "ATTENTION" | "IMPORTANT" | "URGENT";
export type GuardianDecision = "dismiss" | "resolve" | "snooze";

export type GuardianSource = {
  resourceType: string;
  resourceId: string;
  dateKey: string;
  reminderType: string;
  title: string;
  dueAt: string;
  timeZone?: string;
};

export type GuardianCandidate = {
  dedupeKey: string;
  type: string;
  severity: GuardianSeverity;
  resourceType: string;
  resourceId: string;
  title: string;
  description: string;
  dueAt: string;
  ruleVersion: number;
};

export type GuardianFinding = Omit<GuardianCandidate, "dedupeKey" | "ruleVersion"> & {
  id: string;
};

export type GuardianResponse = {
  schemaVersion: typeof GUARDIAN_SCHEMA_VERSION;
  findings: GuardianFinding[];
};
