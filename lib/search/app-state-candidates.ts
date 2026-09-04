import type { SearchCandidate } from "@/lib/search/results";

import {
  addDatedCandidate,
  asArray,
  asRecord,
  stringParts,
  text,
  validDate,
} from "./candidate-utils";

export function appStateCandidates(payload: unknown): SearchCandidate[] {
  const state = asRecord(payload);
  const candidates: SearchCandidate[] = [];

  asArray(asRecord(state.vehicles).vehicles).forEach((vehicle) => {
    const id = text(vehicle.id);
    if (!id) return;

    const title =
      text(vehicle.nickname) ||
      stringParts(vehicle.make, vehicle.model) ||
      "Vehicle";
    const detail = stringParts(
      vehicle.registration,
      vehicle.make,
      vehicle.model,
    );
    const common = stringParts(title, detail, vehicle.colour, vehicle.fuelType);

    candidates.push({
      id: `vehicle:${id}`,
      category: "vehicles",
      domains: ["vehicles"],
      title,
      detail,
      href: `/garage/vehicles/${id}`,
      badge: "Vehicle",
      searchText: common,
      updatedAt: text(vehicle.updatedAt),
    });
    addDatedCandidate(candidates, {
      id: `vehicle:${id}:mot`,
      category: "vehicles",
      domains: ["vehicles"],
      title: `${title} MOT`,
      detail,
      href: `/garage/vehicles/${id}`,
      dueAt: vehicle.motDueDate,
      badge: "MOT",
      searchText: stringParts(common, "MOT expiry due"),
      updatedAt: vehicle.updatedAt,
    });
    addDatedCandidate(candidates, {
      id: `vehicle:${id}:tax`,
      category: "vehicles",
      domains: ["vehicles"],
      title: `${title} vehicle tax`,
      detail,
      href: `/garage/vehicles/${id}`,
      dueAt: vehicle.taxDueDate,
      badge: "Tax",
      searchText: stringParts(common, "vehicle tax expiry due"),
      updatedAt: vehicle.updatedAt,
    });
    addDatedCandidate(candidates, {
      id: `vehicle:${id}:insurance`,
      category: "vehicles",
      domains: ["vehicles", "insurance"],
      title: `${title} insurance`,
      detail,
      href: `/garage/vehicles/${id}`,
      dueAt: vehicle.insuranceRenewalDate,
      badge: "Insurance",
      searchText: stringParts(
        common,
        "car vehicle insurance renewal expiry due",
      ),
      updatedAt: vehicle.updatedAt,
    });
  });

  asArray(asRecord(state.trips).trips).forEach((trip) => {
    const id = text(trip.id);
    if (!id) return;

    const title = text(trip.title) || text(trip.destination) || "Trip";
    candidates.push({
      id: `trip:${id}`,
      category: "travel",
      domains: ["travel"],
      title,
      detail: stringParts(
        trip.destinationCity,
        trip.destinationCountry,
        trip.startDate,
      ),
      href: `/driveway/trips/${id}`,
      dueAt: validDate(trip.startDate),
      badge: "Trip",
      searchText: stringParts(
        title,
        trip.destination,
        trip.destinationCity,
        trip.destinationCountry,
        trip.tripType,
        trip.status,
      ),
      updatedAt: text(trip.updatedAt),
    });
  });

  asArray(asRecord(state.insurance).policies).forEach((policy) => {
    const id = text(policy.id);
    if (!id) return;

    const title = text(policy.title) || "Insurance policy";
    candidates.push({
      id: `insurance:${id}`,
      category: "insurance",
      domains: ["insurance", "home"],
      title,
      detail: stringParts(policy.provider, policy.type, policy.status),
      href: `/office/insurance/${id}`,
      dueAt: validDate(policy.renewalDate),
      badge: "Policy",
      searchText: stringParts(
        title,
        policy.provider,
        policy.type,
        policy.status,
        "insurance renewal expiry due",
      ),
      updatedAt: text(policy.updatedAt),
    });
  });

  asArray(asRecord(state.bills).bills).forEach((bill) => {
    const id = text(bill.id);
    if (!id) return;

    const title = text(bill.title) || "Household bill";
    candidates.push({
      id: `bill:${id}`,
      category: "home",
      domains: ["home"],
      title,
      detail: stringParts(bill.provider, bill.category, bill.status),
      href: `/office/bills/${id}`,
      dueAt: validDate(bill.dueDate),
      badge: "Bill",
      searchText: stringParts(
        title,
        bill.provider,
        bill.category,
        bill.status,
        "bill payment due",
      ),
      updatedAt: text(bill.updatedAt),
    });
  });

  asArray(asRecord(state.professionalContacts).contacts).forEach((contact) => {
    const id = text(contact.id);
    if (!id) return;

    const title =
      stringParts(contact.firstName, contact.lastName) ||
      text(contact.company) ||
      "Contact";
    candidates.push({
      id: `contact:${id}`,
      category: "contacts",
      domains: ["contacts"],
      title,
      detail: stringParts(contact.role, contact.company, contact.category),
      href: `/office/contacts/${id}`,
      dueAt: validDate(contact.nextReviewDate),
      badge: "Contact",
      searchText: stringParts(
        title,
        contact.role,
        contact.company,
        contact.category,
      ),
      updatedAt: text(contact.updatedAt),
    });
  });

  return candidates;
}
