export type WishesPreferences = {
  fullName: string;
  address: string;
  dateOfBirth: string;
  willStatus: string;
  executorName: string;
  solicitorName: string;
  originalWillLocation: string;
  funeralPreference: string;
  funeralDetails: string;
  musicAndReadings: string;
  personalMessage: string;
  specialBelongings: string;
  petCareWishes: string;
  trustedPeople: string;
  reviewFrequency: string;
  lastReviewed: string;
  updatedAt: string;
};

export type WishesPreferencesDraft = Omit<WishesPreferences, "updatedAt">;
