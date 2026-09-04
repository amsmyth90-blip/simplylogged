import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { Browser } from "@capacitor/browser";

import settingsImage from "../../../../public/images/pages/settings-hero.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";

import {
  loadMobileSettings,
  requestMobileAccountDeletion,
  setMobileAnalytics,
  type MobileSettingsSummary,
} from "./settings-client";

type SettingsScreenProps = {
  accessToken: string;
  initialSummary?: MobileSettingsSummary;
  user: User;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onSignOut: () => void;
};

function displayName(user: User) {
  const value = user.user_metadata.full_name ?? user.user_metadata.name ?? user.user_metadata.given_name;
  return typeof value === "string" && value.trim() ? value.trim() : user.email?.split("@")[0] ?? "DiaryDock member";
}

function bytes(value: number) {
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

async function openPublicPage(path: string) {
  await Browser.open({ url: `https://diarydock.com${path}` });
}

export function SettingsScreen(props: SettingsScreenProps) {
  const [summary, setSummary] = useState<MobileSettingsSummary | null>(props.initialSummary ?? null);
  const [loading, setLoading] = useState(!props.initialSummary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (props.initialSummary) return undefined;
    let active = true;
    void loadMobileSettings(props.accessToken)
      .then((value) => { if (active) setSummary(value); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Online settings are unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [props.accessToken, props.initialSummary]);

  async function toggleAnalytics() {
    if (!summary) return;
    setBusy(true);
    setError(null);
    try {
      const result = await setMobileAnalytics(props.accessToken, !summary.analytics.enabled);
      setSummary({ ...summary, analytics: { ...summary.analytics, enabled: result.enabled } });
      setMessage(result.enabled ? "Anonymous product usage is now enabled." : "Usage sharing is off and retained events were removed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your privacy setting could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    try {
      const result = await requestMobileAccountDeletion(props.accessToken, confirmation);
      setMessage(result.message);
      setDeleting(false);
      setConfirmation("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your deletion request could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  const name = summary?.profile.name || displayName(props.user);
  const email = summary?.profile.email || props.user.email || "";
  const usedPercent = summary?.storage
    ? Math.min(100, (summary.storage.usedBytes / Math.max(1, summary.storage.limitBytes)) * 100)
    : 0;

  return (
    <main className="settings-screen">
      <header className="settings-hero" style={{ backgroundImage: `url(${settingsImage})` }}>
        <div className="settings-shade" />
        <button type="button" className="settings-back" onClick={props.onBack} aria-label="Back to the estate map">‹</button>
        <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>
          {props.syncStatus.toLowerCase().replaceAll("_", " ")}
        </span>
        <div><p>Settings</p><h1>Your Front Gate</h1><strong>Account, privacy and device protection.</strong></div>
      </header>

      <section className="settings-profile">
        <span>{name.slice(0, 2).toUpperCase()}</span>
        <div><h2>{name}</h2><p>{email}</p><small>Member since {new Date(summary?.profile.memberSince ?? props.user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</small></div>
      </section>

      <section className="settings-card">
        <p className="eyebrow">This device</p><h2>Protected offline</h2>
        <div className="settings-row"><span>Encrypted local database</span><strong>On</strong></div>
        <div className="settings-row"><span>Device-protected key storage</span><strong>On</strong></div>
        <div className="settings-row"><span>Secure synchronisation</span><strong>{props.syncStatus.toLowerCase().replaceAll("_", " ")}</strong></div>
        <button type="button" className="settings-secondary" disabled={busy} onClick={() => void props.synchronize()}>Sync now</button>
      </section>

      <section className="settings-card">
        <p className="eyebrow">Smart labels</p><h2>Physical Links</h2>
        <p>Manage private QR codes and NFC tags for appliances, boilers and household equipment.</p>
        <button type="button" className="settings-link-row"
          onClick={() => props.onNavigate("PHYSICAL_LINKS")}>
          <span><strong>Open Physical Links</strong><small>Available as an encrypted offline copy</small></span><b>›</b>
        </button>
      </section>

      <section className="settings-card">
        <p className="eyebrow">Personal setup</p><h2>Life Check</h2>
        <p>Choose what applies to you and see a transparent organisation score.</p>
        <button type="button" className="settings-link-row"
          onClick={() => props.onNavigate("LIFE_CHECK")}>
          <span><strong>Open Life Check</strong><small>Available as an encrypted offline copy</small></span><b>›</b>
        </button>
      </section>

      <section className="settings-card">
        <p className="eyebrow">Your dashboard</p><h2>Personalise your areas</h2>
        <p>Choose which specialist spaces appear on your DiaryDock home.</p>
        <button type="button" className="settings-link-row"
          onClick={() => props.onNavigate("ONBOARDING")}>
          <span><strong>Review my setup</strong><small>Profile, household and dashboard choices</small></span><b>›</b>
        </button>
      </section>

      <section className="settings-card">
        <p className="eyebrow">Moving home</p><h2>Home Handover</h2>
        <p>Prepare a private preview of deliberately selected home information.</p>
        <button type="button" className="settings-link-row"
          onClick={() => props.onNavigate("HOME_HANDOVER")}>
          <span><strong>Open Home Handover</strong><small>Available as an encrypted offline copy</small></span><b>›</b>
        </button>
      </section>

      {summary?.storage ? (
        <section className="settings-card">
          <p className="eyebrow">Document storage</p><h2>{bytes(summary.storage.usedBytes)} of {bytes(summary.storage.limitBytes)}</h2>
          <div className="settings-storage"><span style={{ width: `${usedPercent}%` }} /></div>
          <small>{summary.storage.tier} plan · pending reservations are included before upload</small>
        </section>
      ) : null}

      <section className="settings-card">
        <p className="eyebrow">Privacy</p><h2>Your choices</h2>
        <label className="settings-switch">
          <span><strong>Share anonymous product usage</strong><small>No document names, contents, contacts or questions. Retained for {summary?.analytics.retentionDays ?? 90} days.</small></span>
          <input type="checkbox" disabled={busy || !summary} checked={summary?.analytics.enabled ?? false} onChange={() => void toggleAnalytics()} />
        </label>
        {summary?.forwarding.configured ? (
          <button type="button" className="settings-link-row" onClick={() => void navigator.clipboard.writeText(summary.forwarding.address ?? "")}>
            <span><strong>Email forwarding</strong><small>{summary.forwarding.address}</small></span><b>Copy</b>
          </button>
        ) : null}
        <button type="button" className="settings-link-row" onClick={() => void openPublicPage("/privacy")}><span><strong>Privacy policy</strong><small>How DiaryDock handles your information</small></span><b>›</b></button>
        <button type="button" className="settings-link-row" onClick={() => void openPublicPage("/terms")}><span><strong>Terms of use</strong><small>Your rights and responsibilities</small></span><b>›</b></button>
      </section>

      <section className="settings-card settings-account-actions">
        <p className="eyebrow">Account</p><h2>Account controls</h2>
        <button type="button" className="settings-secondary" onClick={props.onSignOut}>Sign out and remove offline data</button>
        {!deleting ? <button type="button" className="settings-danger-link" onClick={() => setDeleting(true)}>Request account deletion</button> : (
          <div className="settings-delete">
            <p>Type DELETE. A recent sign-in is required, and the request is verified before processing.</p>
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE" autoCapitalize="characters" />
            <div><button type="button" onClick={() => setDeleting(false)}>Cancel</button><button type="button" disabled={busy} onClick={() => void deleteAccount()}>Submit request</button></div>
          </div>
        )}
      </section>

      {loading ? <p className="form-message">Loading online account details…</p> : null}
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-message" role="status">{message}</p> : null}
      <MobileBottomNav active={null} onNavigate={props.onNavigate} />
    </main>
  );
}
