import type {
  LetterOfWishes,
  LetterPurpose,
  LetterRecipientType,
  LettersOfWishesRecord,
} from "./letter-types.ts";

export const letterRecipientOptions: Array<{
  value: LetterRecipientType;
  label: string;
  description: string;
}> = [
  { value: "children", label: "My children", description: "One child or all of your children" },
  { value: "partner", label: "My partner", description: "A husband, wife or partner" },
  { value: "family", label: "My family", description: "Your wider family" },
  { value: "friend", label: "A friend", description: "A close friend or chosen family" },
  { value: "future-me", label: "Future me", description: "A private letter to yourself" },
  { value: "other", label: "Other", description: "Someone else important to you" },
];

export const letterPurposeOptions: Array<{
  value: LetterPurpose;
  label: string;
  description: string;
}> = [
  { value: "just-because", label: "Just because", description: "A message for any time" },
  { value: "life-moment", label: "Life moment", description: "For a milestone or special occasion" },
  { value: "future-delivery", label: "Future delivery", description: "Record when you would like it shared" },
  { value: "important-guidance", label: "Important guidance", description: "Personal advice or practical instructions" },
];

export function createInitialLettersRecord(): LettersOfWishesRecord {
  return { letters: [], updatedAt: "" };
}

export function createLetterDraft(): LetterOfWishes {
  return {
    id: "", title: "", recipientType: "children", recipientName: "",
    purpose: "just-because", content: "", envelopeTitle: "",
    envelopeMessage: "", memoryNotes: "", attachmentDocumentIds: [],
    delivery: { type: "not-set", date: "", time: "", eventDescription: "",
      reminder: "none", intendedPeople: "", trustedSettingsReviewed: false },
    deliveryActivation: "not-active", status: "draft", versions: [],
    createdAt: "", updatedAt: "",
  };
}

export function hydrateLettersRecord(
  record: Partial<LettersOfWishesRecord> | null | undefined,
): LettersOfWishesRecord {
  const initial = createLetterDraft();
  return {
    letters: Array.isArray(record?.letters) ? record.letters.map((letter) => ({
      ...initial,
      ...letter,
      attachmentDocumentIds: Array.isArray(letter.attachmentDocumentIds)
        ? letter.attachmentDocumentIds
        : [],
      delivery: { ...initial.delivery, ...(letter.delivery ?? {}) },
      deliveryActivation: "not-active",
      versions: Array.isArray(letter.versions) ? letter.versions : [],
    })) : [],
    updatedAt: record?.updatedAt ?? "",
  };
}

export function recipientLabel(value: LetterRecipientType) {
  return letterRecipientOptions.find((option) => option.value === value)?.label ?? "Other";
}

export function purposeLabel(value: LetterPurpose) {
  return letterPurposeOptions.find((option) => option.value === value)?.label ?? "Personal letter";
}
