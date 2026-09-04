import type { LetterContentVersion, LetterOfWishes } from "./letter-types.ts";
import type {
  MobileWillRecord,
  MobileWillVersion,
  WillPreparationItem,
  WillPreparationKey,
  WillSummaryReview,
} from "./will-types.ts";
import type { WishesPreferencesDraft } from "./wishes-types.ts";

export type WillDetails = Omit<
  MobileWillRecord,
  | "currentVersionId"
  | "lastReviewedAt"
  | "nextReviewAt"
  | "preparation"
  | "updatedAt"
  | "versions"
>;

export type LetterDraft = Omit<
  LetterOfWishes,
  "createdAt" | "updatedAt" | "versions"
>;

type MutationBase = { revision: string | null };

export type WillsMutation =
  | (MutationBase & {
      operation: "UPDATE_WISHES";
      preferences: WishesPreferencesDraft;
    })
  | (MutationBase & { operation: "UPDATE_DETAILS"; details: WillDetails })
  | (MutationBase & {
      operation: "UPDATE_PREPARATION";
      key: WillPreparationKey;
      item: WillPreparationItem;
    })
  | (MutationBase & { operation: "ADD_WILL_VERSION"; version: MobileWillVersion })
  | (MutationBase & { operation: "SET_CURRENT_VERSION"; versionId: string })
  | (MutationBase & {
      operation: "REVIEW_VERSION";
      versionId: string;
      review: WillSummaryReview;
      note: string;
    })
  | (MutationBase & {
      operation: "MARK_REVIEWED";
      reviewedAt: string;
      nextReviewAt: string;
    })
  | (MutationBase & {
      operation: "UPSERT_LETTER";
      letter: LetterDraft;
      version: LetterContentVersion;
    })
  | (MutationBase & {
      operation: "RESTORE_LETTER_VERSION";
      letterId: string;
      versionId: string;
      newVersionId: string;
      createdAt: string;
    });
