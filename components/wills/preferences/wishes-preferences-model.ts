import {
  parseWishesPreferencesDraft,
  wishesPreferenceKeys,
  type WishesPreferencesDraft,
} from "@diarydock/wills";

import type { DiaryDockAppState, WillsWishesRecord } from "../../../lib/diarydock-types.ts";

export function wishesDraftFromRecord(record: WillsWishesRecord): WishesPreferencesDraft {
  return parseWishesPreferencesDraft(Object.fromEntries(
    wishesPreferenceKeys.map((key) => [key, record[key]]),
  ));
}

export function applyWishesPreferences(
  state: DiaryDockAppState,
  draft: WishesPreferencesDraft,
  updatedAt = new Date().toISOString(),
): DiaryDockAppState {
  const preferences = parseWishesPreferencesDraft(draft);
  return {
    ...state,
    willsWishes: {
      ...state.willsWishes,
      ...preferences,
      updatedAt,
    },
  };
}
