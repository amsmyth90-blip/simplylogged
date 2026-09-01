import type { SupabaseClient } from "@supabase/supabase-js";

import { roomDetails } from "@/lib/mock-data";
import type { SearchCandidate } from "@/lib/search/results";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord => typeof value === "object" && value !== null ? value as UnknownRecord : {};
const asArray = (value: unknown) => Array.isArray(value) ? value.map(asRecord) : [];
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const stringParts = (...values: unknown[]) => values.map(text).filter(Boolean).join(" ");
const validDate = (value: unknown) => {
  const raw = text(value);
  if (!raw) return undefined;
  const parsed = Date.parse(raw.includes("T") ? raw : `${raw}T09:00:00.000Z`);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
};

function addDatedCandidate(candidates: SearchCandidate[], input: {
  id: string;
  category: SearchCandidate["category"];
  domains: SearchCandidate["domains"];
  title: string;
  detail: string;
  href: string;
  dueAt: unknown;
  badge: string;
  searchText: string;
  updatedAt?: unknown;
}) {
  const dueAt = validDate(input.dueAt);
  if (!dueAt) return;
  candidates.push({ ...input, dueAt, updatedAt: text(input.updatedAt) });
}

function appStateCandidates(payload: unknown): SearchCandidate[] {
  const state = asRecord(payload);
  const candidates: SearchCandidate[] = [];

  asArray(asRecord(state.vehicles).vehicles).forEach((vehicle) => {
    const id = text(vehicle.id);
    if (!id) return;
    const title = text(vehicle.nickname) || stringParts(vehicle.make, vehicle.model) || "Vehicle";
    const detail = stringParts(vehicle.registration, vehicle.make, vehicle.model);
    const common = stringParts(title, detail, vehicle.colour, vehicle.fuelType);
    candidates.push({ id: `vehicle:${id}`, category: "vehicles", domains: ["vehicles"], title, detail, href: `/garage/vehicles/${id}`, badge: "Vehicle", searchText: common, updatedAt: text(vehicle.updatedAt) });
    addDatedCandidate(candidates, { id: `vehicle:${id}:mot`, category: "vehicles", domains: ["vehicles"], title: `${title} MOT`, detail, href: `/garage/vehicles/${id}`, dueAt: vehicle.motDueDate, badge: "MOT", searchText: stringParts(common, "MOT expiry due"), updatedAt: vehicle.updatedAt });
    addDatedCandidate(candidates, { id: `vehicle:${id}:tax`, category: "vehicles", domains: ["vehicles"], title: `${title} vehicle tax`, detail, href: `/garage/vehicles/${id}`, dueAt: vehicle.taxDueDate, badge: "Tax", searchText: stringParts(common, "vehicle tax expiry due"), updatedAt: vehicle.updatedAt });
    addDatedCandidate(candidates, { id: `vehicle:${id}:insurance`, category: "vehicles", domains: ["vehicles", "insurance"], title: `${title} insurance`, detail, href: `/garage/vehicles/${id}`, dueAt: vehicle.insuranceRenewalDate, badge: "Insurance", searchText: stringParts(common, "car vehicle insurance renewal expiry due"), updatedAt: vehicle.updatedAt });
  });

  asArray(asRecord(state.trips).trips).forEach((trip) => {
    const id = text(trip.id); if (!id) return;
    const title = text(trip.title) || text(trip.destination) || "Trip";
    candidates.push({ id: `trip:${id}`, category: "travel", domains: ["travel"], title, detail: stringParts(trip.destinationCity, trip.destinationCountry, trip.startDate), href: `/driveway/trips/${id}`, dueAt: validDate(trip.startDate), badge: "Trip", searchText: stringParts(title, trip.destination, trip.destinationCity, trip.destinationCountry, trip.tripType, trip.status), updatedAt: text(trip.updatedAt) });
  });

  asArray(asRecord(state.insurance).policies).forEach((policy) => {
    const id = text(policy.id); if (!id) return;
    const title = text(policy.title) || "Insurance policy";
    candidates.push({ id: `insurance:${id}`, category: "insurance", domains: ["insurance", "home"], title, detail: stringParts(policy.provider, policy.type, policy.status), href: `/office/insurance/${id}`, dueAt: validDate(policy.renewalDate), badge: "Policy", searchText: stringParts(title, policy.provider, policy.type, policy.status, "insurance renewal expiry due"), updatedAt: text(policy.updatedAt) });
  });

  asArray(asRecord(state.bills).bills).forEach((bill) => {
    const id = text(bill.id); if (!id) return;
    const title = text(bill.title) || "Household bill";
    candidates.push({ id: `bill:${id}`, category: "home", domains: ["home"], title, detail: stringParts(bill.provider, bill.category, bill.status), href: `/office/bills/${id}`, dueAt: validDate(bill.dueDate), badge: "Bill", searchText: stringParts(title, bill.provider, bill.category, bill.status, "bill payment due"), updatedAt: text(bill.updatedAt) });
  });

  asArray(asRecord(state.professionalContacts).contacts).forEach((contact) => {
    const id = text(contact.id); if (!id) return;
    const title = stringParts(contact.firstName, contact.lastName) || text(contact.company) || "Contact";
    candidates.push({ id: `contact:${id}`, category: "contacts", domains: ["contacts"], title, detail: stringParts(contact.role, contact.company, contact.category), href: `/office/contacts/${id}`, dueAt: validDate(contact.nextReviewDate), badge: "Contact", searchText: stringParts(title, contact.role, contact.company, contact.category), updatedAt: text(contact.updatedAt) });
  });
  return candidates;
}

