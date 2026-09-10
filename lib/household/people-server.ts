import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseHouseholdPeopleDirectory,
  type HouseholdPeopleDirectory,
  type HouseholdPersonType,
} from "@diarydock/household";

import type { HouseholdMutationResult } from "@/lib/household/directory-server";

const personTypes = new Set<Exclude<HouseholdPersonType, "owner">>([
  "adult", "teen", "child", "dependent", "trusted_contact",
]);

function inputText(value: unknown, maximum: number, required = false) {
  if (typeof value !== "string") return required ? null : "";
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > maximum) return null;
  return normalized;
}

function inputDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed > new Date() ? undefined : value;
}

export async function loadHouseholdPeople(
  supabase: SupabaseClient,
  currentUserId: string,
): Promise<HouseholdPeopleDirectory | null> {
  const { data: householdId, error: householdError } = await supabase.rpc("ensure_user_household");
  if (householdError || !householdId) return null;
  const [membershipResult, peopleResult] = await Promise.all([
    supabase.from("household_memberships").select("role")
      .eq("household_id", householdId).eq("user_id", currentUserId)
      .eq("status", "active").maybeSingle(),
    supabase.from("household_people").select(
      "id, household_id, linked_user_id, first_name, last_name, preferred_name, relationship, person_type, date_of_birth, avatar_storage_path, status, created_at, updated_at",
    ).eq("household_id", householdId).eq("status", "active")
      .order("created_at", { ascending: true }).limit(50),
  ]);
  if (membershipResult.error || peopleResult.error || !membershipResult.data) return null;
  try {
    return parseHouseholdPeopleDirectory({
      householdId: String(householdId),
      currentUserRole: String(membershipResult.data.role),
      people: (peopleResult.data ?? []).map((row) => ({
        id: String(row.id),
        householdId: String(row.household_id),
        linkedUserId: row.linked_user_id ? String(row.linked_user_id) : null,
        firstName: String(row.first_name),
        lastName: String(row.last_name ?? ""),
        preferredName: String(row.preferred_name ?? ""),
        relationship: String(row.relationship),
        personType: String(row.person_type),
        dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : null,
        avatarStoragePath: row.avatar_storage_path ? String(row.avatar_storage_path) : null,
        status: String(row.status),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      })),
    });
  } catch {
    return null;
  }
}

export async function createHouseholdPerson(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<HouseholdMutationResult> {
  const firstName = inputText(body.firstName, 100, true);
  const lastName = inputText(body.lastName, 100);
  const preferredName = inputText(body.preferredName, 100);
  const relationship = inputText(body.relationship, 100, true);
  const personType = inputText(body.personType, 40);
  const dateOfBirth = inputDate(body.dateOfBirth);
  if (firstName === null || lastName === null || preferredName === null
    || relationship === null || !personTypes.has(personType as Exclude<HouseholdPersonType, "owner">)
    || dateOfBirth === undefined) {
    return { body: { error: "Check the person's details and try again." }, status: 400 };
  }
  const { data, error } = await supabase.rpc("create_household_person", {
    input_first_name: firstName,
    input_last_name: lastName,
    input_preferred_name: preferredName,
    input_relationship: relationship,
    input_person_type: personType,
    input_date_of_birth: dateOfBirth,
  });
  if (error?.message?.includes("Household owner required")) {
    return { body: { error: "Only the household owner can add someone." }, status: 403 };
  }
  if (error?.message?.includes("Recent authentication required")) {
    return { body: { error: "Sign out and sign in again before adding someone." }, status: 403 };
  }
  if (error?.message?.includes("Too many household person changes")) {
    return { body: { error: "Please wait before adding another person." }, status: 429 };
  }
  return error || !data
    ? { body: { error: "This person could not be added." }, status: 503 }
    : { body: { personId: String(data) }, status: 201 };
}
