import {
  KeychainAccess,
  SecureStorage,
} from "@aparajita/capacitor-secure-storage";
import { Capacitor } from "@capacitor/core";
import type { SupportedStorage } from "@supabase/supabase-js";

let nativeSecurityPolicy: Promise<void> | null = null;

export function configureNativeSecureStorage() {
  nativeSecurityPolicy ??= (async () => {
    await SecureStorage.setSynchronize(false);
    await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
    await SecureStorage.setKeyPrefix("com.diarydock.app.secure.");
  })();
  return nativeSecurityPolicy;
}

class MemoryAuthStorage implements SupportedStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

class NativeAuthStorage implements SupportedStorage {
  async getItem(key: string) {
    await configureNativeSecureStorage();
    return SecureStorage.getItem(key);
  }

  async setItem(key: string, value: string) {
    await configureNativeSecureStorage();
    await SecureStorage.setItem(key, value);
  }

  async removeItem(key: string) {
    await configureNativeSecureStorage();
    await SecureStorage.removeItem(key);
  }
}

export function createAuthStorage(): SupportedStorage {
  return Capacitor.isNativePlatform() ? new NativeAuthStorage() : new MemoryAuthStorage();
}
