import { SecureStorage } from "@aparajita/capacitor-secure-storage";

import { deleteEncryptedOfflineDatabase } from "@mobile/data/offline/database";
import { databaseNameForAccount } from "@mobile/data/offline/database-key";

import { configureNativeSecureStorage } from "./secure-auth-storage";
import { createOfflineAccountRegistry } from "./offline-account-registry";

const MARKER_KEY = "offline-account-state";

async function configured<T>(operation: () => Promise<T>) {
  await configureNativeSecureStorage();
  return operation();
}

export const nativeOfflineAccountRegistry = createOfflineAccountRegistry({
  databaseName: databaseNameForAccount,
  deleteDatabase: deleteEncryptedOfflineDatabase,
  getMarker: () => configured(() => SecureStorage.getItem(MARKER_KEY)),
  removeMarker: () => configured(() => SecureStorage.removeItem(MARKER_KEY)),
  setMarker: (value) => configured(() => SecureStorage.setItem(MARKER_KEY, value)),
});
