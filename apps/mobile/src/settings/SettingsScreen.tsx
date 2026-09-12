import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { Browser } from "@capacitor/browser";

import settingsImage from "../../../../public/images/pages/settings-hero.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { SubscriptionScreen } from "@mobile/subscriptions/SubscriptionScreen";

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
  const [showSubscriptions, setShowSubscriptions] = useState(false);

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

  if (showSubscriptions) return <SubscriptionScreen storage={summary?.storage}
    onBack={() => setShowSubscriptions(false)} />;

  return (
    <main className="settings-screen">
      <header className="settings-hero" style={{ backgroundImage: `url(${settingsImage})` }}>
        <div className="settings-shade" />
        <button type="button" className="settings-back" onClick={props.onBack} aria-label="Back to the estate map">‹</button>
        <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>
          {props.syncStatus.toLowerCase().replaceAll("_", " ")}
        </span>
        <div><h1>Settings</h1></div>
      </header>

      <section className="settings-profile">
        <span>{name.slice(0, 2).toUpperCase()}</span>
        <div><h2>{name}</h2><p>{email}</p></div>
      </section>

      <section className="settings-card settings-menu">
        <button type="button" className="settings-link-row" onClick={() => props.onNavigate("RECAPS")}><span><strong>Daily &amp; Sunday recaps</strong><small>Choose your recap times</small></span><b>›</b></button>
        <h2>App</h2>
        <button type="button" className="settings-link-row" onClick={() => setShowSubscriptions(true)}>
          <span><strong>Plans &amp; storage</strong><small>Explore Starter, Plus and Family</small></span><b>›</b>
        </button>
        <div className="settings-row"
          aria-label="Encrypted local database and device-protected key storage on">
          <span>Device security</span><strong>On</strong>
        </div>
        <button type="button" className="settings-link-row" disabled={busy}
          onClick={() => void props.synchronize()}>
          <span><strong>Sync now</strong></span><b>›</b>
        </button>
        <button type="button" className="settings-link-row"
          onClick={() => props.onNavigate("PHYSICAL_LINKS")}>
          <span><strong>Physical Links</strong></span><b>›</b>
        </button>
        <button type="button" className="settings-link-row"
          onClick={() => props.onNavigate("PASSWORDS")}>
          <span><strong>Password Vault</strong><small>End-to-end encrypted logins</small></span><b>›</b>
        </button>
        <button type="button" className="settings-link-row"
          onClick={() => props.onNavigate("LIFE_CHECK")}>
          <span><strong>Life Check</strong></span><b>›</b>
        </button>
        <button type="button" className="settings-link-row"
          onClick={() => props.onNavigate("ONBOARDING")}>
          <span><strong>Home areas</strong></span><b>›</b>
        </button>
        <button type="button" className="settings-link-row"
          onClick={() => props.onNavigate("HOME_HANDOVER")}>
          <span><strong>Home Handover</strong></span><b>›</b>
        </button>
        {summary?.storage ? <div className="settings-storage-row">
          <span><strong>Storage</strong><small>{bytes(summary.storage.usedBytes)} of {bytes(summary.storage.limitBytes)}</small></span>
          <b>{summary.storage.tier}</b>
          <div className="settings-storage"><span style={{ width: `${usedPercent}%` }} /></div>
        </div> : null}
      </section>

      <section className="settings-card">
        <h2>Privacy</h2>
        <label className="settings-switch">
          <span><strong>Share anonymous usage</strong></span>
          <input type="checkbox" disabled={busy || !summary} checked={summary?.analytics.enabled ?? false} onChange={() => void toggleAnalytics()} />
        </label>
        {summary?.forwarding.configured ? (
          <button type="button" className="settings-link-row" onClick={() => void navigator.clipboard.writeText(summary.forwarding.address ?? "")}>
            <span><strong>Email forwarding</strong><small>{summary.forwarding.address}</small></span><b>Copy</b>
          </button>
        ) : null}
        <button type="button" className="settings-link-row" onClick={() => void openPublicPage("/privacy")}><span><strong>Privacy policy</strong></span><b>›</b></button>
        <button type="button" className="settings-link-row" onClick={() => void openPublicPage("/terms")}><span><strong>Terms</strong></span><b>›</b></button>
      </section>

      <section className="settings-card settings-account-actions">
        <h2>Account</h2>
        <button type="button" className="settings-secondary" onClick={props.onSignOut}>Sign out</button>
        {!deleting ? <button type="button" className="settings-danger-link" onClick={() => setDeleting(true)}>Delete account</button> : (
          <div className="settings-delete">
            <p>Type DELETE. A recent sign-in is required, and the request is verified before processing.</p>
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE" autoCapitalize="characters" />
            <div><button type="button" onClick={() => setDeleting(false)}>Cancel</button><button type="button" disabled={busy} onClick={() => void deleteAccount()}>Submit request</button></div>
          </div>
        )}
      </section>

      {loading ? <p className="form-message">Loading…</p> : null}
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-message" role="status">{message}</p> : null}
      <MobileBottomNav active={null} onNavigate={props.onNavigate} />
    </main>
  );
}
