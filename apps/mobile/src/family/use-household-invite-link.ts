import { App } from "@capacitor/app";
import { useCallback, useEffect, useState } from "react";

import { getSecureRuntime } from "@mobile/platform/runtime-security";
import { parseHouseholdInviteUrl } from "./invite-link";

export function useHouseholdInviteLink() {
  const [token, setToken] = useState<string | null>(null);
  const receive = useCallback((url: string) => {
    const next = parseHouseholdInviteUrl(url, getSecureRuntime().apiOrigin.toString());
    if (next) setToken(next);
  }, []);

  useEffect(() => {
    let active = true;
    void App.getLaunchUrl().then((result) => {
      if (active && result?.url) receive(result.url);
    }).catch(() => undefined);
    const listener = App.addListener("appUrlOpen", ({ url }) => {
      if (active) receive(url);
    });
    return () => {
      active = false;
      void listener.then((handle) => handle.remove());
    };
  }, [receive]);

  return { clear: useCallback(() => setToken(null), []), token };
}