export type AuthorizedSearchLoad = { candidates: SearchCandidate[]; error: null } | { candidates: []; error: string };

export async function loadAuthorizedSearchCandidates(supabase: SupabaseClient, userId: string): Promise<AuthorizedSearchLoad> {
  const [documentsResult, remindersResult, assetsResult, stateResult] = await Promise.all([
    supabase.from("documents").select("id, title, category, kind, room_id, room_name, issuer, due_date, review_status, updated_at").order("updated_at", { ascending: false }).limit(250),
    supabase.from("reminders").select("id, title, room_name, reminder_group, time_label, priority, document_title, due_at, source_due_at, updated_at").order("updated_at", { ascending: false }).limit(250),
    supabase.from("assets").select("id, name, category, location, manufacturer, model, warranty_due_at, next_service_at, updated_at").order("updated_at", { ascending: false }).limit(250),
    supabase.from("app_state").select("payload").eq("id", userId).maybeSingle()
  ]);
  if (documentsResult.error || remindersResult.error || assetsResult.error || stateResult.error) return { candidates: [], error: "Authorised records could not be loaded safely." };

  const candidates: SearchCandidate[] = [];
  (documentsResult.data ?? []).forEach((document) => {
    const roomId = text(document.room_id);
    const domains: SearchCandidate["domains"] = ["documents"];
    if (roomId === "garage") domains.push("vehicles");
    if (roomId === "garden") domains.push("pets");
    if (roomId === "driveway") domains.push("travel");
    if (roomId === "kitchen" || roomId === "office") domains.push("home");
    candidates.push({ id: `document:${document.id}`, category: "documents", domains, title: text(document.title) || "Document", detail: stringParts(document.category, document.room_name, document.issuer), href: `/document/${document.id}`, dueAt: validDate(document.due_date), badge: document.review_status === "needs-review" ? "Review" : text(document.kind), searchText: stringParts(document.title, document.category, document.kind, document.room_name, document.issuer), updatedAt: text(document.updated_at) });
  });
  (remindersResult.data ?? []).forEach((reminder) => candidates.push({ id: `reminder:${reminder.id}`, category: "reminders", domains: ["reminders"], title: text(reminder.title) || "Reminder", detail: stringParts(reminder.time_label, reminder.room_name, reminder.document_title), href: "/reminders", dueAt: validDate(reminder.due_at) || validDate(reminder.source_due_at), badge: text(reminder.priority), searchText: stringParts(reminder.title, reminder.room_name, reminder.document_title, reminder.time_label), updatedAt: text(reminder.updated_at) }));
  (assetsResult.data ?? []).forEach((asset) => {
    const id = text(asset.id); if (!id) return;
    const title = text(asset.name) || "Smart item";
    const detail = stringParts(asset.category, asset.location, asset.manufacturer, asset.model);
    const common = stringParts(title, detail);
    candidates.push({ id: `asset:${id}`, category: "assets", domains: ["assets", "home"], title, detail, href: `/assets/${id}`, badge: "Item", searchText: common, updatedAt: text(asset.updated_at) });
    addDatedCandidate(candidates, { id: `asset:${id}:warranty`, category: "assets", domains: ["assets", "home"], title: `${title} warranty`, detail, href: `/assets/${id}`, dueAt: asset.warranty_due_at, badge: "Warranty", searchText: stringParts(common, "warranty guarantee expiry due"), updatedAt: asset.updated_at });
    addDatedCandidate(candidates, { id: `asset:${id}:service`, category: "assets", domains: ["assets", "home"], title: `${title} service`, detail, href: `/assets/${id}`, dueAt: asset.next_service_at, badge: "Service", searchText: stringParts(common, "maintenance service due"), updatedAt: asset.updated_at });
  });
  candidates.push(...appStateCandidates(stateResult.data?.payload));
  Object.values(roomDetails).forEach((room) => candidates.push({ id: `room:${room.id}`, category: "home", domains: ["home"], title: room.name, detail: room.domain, href: `/room/${room.id}`, badge: "Area", searchText: stringParts(room.name, room.domain, room.headline, room.description) }));
  return { candidates, error: null };
}
