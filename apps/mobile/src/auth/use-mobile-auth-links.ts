import { App } from "@capacitor/app";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";

import { setPasswordRecoveryPending } from "./secure-auth-storage";
import { parseMobileAuthLink } from "./mobile-auth-link";
import { getMobileSupabase } from "./supabase-client";

type MobileAuthLinkHandlers = {
  onConfirm: (session: Session) => Promise<void>;
  onError: () => void;
  onRecovery: (session: Session) => void;
  onStart: () => void;
};

export function useMobileAuthLinks(handlers: MobileAuthLinkHandlers) {
  const handledCode = useRef<string | null>(null);
  const { onConfirm, onError, onRecovery, onStart } = handlers;

  useEffect(() => {
    let active = true;
    const receive = async (value: string) => {
      const link = parseMobileAuthLink(value);
      if (!link || handledCode.current === link.code) return;
      try {
        const client = getMobileSupabase();
        const current = await client.auth.getSession();
        if (!active) return;
        if (current.data.session) return;
        handledCode.current = link.code;
        if (link.purpose === "RESET_PASSWORD") await setPasswordRecoveryPending(true);
        onStart();
        const { data, error } = await client.auth.exchangeCodeForSession(link.code);
        if (!active) return;
        if (error || !data.session) throw new Error("Authentication link failed.");
        if (link.purpose === "RESET_PASSWORD") onRecovery(data.session);
        else await onConfirm(data.session);
      } catch {
        if (!active) return;
        handledCode.current = null;
        onError();
      }
    };

    void App.getLaunchUrl().then((result) => {
      if (active && result?.url) void receive(result.url);
    }).catch(() => undefined);
    const listener = App.addListener("appUrlOpen", ({ url }) => void receive(url));
    return () => {
      active = false;
      void listener.then((handle) => handle.remove());
    };
  }, [onConfirm, onError, onRecovery, onStart]);
}
