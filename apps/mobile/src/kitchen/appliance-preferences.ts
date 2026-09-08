import type { JsonObject } from "@diarydock/contracts";
import { tryGetReadModel, tryPutReadModel, type OfflineStore } from "@diarydock/offline-store";
import type { KitchenAppliance } from "@diarydock/kitchen";

const CACHE_KEY = "kitchen-appliance-preferences";
const SCHEMA_VERSION = 1;
export const defaultKitchenAppliances: KitchenAppliance[] = ["oven", "hob", "microwave"];

const applianceSet = new Set<KitchenAppliance>([
  "oven", "hob", "air fryer", "slow cooker", "microwave", "barbecue",
]);

export function parseKitchenAppliances(value: unknown): KitchenAppliance[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !Array.isArray(record.appliances)
    || !record.appliances.length || record.appliances.length > applianceSet.size) return null;
  const appliances = record.appliances;
  if (appliances.some((item) => typeof item !== "string"
    || !applianceSet.has(item as KitchenAppliance))
    || new Set(appliances).size !== appliances.length) return null;
  return appliances as KitchenAppliance[];
}

export async function loadKitchenAppliances(store: OfflineStore) {
  const cached = await tryGetReadModel(store, CACHE_KEY);
  if (!cached || cached.schemaVersion !== SCHEMA_VERSION) return [...defaultKitchenAppliances];
  return parseKitchenAppliances(cached.payload) ?? [...defaultKitchenAppliances];
}

export async function saveKitchenAppliances(store: OfflineStore, appliances: KitchenAppliance[]) {
  const parsed = parseKitchenAppliances({ appliances });
  if (!parsed) return false;
  return tryPutReadModel(store, CACHE_KEY, SCHEMA_VERSION,
    { appliances: parsed } as JsonObject);
}
