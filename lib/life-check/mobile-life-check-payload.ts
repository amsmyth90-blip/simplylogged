import {
  applicabilityAnswers,
  homeTenureAnswers,
  LIFE_CHECK_SCHEMA_VERSION,
  parseLifeCheckSnapshot,
  type ApplicabilityAnswer,
  type HomeTenureAnswer,
  type LifeCheckAnswers,
  type LifeCheckSnapshot,
  type LifeCheckTarget,
} from "@diarydock/life-check";

import { createInitialDiaryDockState } from "../diarydock-initial-state.ts";
import type { DiaryDockAppState } from "../diarydock-types.ts";
import { calculateOrganisationScore } from "../organisation-score.ts";

type Json = Record<string, unknown>;
function object(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}
function records(value: unknown) { return Array.isArray(value) ? value.map(object) : []; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function choice<Value extends string>(value: unknown, choices: readonly Value[], fallback: Value) {
  return choices.includes(value as Value) ? value as Value : fallback;
}

function answers(payload: Json): LifeCheckAnswers {
  const onboarding = object(payload.onboarding); const source = object(onboarding.lifeCheck);
  const completed = text(source.completedAt);
  return { homeTenure: choice(source.homeTenure, homeTenureAnswers, "not-set"),
    vehicles: choice(source.vehicles, applicabilityAnswers, "not-set"),
    pets: choice(source.pets, applicabilityAnswers, "not-set"),
    internationalTravel: choice(source.internationalTravel, applicabilityAnswers, "not-set"),
    householdCollaboration: choice(source.householdCollaboration, applicabilityAnswers, "not-set"),
    documentStorage: choice(source.documentStorage, applicabilityAnswers, "not-set"),
    reminders: choice(source.reminders, applicabilityAnswers, "not-set"),
    completedAt: Number.isFinite(Date.parse(completed)) ? completed : null };
}

function recordList(value: unknown, fields: string[]) {
  return records(value).map((item) => ({ ...item,
    ...Object.fromEntries(fields.map((field) => [field, text(item[field])])) }));
}

function safeScoreState(payload: Json, lifeCheck: LifeCheckAnswers): DiaryDockAppState {
  const base = createInitialDiaryDockState(); const onboarding = object(payload.onboarding);
  const bills = object(payload.bills); const insurance = object(payload.insurance);
  const vehicles = object(payload.vehicles); const trips = object(payload.trips);
  const vehicleRecords = (records(vehicles.vehicles).map((item) => ({ ...item,
    registration: text(item.registration), motDueDate: text(item.motDueDate),
    taxDueDate: text(item.taxDueDate), insuranceRenewalDate: text(item.insuranceRenewalDate),
    documentIds: Array.isArray(item.documentIds) ? item.documentIds : [] })) as
    DiaryDockAppState["vehicles"]["vehicles"]);
  return { ...base,
    onboarding: { ...base.onboarding, householdName: text(onboarding.householdName),
      lifeCheck: { ...lifeCheck, completedAt: lifeCheck.completedAt ?? undefined } },
    settingsProfile: { ...base.settingsProfile, name: text(object(payload.settingsProfile).name) },
    vaultDocuments: recordList(payload.vaultDocuments,
      ["title", "roomId", "reviewStatus"]) as DiaryDockAppState["vaultDocuments"],
    reminders: recordList(payload.reminders,
      ["group", "origin", "sourceDueAt"]) as DiaryDockAppState["reminders"],
    vehicles: { ...base.vehicles, vehicles: vehicleRecords },
    trips: { ...base.trips, trips: recordList(trips.trips,
      ["destination", "startDate"]) as DiaryDockAppState["trips"]["trips"] },
    insurance: { ...base.insurance, policies: recordList(insurance.policies,
      ["type", "status"]) as DiaryDockAppState["insurance"]["policies"] },
    bills: { ...base.bills, bills: recordList(bills.bills,
      ["status"]) as DiaryDockAppState["bills"]["bills"] },
    homeInfo: records(payload.homeInfo) as DiaryDockAppState["homeInfo"],
    emergencyContacts: records(payload.emergencyContacts) as DiaryDockAppState["emergencyContacts"],
    householdMembers: records(payload.householdMembers) as DiaryDockAppState["householdMembers"],
    householdProfiles: records(payload.householdProfiles) as DiaryDockAppState["householdProfiles"],
    familyInvites: records(payload.familyInvites) as DiaryDockAppState["familyInvites"] };
}

function target(href: string): LifeCheckTarget {
  if (href.startsWith("/capture")) return "SCAN";
  if (href.startsWith("/reminders")) return "REMINDERS";
  if (href.startsWith("/emergency")) return "EMERGENCY";
  if (href.startsWith("/family")) return "FAMILY";
  if (href.includes("garage")) return "GARAGE";
  if (href.includes("garden")) return "GARDEN";
  if (href.includes("driveway")) return "DRIVEWAY";
  if (href.includes("office")) return "OFFICE";
  if (href.includes("review-inbox")) return "MAILBOX";
  if (href.includes("onboarding")) return "FRONT_GATE";
  return "HOME";
}

export function projectLifeCheckSnapshot(payload: unknown, revision: string | null): LifeCheckSnapshot {
  const source = object(payload); const currentAnswers = answers(source);
  const result = calculateOrganisationScore(safeScoreState(source, currentAnswers));
  return parseLifeCheckSnapshot({ schemaVersion: LIFE_CHECK_SCHEMA_VERSION, revision,
    answers: currentAnswers, score: result.score, answered: result.answered,
    totalAnswers: result.totalAnswers, categories: result.categories.map((item) => ({
      id: item.id, label: item.label, score: item.score, completed: item.completed, total: item.total })),
    recommendations: result.recommendations.map((item) => ({ id: item.id, title: item.title,
      detail: item.detail, target: target(item.href) })) });
}

export function updateLifeCheckAnswers(current: LifeCheckAnswers, field: keyof Omit<LifeCheckAnswers,
  "completedAt">, value: string) {
  const next = { ...current, [field]: value } as LifeCheckAnswers;
  const complete = Object.entries(next).every(([key, answer]) => key === "completedAt" || answer !== "not-set");
  next.completedAt = complete ? new Date().toISOString() : null;
  return next;
}

export type { ApplicabilityAnswer, HomeTenureAnswer };
