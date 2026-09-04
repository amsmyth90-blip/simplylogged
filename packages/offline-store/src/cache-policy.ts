import type { JsonObject } from "@diarydock/contracts";

import type { CacheFileInput, OfflineStore } from "./types.ts";

export async function tryGetReadModel(
  store: Pick<OfflineStore, "getReadModel">,
  key: string,
) {
  try {
    return await store.getReadModel(key);
  } catch {
    return null;
  }
}

export async function tryCacheFile(
  store: Pick<OfflineStore, "cacheFile">,
  input: CacheFileInput,
) {
  try {
    await store.cacheFile(input);
    return true;
  } catch {
    return false;
  }
}

export async function tryPutReadModel(
  store: Pick<OfflineStore, "putReadModel">,
  key: string,
  schemaVersion: number,
  payload: JsonObject,
) {
  try {
    await store.putReadModel(key, schemaVersion, payload);
    return true;
  } catch {
    return false;
  }
}

export async function tryRemoveReadModel(
  store: Pick<OfflineStore, "removeReadModel">,
  key: string,
) {
  try {
    await store.removeReadModel(key);
    return true;
  } catch {
    return false;
  }
}
