import type {
  WishesPreferences,
  WishesPreferencesDraft,
} from "./wishes-types.ts";

export const wishesPreferenceKeys = [
  "fullName",
  "address",
  "dateOfBirth",
  "willStatus",
  "executorName",
  "solicitorName",
  "originalWillLocation",
  "funeralPreference",
  "funeralDetails",
  "musicAndReadings",
  "personalMessage",
  "specialBelongings",
  "petCareWishes",
  "trustedPeople",
  "reviewFrequency",
  "lastReviewed",
] as const satisfies ReadonlyArray<keyof WishesPreferencesDraft>;

export function createInitialWishesPreferences(): WishesPreferences {
  return {
    fullName: "",
    address: "",
    dateOfBirth: "",
    willStatus: "",
    executorName: "",
    solicitorName: "",
    originalWillLocation: "",
    funeralPreference: "",
    funeralDetails: "",
    musicAndReadings: "",
    personalMessage: "",
    specialBelongings: "",
    petCareWishes: "",
    trustedPeople: "",
    reviewFrequency: "",
    lastReviewed: "",
    updatedAt: "",
  };
}
