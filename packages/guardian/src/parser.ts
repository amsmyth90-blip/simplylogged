import {
  GUARDIAN_SCHEMA_VERSION,
  type GuardianFinding,
  type GuardianResponse,
  type GuardianSeverity,
} from "./types.ts";

const severities = new Set<GuardianSeverity>(["INFO", "ATTENTION", "IMPORTANT", "URGENT"]);

function record(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, keys: string[], label: string) {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error(`${label} contains unsupported fields.`);
  }
}

function text(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  return value.trim();
}

function finding(value: unknown): GuardianFinding {
  const item = record(value, "Guardian finding");
  exact(item, ["id", "type", "severity", "resourceType", "resourceId", "title", "description", "dueAt"], "Guardian finding");
  if (typeof item.severity !== "string" || !severities.has(item.severity as GuardianSeverity)) {
    throw new Error("Guardian severity is invalid.");
  }
  const dueAt = text(item.dueAt, "Guardian date", 40);
  if (!Number.isFinite(Date.parse(dueAt))) throw new Error("Guardian date is invalid.");
  return {
    id: text(item.id, "Guardian finding ID", 240),
    type: text(item.type, "Guardian finding type", 80),
    severity: item.severity as GuardianSeverity,
    resourceType: text(item.resourceType, "Guardian resource type", 80),
    resourceId: text(item.resourceId, "Guardian resource ID", 180),
    title: text(item.title, "Guardian title", 240),
    description: text(item.description, "Guardian description", 500),
    dueAt,
  };
}

export function parseGuardianResponse(value: unknown): GuardianResponse {
  const item = record(value, "Guardian response");
  exact(item, ["schemaVersion", "findings"], "Guardian response");
  if (item.schemaVersion !== GUARDIAN_SCHEMA_VERSION) {
    throw new Error("Please update DiaryDock to open Guardian.");
  }
  if (!Array.isArray(item.findings) || item.findings.length > 100) {
    throw new Error("Guardian findings are invalid.");
  }
  return {
    schemaVersion: GUARDIAN_SCHEMA_VERSION,
    findings: item.findings.map(finding),
  };
}
