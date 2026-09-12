"use client";
import { useCallback, useEffect, useState } from "react";
import type { RecapPreferences, RecapResponse } from "../../lib/recaps/model";
import "./recaps.css";
type Props = {
  request: (method: "GET" | "POST", body?: RecapPreferences) => Promise<RecapResponse | { preferences: RecapPreferences }>;
  onOpen: (target: "reminders" | "appointments") => void;
  enablePush?: () => Promise<boolean>;
  initialKind?: "daily" | "weekly";
};
export function RecapsPanel({ request, onOpen, enablePush, initialKind = "daily" }: Props) {
  const [data, setData] = useState<RecapResponse | null>(null);
  const [draft, setDraft] = useState<RecapPreferences | null>(null);
  const [kind, setKind] = useState<"daily" | "weekly">(initialKind);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    setError("");
    try {
      const result = await request("GET") as RecapResponse;
      if (signal?.cancelled) return;
      result.preferences.dailyTime ??= "08:00"; result.preferences.weeklyTime ??= "20:00";
      setData(result); setDraft(result.preferences);
    } catch (reason) { if (!signal?.cancelled) setError(reason instanceof Error ? reason.message : "Recaps could not load."); }
  }, [request]);
  useEffect(() => { const signal = { cancelled: false }; void load(signal); return () => { signal.cancelled = true; }; }, [load]);
  async function save() {
    if (!draft) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await request("POST", draft);
      const fresh = await request("GET") as RecapResponse;
      setData(fresh); setDraft(fresh.preferences); setPage(0);
      setMessage("Recap settings saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Settings could not save."); }
    finally { setBusy(false); }
  }
  async function registerPush() {
    setBusy(true); setMessage(""); setError("");
    try {
      if (!await enablePush?.()) throw new Error("Phone alerts are not available yet. Check notification permission and try again.");
      setDraft((current) => current ? { ...current, push: true } : current);
      setMessage("Phone connected. Save your settings to enable recap alerts.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Phone alerts could not connect."); }
    finally { setBusy(false); }
  }
  const recap = data?.[kind];
  const visible = recap?.items.slice(page * 5, page * 5 + 5) ?? [];
  return <div className="recaps-panel" aria-busy={busy}>
    <header><h1>Your recaps</h1><p>Your day at a glance. Your week planned ahead.</p></header>
    {error && <div role="alert" className="recaps-error">{error} <button type="button" onClick={() => void load()}>Retry loading</button></div>}
    {message && <p role="status" className="recaps-success">{message}</p>}
    {!data && !error && <p role="status">Loading your recaps…</p>}
    {draft && data && <div className="recaps-grid">
      <section className="recaps-settings" aria-label="Recap settings">
        <h2>When to hear from us</h2>
        <div className="recaps-schedule"><label className="recaps-toggle"><span><strong>Morning recap</strong><small>Every day</small></span>
          <input type="checkbox" checked={draft.daily} disabled={busy} onChange={(e) => setDraft({ ...draft, daily: e.target.checked })} /></label>
          <input aria-label="Morning recap time" type="time" step="60" value={draft.dailyTime} disabled={busy}
            onChange={(e) => setDraft({ ...draft, dailyTime: e.target.value })} /></div>
        <div className="recaps-schedule"><label className="recaps-toggle"><span><strong>Sunday recap</strong><small>Every Sunday</small></span>
          <input type="checkbox" checked={draft.weekly} disabled={busy} onChange={(e) => setDraft({ ...draft, weekly: e.target.checked })} /></label>
          <input aria-label="Sunday recap time" type="time" step="60" value={draft.weeklyTime} disabled={busy}
            onChange={(e) => setDraft({ ...draft, weeklyTime: e.target.value })} /></div>
        <label className="recaps-zone">Time zone<input value={draft.timeZone} disabled={busy}
          onChange={(e) => setDraft({ ...draft, timeZone: e.target.value })} /></label>
        <small>Times follow this zone, including clock changes.</small>
        <button type="button" disabled={busy} className="recaps-text-button" onClick={() => setDraft({ ...draft,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}>Use this device’s time zone</button>
        <label className="recaps-toggle"><span><strong>Push notifications</strong><small>Private alerts on connected phones</small></span>
          <input type="checkbox" checked={draft.push} disabled={busy || (!data.pushAvailable && !draft.push)}
            onChange={(e) => setDraft({ ...draft, push: e.target.checked })} /></label>
        {!data.pushAvailable ? <p className="recaps-note">Phone push is awaiting service setup. Your recaps are available here.</p>
          : enablePush ? <button type="button" disabled={busy} onClick={() => void registerPush()}>Connect this phone</button>
          : <p className="recaps-note">Connect your phone from Recaps in the DiaryDock app to receive alerts.</p>}
        <button type="button" className="recaps-save" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save recap settings"}</button>
      </section>
      <section className="recaps-content" aria-label="Recap preview">
        <div className="recaps-tabs" aria-label="Choose recap">{(["daily", "weekly"] as const).map((tab) =>
          <button type="button" key={tab} aria-pressed={kind === tab} onClick={() => { setKind(tab); setPage(0); }}>
            {tab === "daily" ? "Today" : "Week ahead"}</button>)}</div>
        <h2>{kind === "daily" ? "Your morning recap" : "Your weekly recap"}</h2>
        <p className="recaps-date">{recap?.date}{kind === "weekly" ? ` to ${recap?.through}` : ""} · Updates as you organise</p>
        {!recap?.items.length ? <div className="recaps-empty"><strong>Nothing due {kind === "daily" ? "today" : "in the next seven days"}.</strong><p>No dated reminders or appointments need attention.</p></div>
          : <ul>{visible.map((item) => <li key={item.target + item.id}><button type="button" onClick={() => onOpen(item.target)}>
            <span><strong>{item.title}</strong><small>{new Intl.DateTimeFormat("en-GB", { timeZone: draft.timeZone === data.preferences.timeZone
              ? draft.timeZone : data.preferences.timeZone, dateStyle: "medium" }).format(new Date(item.dueAt))} · {item.target === "appointments" ? "Appointment" : "Reminder"}</small></span>
            <span className={item.overdue ? "recaps-overdue" : "recaps-due"}>{item.overdue ? "Overdue" : "Upcoming"} ›</span>
          </button></li>)}</ul>}
        {!!recap?.items.length && <div className="recaps-pagination"><button type="button" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button>
          <span>{page + 1} / {Math.ceil(recap.items.length / 5)}</span>
          <button type="button" disabled={(page + 1) * 5 >= recap.items.length} onClick={() => setPage(page + 1)}>Next</button></div>}
        {recap?.truncated && <p>Showing the earliest items. <button type="button" onClick={() => onOpen("reminders")}>Open all reminders</button></p>}
        <p className="recaps-note">Based on dated reminders and planned health appointments saved in DiaryDock.</p>
      </section>
    </div>}
  </div>;
}
