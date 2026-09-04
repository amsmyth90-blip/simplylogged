import {
  createInitialWishesPreferences,
  parseWishesPreferences,
  wishesPreferenceKeys,
  type WishesPreferences,
} from "@diarydock/wills";

import { date, object, text, timestamp } from "./projection-values.ts";

const limits: Record<(typeof wishesPreferenceKeys)[number], number> = {
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

export function projectMobileWishes(value: unknown): WishesPreferences {
  const item = object(value);
  const initial = createInitialWishesPreferences();
  const preferences = Object.fromEntries(wishesPreferenceKeys.map((key) => [
    key,
    key === "dateOfBirth" || key === "lastReviewed"
      ? date(item[key])
      : text(item[key], limits[key]),
  ]));
  return parseWishesPreferences({
    ...initial,
    ...preferences,
    updatedAt: timestamp(item.updatedAt, true),
  });
}
