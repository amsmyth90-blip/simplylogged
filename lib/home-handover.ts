export const HANDOVER_ASSET_CATEGORIES = ["APPLIANCE", "BOILER", "EQUIPMENT"] as const;

const allowedDocumentCategory = /(manual|warranty|appliance|property|home)/i;
const blockedDocumentCategory = /(finance|financial|identity|legal|estate|health|medical|correspondence|insurance|receipt|bill|bank|tax|passport|travel|pet)/i;

export function isHandoverDocumentCategory(category: string) {
  return allowedDocumentCategory.test(category) && !blockedDocumentCategory.test(category);
}

export function isHandoverAssetCategory(category: string): category is (typeof HANDOVER_ASSET_CATEGORIES)[number] {
  return HANDOVER_ASSET_CATEGORIES.includes(category as (typeof HANDOVER_ASSET_CATEGORIES)[number]);
}

