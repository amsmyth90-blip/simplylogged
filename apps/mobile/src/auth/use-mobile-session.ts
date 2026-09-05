import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";

import type { SqliteOfflineStore } from "@mobile/data/offline";
import { getSecureRuntime } from "@mobile/platform/runtime-security";

import type { SignUpResult } from "./auth-types";
import { MOBILE_AUTH_CONFIRM_URL, MOBILE_AUTH_RESET_URL } from "./mobile-auth-link";
import { isPasswordRecoveryPending, setPasswordRecoveryPending } from "./secure-auth-storage";
import { getMobileSupabase } from "./supabase-client";
import { useMobileAuthLinks } from "./use-mobile-auth-links";

export type MobileSessionState =
  | { status: "CONFIGURATION_ERROR"; message: string }
  | { status: "LOADING" }
  | { status: "OFFLINE_STORAGE_ERROR"; message: string }
  | { status: "PASSWORD_RECOVERY"; session: Session }
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

function safeSignUpMessage(message: string) {
  const normal = message.toLowerCase();
  if (normal.includes("rate") || normal.includes("too many")) {
    return "Too many account attempts. Please wait a moment and try again.";
  }
  if (normal.includes("network") || normal.includes("fetch")) {
    return "DiaryDock could not connect. Try again shortly.";
  }
  if (normal.includes("password")) return "Choose a different secure password and try again.";
  return "DiaryDock could not create your account. Try again shortly.";
}

async function accountRegistry() {
  return (await import("./native-offline-account-registry")).nativeOfflineAccountRegistry;
}

export function useMobileSession() {
  const [state, setState] = useState<MobileSessionState>({ status: "LOADING" });
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInMessage, setSignInMessage] = useState<string | null>(null);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [recoveredPasswordError, setRecoveredPasswordError] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const storeRef = useRef<SqliteOfflineStore | null>(null);
  const accountRef = useRef<string | null>(null);
  const purgeOnSignOutRef = useRef(false);
  const transition = useRef<Promise<void>>(Promise.resolve());
  const recoveryIntent = useRef(false);

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
        status: "OFFLINE_STORAGE_ERROR",
        message: "Encrypted offline storage could not be opened.",
      });
    });
    return transition.current;
  }, []);

  const startAuthLink = useCallback(() => setState({ status: "LOADING" }), []);
  const failAuthLink = useCallback(() => {
    recoveryIntent.current = false;
    setSignInError("That secure email link has expired or is invalid.");
    setState({ status: "SIGNED_OUT" });
  }, []);
  const confirmEmail = useCallback(async (session: Session) => {
    recoveryIntent.current = false;
    await applySession(session);
  }, [applySession]);
  const recoverPassword = useCallback((session: Session) => {
    recoveryIntent.current = true;
    setRecoveredPasswordError(null);
    setState({ status: "PASSWORD_RECOVERY", session });
  }, []);
  useMobileAuthLinks({ onConfirm: confirmEmail, onError: failAuthLink,
    onRecovery: recoverPassword, onStart: startAuthLink });

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      await (await accountRegistry()).recoverPendingPurge();
      recoveryIntent.current = await isPasswordRecoveryPending();
      if (!active) return;
      const client = getMobileSupabase();
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        if (recoveryIntent.current && session) {
          setState({ status: "PASSWORD_RECOVERY", session });
        } else void applySession(session);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      const current = await client.auth.getSession();
      if (active && recoveryIntent.current && current.data.session) {
        setState({ status: "PASSWORD_RECOVERY", session: current.data.session });
      } else if (active) await applySession(current.data.session);
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
    setSignInMessage(null);
    recoveryIntent.current = false;
    await setPasswordRecoveryPending(false);
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

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    setSignUpError(null);
    recoveryIntent.current = false;
    await setPasswordRecoveryPending(false);
    const emailRedirectTo = Capacitor.isNativePlatform()
      ? MOBILE_AUTH_CONFIRM_URL
      : new URL("/auth/callback?next=/login", getSecureRuntime().apiOrigin).toString();
    try {
      const { data, error } = await getMobileSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo },
      });
      if (error) {
        setSignUpError(safeSignUpMessage(error.message));
        return { ok: false };
      }
      return { ok: true, requiresEmailConfirmation: !data.session };
    } catch {
      setSignUpError("DiaryDock could not connect. Try again shortly.");
      return { ok: false };
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    setPasswordResetError(null);
    const redirectTo = Capacitor.isNativePlatform() ? MOBILE_AUTH_RESET_URL
      : new URL("/auth/callback?next=/reset-password", getSecureRuntime().apiOrigin).toString();
    try {
      const { error } = await getMobileSupabase().auth.resetPasswordForEmail(email.trim(),
        { redirectTo });
      if (error) {
        setPasswordResetError(safeSignUpMessage(error.message));
        return { ok: false as const };
      }
      await setPasswordRecoveryPending(true);
      return { ok: true as const };
    } catch {
      setPasswordResetError("DiaryDock could not connect. Try again shortly.");
      return { ok: false as const };
    }
  }, []);

  const finishPasswordRecovery = useCallback(async (password: string) => {
    setRecoveredPasswordError(null);
    try {
      const client = getMobileSupabase();
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        setRecoveredPasswordError(safeSignUpMessage(error.message));
        return { ok: false as const };
      }
      recoveryIntent.current = false;
      await setPasswordRecoveryPending(false);
      await client.auth.signOut({ scope: "local" });
      await applySession(null);
      setSignInMessage("Your password has been updated. Sign in with your new password.");
      return { ok: true as const };
    } catch {
      setRecoveredPasswordError("DiaryDock could not update your password. Try again shortly.");
      return { ok: false as const };
    }
  }, [applySession]);

  const cancelPasswordRecovery = useCallback(async () => {
    recoveryIntent.current = false;
    await setPasswordRecoveryPending(false);
    await getMobileSupabase().auth.signOut({ scope: "local" }).catch(() => undefined);
    await applySession(null);
  }, [applySession]);

  const signOut = useCallback(async () => {
    const accountId = accountRef.current;
    if (accountId) await (await accountRegistry()).requestPurge(accountId);
    purgeOnSignOutRef.current = true;
    recoveryIntent.current = false;
    await setPasswordRecoveryPending(false);
    const { error } = await getMobileSupabase().auth.signOut({ scope: "local" });
    await applySession(null);
    if (error) throw new Error("DiaryDock could not complete sign out safely.");
  }, [applySession]);

  const retryOfflineStorage = useCallback(async () => {
    setState({ status: "LOADING" });
    try {
      const current = await getMobileSupabase().auth.getSession();
      await applySession(current.data.session);
    } catch {
      setState({
        status: "OFFLINE_STORAGE_ERROR",
        message: "Encrypted offline storage could not be opened.",
      });
    }
  }, [applySession]);

  const returnToSignIn = useCallback(async () => {
    recoveryIntent.current = false;
    await setPasswordRecoveryPending(false).catch(() => undefined);
    try {
      await getMobileSupabase().auth.signOut({ scope: "local" });
    } catch {
      // The local UI must remain recoverable even if native auth storage is unavailable.
    }
    await storeRef.current?.close().catch(() => undefined);
    purgeOnSignOutRef.current = false;
    storeRef.current = null;
    accountRef.current = null;
    setState({ status: "SIGNED_OUT" });
  }, []);

  return { cancelPasswordRecovery, finishPasswordRecovery, passwordResetError,
    recoveredPasswordError, requestPasswordReset, state, signIn, signInError,
    signInMessage, signOut, signUp, signUpError, retryOfflineStorage, returnToSignIn };
}
