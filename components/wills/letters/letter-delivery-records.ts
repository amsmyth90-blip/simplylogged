import type { DiaryDockAppState } from "@/lib/diarydock-data";
import {
  hydrateLettersRecord,
  type LetterDeliveryPreferences,
} from "@/lib/letter-records";

export function replaceLetterDelivery(
  state: DiaryDockAppState,
  letterId: string,
  delivery: LetterDeliveryPreferences,
) {
  const record = hydrateLettersRecord(state.willsWishes.lettersOfWishes);
  const now = new Date().toISOString();
  return {
    ...state,
    willsWishes: {
      ...state.willsWishes,
      lettersOfWishes: {
        letters: record.letters.map((letter) =>
          letter.id === letterId
            ? {
                ...letter,
                delivery,
                deliveryActivation: "not-active" as const,
                updatedAt: now,
              }
            : letter,
        ),
        updatedAt: now,
      },
    },
  };
}
