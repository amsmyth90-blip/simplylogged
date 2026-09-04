export const PHYSICAL_LINKS_SCHEMA_VERSION = 1;
export const PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION = 1;
export const physicalAssetCategories = ["APPLIANCE", "BOILER", "EQUIPMENT", "OTHER"] as const;
export const physicalLinkStatuses = ["ACTIVE", "DISABLED", "REVOKED", "REPLACED"] as const;
export const physicalLinkActions = ["RENAME", "DISABLE", "ENABLE", "REVOKE", "REASSIGN"] as const;

export type PhysicalAssetCategory = (typeof physicalAssetCategories)[number];
export type PhysicalLinkStatus = (typeof physicalLinkStatuses)[number];
export type PhysicalLinkAction = (typeof physicalLinkActions)[number];

export type PhysicalAsset = {
  id: string;
  name: string;
  category: PhysicalAssetCategory;
  location: string;
  manufacturer: string;
  model: string;
  serialNumberMasked: string;
  warrantyDueAt: string | null;
  nextServiceAt: string | null;
  maintenanceNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type PhysicalLink = {
  id: string;
  name: string;
  resourceId: string;
  status: PhysicalLinkStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  useCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PhysicalLinksSnapshot = {
  schemaVersion: typeof PHYSICAL_LINKS_SCHEMA_VERSION;
  revision: string;
  detailsComplete: boolean;
  assets: PhysicalAsset[];
  links: PhysicalLink[];
};

export type PhysicalAssetDetailRequest = { assetId: string };
export type PhysicalAssetDetail = {
  schemaVersion: typeof PHYSICAL_ASSET_DETAIL_SCHEMA_VERSION;
  asset: PhysicalAsset;
};

export type PhysicalAssetDraft = Omit<PhysicalAsset,
  "id" | "serialNumberMasked" | "createdAt" | "updatedAt"> & { serialNumber: string };

export type PhysicalLinksMutation =
  | { operation: "CREATE_ASSET"; revision: string; asset: PhysicalAssetDraft }
  | { operation: "CREATE_LINK"; revision: string; assetId: string; name: string;
      expiresAt: string | null }
  | { operation: "REPLACE_LINK"; revision: string; linkId: string }
  | { operation: "MANAGE_LINK"; revision: string; linkId: string;
      action: PhysicalLinkAction; value: string | null };

export type NewPhysicalLink = { id: string; path: string };
export type PhysicalLinksMutationResponse = {
  snapshot: PhysicalLinksSnapshot;
  newLink: NewPhysicalLink | null;
};
