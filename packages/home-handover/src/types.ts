export const HOME_HANDOVER_SCHEMA_VERSION = 2;
export const HOME_HANDOVER_DETAIL_SCHEMA_VERSION = 1;
export const handoverResourceTypes = ["ASSET", "DOCUMENT"] as const;

export type HandoverResourceType = (typeof handoverResourceTypes)[number];

export type HandoverDraft = {
  id: string;
  name: string;
  revision: string;
};

export type HandoverCandidate = {
  resourceType: HandoverResourceType;
  resourceId: string;
  label: string;
  detail: string;
  selected: boolean;
};

export type HandoverItem = HandoverCandidate & {
  id: string;
  addedAt: string;
};

export type HandoverPublication = {
  id: string;
  recipientEmail: string;
  publishedAt: string;
  expiresAt: string;
  revision: string;
  itemCount: number;
};

export type HandoverSharedItem = {
  id: string;
  resourceType: HandoverResourceType;
  label: string;
  detail: string;
};

export type ReceivedHandover = {
  id: string;
  name: string;
  publishedAt: string;
  expiresAt: string;
  items: HandoverSharedItem[];
};

export type HomeHandoverSnapshot = {
  schemaVersion: typeof HOME_HANDOVER_SCHEMA_VERSION;
  detailsComplete: boolean;
  draft: HandoverDraft | null;
  candidates: HandoverCandidate[];
  items: HandoverItem[];
  publication: HandoverPublication | null;
  received: ReceivedHandover[];
  exclusions: string[];
};

export type HomeHandoverMutation =
  | { operation: "CREATE_PACK"; name: string }
  | { operation: "SET_ITEM"; revision: string; packId: string;
      resourceType: HandoverResourceType; resourceId: string; selected: boolean }
  | { operation: "PUBLISH"; revision: string; packId: string; recipientEmail: string }
  | { operation: "REVOKE"; publicationId: string; publicationRevision: string };

export type HomeHandoverDetailRequest =
  | { scope: "OWNER"; resourceType: HandoverResourceType; resourceId: string }
  | { scope: "RECEIVED"; publicationId: string; itemId: string };

export type HomeHandoverDetail = HomeHandoverDetailRequest & {
  schemaVersion: typeof HOME_HANDOVER_DETAIL_SCHEMA_VERSION;
  label: string;
  detail: string;
};
