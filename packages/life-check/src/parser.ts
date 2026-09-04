import {
  applicabilityAnswers,
  homeTenureAnswers,
  LIFE_CHECK_SCHEMA_VERSION,
  lifeCheckFields,
  lifeCheckTargets,
  type LifeCheckAnswers,
  type LifeCheckCategory,
  type LifeCheckMutation,
  type LifeCheckRecommendation,
  type LifeCheckSnapshot,
} from "./types.ts";

function object(value: unknown, name: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} is invalid.`);
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[], name: string) {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))
    || keys.some((key) => !(key in value))) throw new Error(`${name} is invalid.`);
}
function text(value: unknown, maximum: number, name: string) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(`${name} is invalid.`);
  }
  return value.trim();
}
function integer(value: unknown, minimum: number, maximum: number, name: string) {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error(`${name} is invalid.`);
  }
  return Number(value);
}
function member<Value extends string>(value: unknown, values: readonly Value[], name: string) {
  if (typeof value !== "string" || !values.includes(value as Value)) throw new Error(`${name} is invalid.`);
  return value as Value;
}
function revision(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 40 || !Number.isFinite(Date.parse(value))) {
    throw new Error("Life Check revision is invalid.");
  }
  return value;
}
function answers(value: unknown): LifeCheckAnswers {
  const item = object(value, "Life Check answers");
  exact(item, [...lifeCheckFields, "completedAt"], "Life Check answers");
  const completedAt = item.completedAt === null ? null : revision(item.completedAt);
  return { homeTenure: member(item.homeTenure, homeTenureAnswers, "Home answer"),
    vehicles: member(item.vehicles, applicabilityAnswers, "Vehicle answer"),
    pets: member(item.pets, applicabilityAnswers, "Pet answer"),
    internationalTravel: member(item.internationalTravel, applicabilityAnswers, "Travel answer"),
    householdCollaboration: member(item.householdCollaboration, applicabilityAnswers, "Household answer"),
    documentStorage: member(item.documentStorage, applicabilityAnswers, "Document answer"),
    reminders: member(item.reminders, applicabilityAnswers, "Reminder answer"), completedAt };
}
function category(value: unknown): LifeCheckCategory {
  const item = object(value, "Life Check category");
  exact(item, ["id", "label", "score", "completed", "total"], "Life Check category");
  const total = integer(item.total, 1, 20, "Category total");
  const completed = integer(item.completed, 0, total, "Category completed");
  return { id: text(item.id, 60, "Category ID"), label: text(item.label, 80, "Category label"),
    score: integer(item.score, 0, 100, "Category score"), completed, total };
}
function recommendation(value: unknown): LifeCheckRecommendation {
  const item = object(value, "Life Check recommendation");
  exact(item, ["id", "title", "detail", "target"], "Life Check recommendation");
  return { id: text(item.id, 80, "Recommendation ID"),
    title: text(item.title, 160, "Recommendation title"),
    detail: text(item.detail, 400, "Recommendation detail"),
    target: member(item.target, lifeCheckTargets, "Recommendation target") };
}

export function parseLifeCheckSnapshot(value: unknown): LifeCheckSnapshot {
  const item = object(value, "Life Check response");
  exact(item, ["schemaVersion", "revision", "answers", "score", "answered", "totalAnswers",
    "categories", "recommendations"], "Life Check response");
  if (item.schemaVersion !== LIFE_CHECK_SCHEMA_VERSION || !Array.isArray(item.categories)
    || item.categories.length > 12 || !Array.isArray(item.recommendations)
    || item.recommendations.length > 8) throw new Error("Life Check response is invalid.");
  const totalAnswers = integer(item.totalAnswers, 1, 12, "Answer total");
  return { schemaVersion: LIFE_CHECK_SCHEMA_VERSION, revision: revision(item.revision),
    answers: answers(item.answers), score: integer(item.score, 0, 100, "Organisation score"),
    answered: integer(item.answered, 0, totalAnswers, "Answered count"), totalAnswers,
    categories: item.categories.map(category), recommendations: item.recommendations.map(recommendation) };
}

export function parseLifeCheckMutation(input: unknown): LifeCheckMutation {
  const item = object(input, "Life Check update");
  exact(item, ["revision", "field", "value"], "Life Check update");
  const field = member(item.field, lifeCheckFields, "Life Check field");
  const answer = field === "homeTenure"
    ? member(item.value, homeTenureAnswers, "Life Check answer")
    : member(item.value, applicabilityAnswers, "Life Check answer");
  return { revision: revision(item.revision), field, value: answer };
}
