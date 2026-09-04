import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialHealthRecord,
  HEALTH_SCHEMA_VERSION,
  healthProfileProgress,
  parseHealthMutation,
  parseHealthSnapshot,
} from "../packages/health/src/index.ts";
import {
  mutateHealthPayload,
  projectHealthSnapshot,
} from "../lib/health/mobile-payload.ts";

const revision = "2026-09-02T09:00:00.000Z";

function snapshot() {
  const health = createInitialHealthRecord();
  health.profile = {
    ...health.profile,
    bloodGroup: "O+",
    gpContactId: "contact-gp",
    emergencyContactId: "contact-emergency",
    lastReviewedAt: revision,
  };
  health.allergies = [{
    id: "allergy-1",
    allergen: "Penicillin",
    reaction: "Rash",
    severity: "moderate",
    notes: "User-recorded information",
    createdAt: revision,
  }];
  health.conditions = [{
    id: "condition-1",
    name: "Asthma",
    recordedDate: "2020-01-10",
    status: "current",
    notes: "",
    createdAt: revision,
  }];
  health.medications = [{
    id: "medication-1",
    name: "Example medication",
    dose: "One tablet",
    frequency: "Daily",
    prescriber: "GP",
    status: "current",
    reviewDate: "2026-12-01",
    notes: "",
    createdAt: revision,
  }];
  health.updatedAt = revision;
  return {
    schemaVersion: HEALTH_SCHEMA_VERSION,
    revision,
    counts: {
      conditions: health.conditions.length,
      allergies: health.allergies.length,
      medications: health.medications.length,
      appointments: 0,
      tests: 0,
      vaccinations: 0,
      timeline: 0,
      dentalOptical: 0,
      wellbeing: 0,
    },
    directory: {
      familyProfiles: [],
      contacts: [],
    },
    health,
  };
}

test("Health snapshot accepts complete bounded user-recorded health data", () => {
  const parsed = parseHealthSnapshot(snapshot());
  assert.equal(parsed.health.profile.bloodGroup, "O+");
  assert.equal(parsed.health.allergies[0]?.severity, "moderate");
  assert.deepEqual(healthProfileProgress(parsed.health), {
    completed: 6,
    total: 6,
    percent: 100,
  });
});

test("Health snapshot rejects unknown fields and unsafe health values", () => {
  assert.throws(
    () => parseHealthSnapshot({ ...snapshot(), ownerId: "another-user" }),
    /unsupported fields/,
  );
  const invalid = snapshot();
  invalid.health.allergies[0] = {
    ...invalid.health.allergies[0]!,
    severity: "life-threatening" as "moderate",
  };
  assert.throws(() => parseHealthSnapshot(invalid), /Allergy severity is invalid/);
});

test("Health snapshot bounds sensitive free text and collection sizes", () => {
  const longNotes = snapshot();
  longNotes.health.profile.emergencyNotes = "x".repeat(4_001);
  assert.throws(() => parseHealthSnapshot(longNotes), /Emergency notes is invalid/);

  const tooMany = snapshot();
  tooMany.health.conditions = Array.from({ length: 501 }, () => tooMany.health.conditions[0]!);
  assert.throws(() => parseHealthSnapshot(tooMany), /Conditions is invalid/);
});

test("Health projection is deterministic, minimal and excludes unrelated state", () => {
  const source = snapshot();
  const projected = projectHealthSnapshot(
    { health: source.health, bankAccount: "must-not-leave-server" },
    revision,
  );
  assert.equal(projected.health.medications[0]?.name, "Example medication");
  assert.equal("bankAccount" in projected, false);
  assert.deepEqual(
    projected,
    projectHealthSnapshot({ health: source.health }, revision),
  );
});

test("Health projection exposes only eligible bounded directory fields", () => {
  const source = snapshot();
  source.health.familyMemberIds = ["family-1"];
  const projected = projectHealthSnapshot({
    health: source.health,
    householdMembers: [{ id: "family-1", name: "Alex", role: "Partner", access: "private" }],
    professionalContacts: { contacts: [
      { id: "gp-1", firstName: "Jamie", lastName: "Lewis", role: "GP", company: "Health Centre", phone: "01234", email: "private@example.com", address: "Private", notes: "Private", category: "Healthcare" },
      { id: "lawyer-1", firstName: "Taylor", lastName: "Law", category: "Legal" },
    ] },
  }, revision);
  assert.deepEqual(projected.directory.familyProfiles, [
    { id: "family-1", name: "Alex", role: "Partner" },
  ]);
  assert.deepEqual(projected.directory.contacts, [
    { id: "gp-1", name: "Jamie Lewis", role: "GP", company: "Health Centre", phone: "01234" },
  ]);
  assert.equal(JSON.stringify(projected.directory).includes("private@example.com"), false);
  assert.equal(JSON.stringify(projected.directory).includes("lawyer-1"), false);
});

