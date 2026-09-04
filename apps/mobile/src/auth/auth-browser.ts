import { Browser } from "@capacitor/browser";

import { getSecureRuntime } from "@mobile/platform/runtime-security";

export type MobileAuthPage = "/forgot-password" | "/signup";

export async function openMobileAuthPage(page: MobileAuthPage) {
  const url = new URL(page, getSecureRuntime().apiOrigin);
  await Browser.open({ presentationStyle: "popover", url: url.toString() });
}
