import type {
  WishesPreferences,
  WishesPreferencesDraft,
} from "./wishes-types.ts";
import {
  createInitialWishesPreferences,
  wishesPreferenceKeys,
} from "./wishes-record.ts";
import { date, exact, record, text, timestamp } from "./validation.ts";

const limits: Record<keyof WishesPreferencesDraft, number> = {
  fullName: 160,
  address: 1_000,
  dateOfBirth: 10,
  willStatus: 160,
  executorName: 160,
  solicitorName: 160,
  originalWillLocation: 2_000,
  funeralPreference: 2_000,
  funeralDetails: 10_000,
  musicAndReadings: 10_000,
  personalMessage: 20_000,
  specialBelongings: 10_000,
  petCareWishes: 10_000,
  trustedPeople: 2_000,
  reviewFrequency: 160,
  lastReviewed: 10,
};

export function parseWishesPreferences(value: unknown): WishesPreferences {
  const item = record(value, "Wishes and preferences");
  exact(item, [...wishesPreferenceKeys, "updatedAt"], "Wishes and preferences");
  const parsed = Object.fromEntries(wishesPreferenceKeys.map((key) => [
    key,
    key === "dateOfBirth" || key === "lastReviewed"
      ? date(item[key], `Wishes ${key}`)
      : text(item[key], `Wishes ${key}`, limits[key], true),
  ])) as WishesPreferencesDraft;
  return {
    ...parsed,
    updatedAt: timestamp(item.updatedAt, "Wishes update time", true),
  };
}

export function parseWishesPreferencesDraft(value: unknown): WishesPreferencesDraft {
  const item = record(value, "Wishes update");
  const initial = createInitialWishesPreferences();
  const parsed = parseWishesPreferences({ ...initial, ...item });
  return Object.fromEntries(wishesPreferenceKeys.map((key) => [
    key,
    parsed[key],
  ])) as WishesPreferencesDraft;
}
