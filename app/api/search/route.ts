import { NextResponse } from "next/server";

import { roomDetails } from "@/lib/mock-data";
import { checkSharedRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { filterAndRankSearchResults, searchCategories, searchDateFilters, type SearchCandidate, type SearchCategory, type SearchDateFilter } from "@/lib/search/results";
import { getSupabaseServerClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";

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

function appStateCandidates(payload: unknown): SearchCandidate[] {
  const state = asRecord(payload);
  const candidates: SearchCandidate[] = [];
  const vehicles = asArray(asRecord(state.vehicles).vehicles);
  vehicles.forEach((vehicle) => {
    const id = text(vehicle.id); if (!id) return;
    const title = text(vehicle.nickname) || stringParts(vehicle.make, vehicle.model) || "Vehicle";
    candidates.push({ id: `vehicle:${id}`, category: "vehicles", domains: ["vehicles"], title, detail: stringParts(vehicle.registration, vehicle.make, vehicle.model), href: `/garage/vehicles/${id}`, dueAt: validDate(vehicle.motDueDate) || validDate(vehicle.taxDueDate) || validDate(vehicle.insuranceRenewalDate), badge: "Vehicle", searchText: stringParts(title, vehicle.registration, vehicle.make, vehicle.model, vehicle.colour, vehicle.fuelType), updatedAt: text(vehicle.updatedAt) });
  });
  asArray(asRecord(state.trips).trips).forEach((trip) => {
    const id = text(trip.id); if (!id) return;
    const title = text(trip.title) || text(trip.destination) || "Trip";
    candidates.push({ id: `trip:${id}`, category: "travel", domains: ["travel"], title, detail: stringParts(trip.destinationCity, trip.destinationCountry, trip.startDate), href: `/driveway/trips/${id}`, dueAt: validDate(trip.startDate), badge: "Trip", searchText: stringParts(title, trip.destination, trip.destinationCity, trip.destinationCountry, trip.tripType, trip.status), updatedAt: text(trip.updatedAt) });
  });
  asArray(asRecord(state.insurance).policies).forEach((policy) => {
    const id = text(policy.id); if (!id) return;
    const title = text(policy.title) || "Insurance policy";
    candidates.push({ id: `insurance:${id}`, category: "insurance", domains: ["insurance", "home"], title, detail: stringParts(policy.provider, policy.type, policy.status), href: `/office/insurance/${id}`, dueAt: validDate(policy.renewalDate), badge: "Policy", searchText: stringParts(title, policy.provider, policy.type, policy.status), updatedAt: text(policy.updatedAt) });
  });
  asArray(asRecord(state.bills).bills).forEach((bill) => {
    const id = text(bill.id); if (!id) return;
    const title = text(bill.title) || "Household bill";
    candidates.push({ id: `bill:${id}`, category: "home", domains: ["home"], title, detail: stringParts(bill.provider, bill.category, bill.status), href: `/office/bills/${id}`, dueAt: validDate(bill.dueDate), badge: "Bill", searchText: stringParts(title, bill.provider, bill.category, bill.status), updatedAt: text(bill.updatedAt) });
  });
  asArray(asRecord(state.professionalContacts).contacts).forEach((contact) => {
    const id = text(contact.id); if (!id) return;
    const title = stringParts(contact.firstName, contact.lastName) || text(contact.company) || "Contact";
    candidates.push({ id: `contact:${id}`, category: "contacts", domains: ["contacts"], title, detail: stringParts(contact.role, contact.company, contact.category), href: `/office/contacts/${id}`, dueAt: validDate(contact.nextReviewDate), badge: "Contact", searchText: stringParts(title, contact.role, contact.company, contact.category), updatedAt: text(contact.updatedAt) });
  });
  return candidates;
}

export async function GET(request: Request) {
  if (!isSupabaseConfiguredServer()) return NextResponse.json({ error: "Secure search is not configured." }, { status: 503 });
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "Please sign in again to search DiaryDock." }, { status: 401 });
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const requestedCategory = url.searchParams.get("category") || "all";
  const requestedDate = url.searchParams.get("date") || "all";
  if (!searchCategories.includes(requestedCategory as SearchCategory) || !searchDateFilters.includes(requestedDate as SearchDateFilter)) return NextResponse.json({ error: "Choose valid search filters." }, { status: 400 });
  const rateLimit = await checkSharedRateLimit(supabase, createRateLimitKey("search", authData.user.id), { limit: 90, windowMs: 5 * 60 * 1000 });
  if (!rateLimit.allowed) return NextResponse.json({ error: "Search is busy. Please wait a moment and try again." }, { status: 429 });

  const [documentsResult, remindersResult, assetsResult, stateResult] = await Promise.all([
    supabase.from("documents").select("id, user_id, title, category, kind, room_id, room_name, issuer, due_date, review_status, updated_at").order("updated_at", { ascending: false }).limit(250),
    supabase.from("reminders").select("id, title, room_name, reminder_group, time_label, priority, document_title, due_at, source_due_at, updated_at").order("updated_at", { ascending: false }).limit(250),
    supabase.from("assets").select("id, name, category, location, manufacturer, model, warranty_due_at, next_service_at, updated_at").order("updated_at", { ascending: false }).limit(250),
    supabase.from("app_state").select("payload").eq("id", authData.user.id).maybeSingle()
  ]);
  if (documentsResult.error || remindersResult.error || assetsResult.error || stateResult.error) return NextResponse.json({ error: "Search could not safely load your records." }, { status: 500 });

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
  (assetsResult.data ?? []).forEach((asset) => candidates.push({ id: `asset:${asset.id}`, category: "assets", domains: ["assets", "home"], title: text(asset.name) || "Smart item", detail: stringParts(asset.category, asset.location, asset.manufacturer, asset.model), href: `/assets/${asset.id}`, dueAt: validDate(asset.warranty_due_at) || validDate(asset.next_service_at), badge: "Item", searchText: stringParts(asset.name, asset.category, asset.location, asset.manufacturer, asset.model), updatedAt: text(asset.updated_at) }));
  candidates.push(...appStateCandidates(stateResult.data?.payload));
  Object.values(roomDetails).forEach((room) => candidates.push({ id: `room:${room.id}`, category: "home", domains: ["home"], title: room.name, detail: room.domain, href: `/room/${room.id}`, badge: "Area", searchText: stringParts(room.name, room.domain, room.headline, room.description) }));

  const results = filterAndRankSearchResults(candidates, query, requestedCategory as SearchCategory, requestedDate as SearchDateFilter).slice(0, 50);
  return NextResponse.json({ results, query, filters: { category: requestedCategory, date: requestedDate } }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
