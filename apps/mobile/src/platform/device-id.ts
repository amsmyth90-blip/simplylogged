import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { Capacitor } from "@capacitor/core";

import { configureNativeSecureStorage } from "@mobile/auth/secure-auth-storage";

const DEVICE_ID_KEY = "device.id";
let previewDeviceId: string | null = null;

export async function getDeviceId() {
  if (!Capacitor.isNativePlatform()) {
    previewDeviceId ??= crypto.randomUUID();
    return previewDeviceId;
  }

  await configureNativeSecureStorage();
  const stored = await SecureStorage.getItem(DEVICE_ID_KEY);
  if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) {
    return stored;
  }
  const created = crypto.randomUUID();
  await SecureStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}
