import type { LifeSourceType } from "@/lib/life-graph/types";

export const lifeInboxStatuses = ["received", "stored", "classified", "needs_review", "confirmed", "failed"] as const;

export type LifeInboxStatus = (typeof lifeInboxStatuses)[number];

export type LifeInboxItem = {
  id: string;
  userId: string;
  sourceType: Extract<LifeSourceType, "document_upload" | "email_import" | "share_sheet" | "manual">;
  status: LifeInboxStatus;
  title: string;
  sourceLabel?: string;
  documentId?: string;
  storageBucket?: string;
  storagePath?: string;
  suggestedRoom?: string;
  suggestedEntityType?: string;
  suggestedEntityId?: string;
  confidence?: number;
  reviewReasons: string[];
  fingerprint?: string;
  createdAt: string;
  updatedAt: string;
};

export type LifeInboxSuggestion = {
  suggestedRoom?: string;
  suggestedEntityType?: string;
  suggestedEntityId?: string;
  confidence: number;
  reviewReasons: string[];
};

