export type LetterRecipientType = "children" | "partner" | "family" | "friend" | "future-me" | "other";
export type LetterPurpose = "just-because" | "life-moment" | "future-delivery" | "important-guidance";
export type LetterDeliveryType = "not-set" | "now" | "date" | "event" | "after-death";
export type LetterStatus = "draft" | "ready";

export type LetterContentVersion = {
  id: string;
  versionNumber: number;
  createdAt: string;
  title: string;
  content: string;
  envelopeTitle: string;
  envelopeMessage: string;
};

export type LetterDeliveryPreferences = {
  type: LetterDeliveryType;
  date: string;
  time: string;
  eventDescription: string;
  reminder: "none" | "1-day" | "7-days" | "30-days";
  intendedPeople: string;
  trustedSettingsReviewed: boolean;
};

export type LetterOfWishes = {
  id: string;
  title: string;
  recipientType: LetterRecipientType;
  recipientName: string;
  purpose: LetterPurpose;
  content: string;
  envelopeTitle: string;
  envelopeMessage: string;
  memoryNotes: string;
  attachmentDocumentIds: string[];
  delivery: LetterDeliveryPreferences;
  deliveryActivation: "not-active";
  status: LetterStatus;
  versions: LetterContentVersion[];
  createdAt: string;
  updatedAt: string;
};

export type LettersOfWishesRecord = {
  letters: LetterOfWishes[];
  updatedAt: string;
};

export type MobileLetterContentVersion = Pick<
  LetterContentVersion,
  "createdAt" | "id" | "title" | "versionNumber"
>;

export type MobileLetterOfWishes = Omit<LetterOfWishes, "versions"> & {
  versions: MobileLetterContentVersion[];
};

export type MobileLettersOfWishesRecord = {
  letters: MobileLetterOfWishes[];
  updatedAt: string;
};
