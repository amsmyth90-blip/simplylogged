"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Factor = { id: string; friendly_name?: string };
type Setup = { id: string; qr: string; secret: string };
type View = { status: "loading" | "required" | "ready" | "error"; factors: Factor[]; error: string };
const initial: View = { status: "loading", factors: [], error: "" };

export function useVaultMfa(client: SupabaseClient, accountId: string) {
  const [view, setView] = useState<View>(initial);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(false);
  const epoch = useRef(0);
  const working = useRef(false);
  const mounted = useRef(false);
  const setupRef = useRef<Setup | null>(null);

  const refresh = useCallback(async () => {
    const current = ++epoch.current;
    setView(initial);
    try {
      const { data: identity, error: identityError } = await client.auth.getUser();
      if (identityError || identity.user?.id !== accountId) throw new Error("Please sign in again.");
      const { data: assurance, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw new Error("Could not check two-factor authentication. Please try again.");
      const factors =
        identity.user.factors?.filter((f) => f.status === "verified" && f.factor_type === "totp") ?? [];
      if (current !== epoch.current || !mounted.current) return;
      const ready = assurance.currentLevel === "aal2" && factors.length > 0;
      if (ready) {
        setupRef.current = null;
        setSetup(null);
      }
      setView({ status: ready ? "ready" : "required", factors, error: "" });
    } catch (error) {
      if (current === epoch.current && mounted.current)
        setView({
          status: "error",
          factors: [],
          error: error instanceof Error ? error.message : "Authentication is unavailable.",
        });
    }
  }, [client, accountId]);

  useEffect(() => {
    mounted.current = true;
    let timer = setTimeout(() => void refresh(), 0);
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setupRef.current = null;
        setSetup(null);
      }
      ++epoch.current;
      setView(initial); // Immediately unmount decrypted content even for same-account changes.
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 0); // Outside the Supabase auth lock.
    });
    return () => {
      mounted.current = false;
      // This ref is an operation counter, deliberately invalidated at cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++epoch.current;
      clearTimeout(timer);
      data.subscription.unsubscribe();
      setupRef.current = null;
    };
  }, [client, refresh]);

  async function enroll() {
    if (working.current || setupRef.current || view.status !== "required") return;
    working.current = true;
    setBusy(true);
    const current = epoch.current;
    try {
      const identity = await client.auth.getUser();
      if (identity.error || identity.data.user?.id !== accountId) throw new Error("Please sign in again.");
      const result = await client.auth.mfa.enroll({
        factorType: "totp",
        issuer: "DiaryDock",
        friendlyName: "DiaryDock authenticator " + new Date().toISOString(),
      });
      if (result.error) throw new Error("Authenticator setup could not start. Please try again.");
      if (current !== epoch.current || !mounted.current) return;
      const value = { id: result.data.id, qr: result.data.totp.qr_code, secret: result.data.totp.secret };
      setupRef.current = value;
      setSetup(value);
      setView((v) => ({ ...v, error: "" }));
    } catch (error) {
      if (current === epoch.current && mounted.current)
        setView((v) => ({ ...v, error: error instanceof Error ? error.message : "Setup failed." }));
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function verify(factorId: string, code: string) {
    if (working.current || !/^\d{6}$/.test(code)) return;
    if (factorId !== setupRef.current?.id && !view.factors.some((f) => f.id === factorId)) return;
    working.current = true;
    setBusy(true);
    try {
      const identity = await client.auth.getUser();
      if (identity.error || identity.data.user?.id !== accountId) throw new Error("Please sign in again.");
      const result = await client.auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error)
        throw new Error("That code could not be verified. Enter the current code from your authenticator.");
      await refresh();
    } catch (error) {
      if (mounted.current)
        setView((v) => ({ ...v, error: error instanceof Error ? error.message : "Verification failed." }));
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return { ...view, setup, busy, enroll, verify, refresh };
}