test("Health family links accept only profiles owned in the current app state", () => {
  const source = {
    health: createInitialHealthRecord(),
    householdMembers: [{ id: "family-1", name: "Alex" }],
  };
  const mutation = parseHealthMutation({
    operation: "UPDATE_FAMILY_MEMBERS",
    revision,
    familyMemberIds: ["family-1"],
  });
  const saved = mutateHealthPayload(source, mutation);
  assert.equal(saved.status, "OK");
  if (saved.status === "OK") {
    assert.deepEqual((saved.payload.health as typeof source.health).familyMemberIds, ["family-1"]);
  }
  assert.equal(mutateHealthPayload(source, {
    ...mutation,
    familyMemberIds: ["another-owner-profile"],
  }).status, "INVALID_REFERENCE");
});

test("Health profile links accept only eligible contacts in the owner's directory", () => {
  const health = createInitialHealthRecord();
  const source = {
    health,
    professionalContacts: { contacts: [
      { id: "gp-1", category: "Healthcare", isEmergencyContact: false },
      { id: "legal-1", category: "Legal", isEmergencyContact: false },
    ] },
  };
  const valid = parseHealthMutation({
    operation: "UPDATE_PROFILE",
    revision,
    profile: { ...health.profile, gpContactId: "gp-1" },
  });
  assert.equal(mutateHealthPayload(source, valid).status, "OK");
  assert.equal(mutateHealthPayload(source, {
    ...valid,
    profile: { ...valid.profile, gpContactId: "legal-1" },
  }).status, "INVALID_REFERENCE");
});

test("Health projection fairly fits unusually large histories into encrypted cache", () => {
  const source = snapshot();
  source.health.conditions = Array.from({ length: 500 }, (_, index) => ({
    ...source.health.conditions[0]!,
    id: `condition-${index}`,
    notes: "x".repeat(4_000),
  }));
  source.health.medications = Array.from({ length: 500 }, (_, index) => ({
    ...source.health.medications[0]!,
    id: `medication-${index}`,
    notes: "x".repeat(4_000),
  }));
  const projected = projectHealthSnapshot({ health: source.health }, revision);
  assert.equal(projected.counts.conditions, 500);
  assert.equal(projected.counts.medications, 500);
  assert.ok(projected.health.conditions.length > 0);
  assert.ok(projected.health.medications.length > 0);
  assert.ok(JSON.stringify(projected).length <= 480 * 1024);
});

test("Health mutations preserve unrelated state and safely replay duplicate requests", () => {
  const recordId = "medication-new";
  const timelineId = "timeline-new";
  const mutation = parseHealthMutation({
    operation: "ADD_MEDICATION",
    revision,
    record: {
      id: recordId,
      name: "New medication",
      dose: "One tablet",
      frequency: "Daily",
      prescriber: "",
      status: "current",
      reviewDate: "2026-12-01",
      notes: "User recorded",
      createdAt: revision,
    },
    timeline: {
      id: timelineId,
      type: "medication",
      title: "New medication",
      date: "2026-09-02",
      notes: "User recorded",
      linkedRecordId: recordId,
      createdAt: revision,
    },
  });
  const source = {
    health: createInitialHealthRecord(),
    privateEstateData: { untouched: true },
  };
  const saved = mutateHealthPayload(source, mutation);
  assert.equal(saved.status, "OK");
  if (saved.status !== "OK") return;
  assert.deepEqual(saved.payload.privateEstateData, source.privateEstateData);
  assert.equal(
    (saved.payload.health as typeof source.health).medications[0]?.id,
    recordId,
  );
  assert.equal(source.health.medications.length, 0);
  assert.equal(mutateHealthPayload(saved.payload, mutation).status, "IDEMPOTENT");
  assert.equal(
    mutateHealthPayload(saved.payload, {
      ...mutation,
      record: { ...mutation.record, name: "Different medication" },
    }).status,
    "DUPLICATE",
  );
});

test("Health mutations reject ownership injection and mismatched record shapes", () => {
  assert.throws(
    () => parseHealthMutation({
      operation: "UPDATE_CARE_PREFERENCES",
      revision,
      carePreferences: "Preferences",
      ownerId: "another-user",
    }),
    /unsupported fields/,
  );
  assert.throws(
    () => parseHealthMutation({
      operation: "ADD_ALLERGY",
      revision,
      record: { id: "allergy-1", name: "Wrong shape" },
      timeline: {},
    }),
  );
});
