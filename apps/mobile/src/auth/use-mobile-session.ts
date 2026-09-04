import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SqliteOfflineStore } from "@mobile/data/offline";

import { getMobileSupabase } from "./supabase-client";

export type MobileSessionState =
  | { status: "CONFIGURATION_ERROR"; message: string }
  | { status: "LOADING" }
  | { status: "SIGNED_IN"; session: Session; store: SqliteOfflineStore }
  | { status: "SIGNED_OUT" };

function safeConfigurationMessage(error: unknown) {
  return error instanceof Error && error.message === "Mobile authentication is not configured."
    ? error.message
    : "Mobile authentication could not be started securely.";
}

function safeSignInMessage(message: string) {
  const normal = message.toLowerCase();
  if (normal.includes("invalid login credentials")) return "The email or password is incorrect.";
  if (normal.includes("email not confirmed")) return "Confirm your email before signing in.";
  if (normal.includes("network") || normal.includes("fetch")) return "DiaryDock could not connect. Try again shortly.";
  return "DiaryDock could not sign you in. Try again shortly.";
}

async function accountRegistry() {
  return (await import("./native-offline-account-registry")).nativeOfflineAccountRegistry;
}

export function useMobileSession() {
  const [state, setState] = useState<MobileSessionState>({ status: "LOADING" });
  const [signInError, setSignInError] = useState<string | null>(null);
  const storeRef = useRef<SqliteOfflineStore | null>(null);
  const accountRef = useRef<string | null>(null);
  const purgeOnSignOutRef = useRef(false);
  const transition = useRef<Promise<void>>(Promise.resolve());

  const applySession = useCallback((session: Session | null) => {
    transition.current = transition.current.then(async () => {
      if (!session) {
        const accountId = accountRef.current;
        if (purgeOnSignOutRef.current) {
          await storeRef.current?.clear();
          if (accountId) await (await accountRegistry()).completePurge(accountId);
        } else {
          await storeRef.current?.close();
        }
        purgeOnSignOutRef.current = false;
        storeRef.current = null;
        accountRef.current = null;
        setState({ status: "SIGNED_OUT" });
        return;
      }
      if (accountRef.current !== session.user.id) {
        await storeRef.current?.close();
        await (await accountRegistry()).prepare(session.user.id);
        const { SqliteOfflineStore } = await import("@mobile/data/offline");
        const store = new SqliteOfflineStore(session.user.id);
        await store.initialize();
        storeRef.current = store;
        accountRef.current = session.user.id;
      }
      setState({ status: "SIGNED_IN", session, store: storeRef.current! });
    }).catch(() => {
      setState({
        status: "CONFIGURATION_ERROR",
        message: "Encrypted offline storage could not be opened.",
      });
    });
    return transition.current;
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      await (await accountRegistry()).recoverPendingPurge();
      if (!active) return;
      const client = getMobileSupabase();
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (active) void applySession(session);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      const current = await client.auth.getSession();
      if (active) await applySession(current.data.session);
    })().catch((error) => {
      if (active) setState({ status: "CONFIGURATION_ERROR", message: safeConfigurationMessage(error) });
    });
    return () => {
      active = false;
      unsubscribe?.();
      void storeRef.current?.close();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setSignInError(null);
    const { error } = await getMobileSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      const message = safeSignInMessage(error.message);
      setSignInError(message);
      return { ok: false as const, message };
    }
    return { ok: true as const };
  }, []);

  const signOut = useCallback(async () => {
    const accountId = accountRef.current;
    if (accountId) await (await accountRegistry()).requestPurge(accountId);
    purgeOnSignOutRef.current = true;
    const { error } = await getMobileSupabase().auth.signOut({ scope: "local" });
    await applySession(null);
    if (error) throw new Error("DiaryDock could not complete sign out safely.");
  }, [applySession]);

  return { state, signIn, signInError, signOut };
}
