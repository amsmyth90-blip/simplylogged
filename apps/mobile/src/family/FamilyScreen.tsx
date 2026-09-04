import { useState } from "react";

import type { HouseholdDirectory, HouseholdSchedulesSnapshot } from "@diarydock/household";
import type { OfflineStore } from "@diarydock/offline-store";

import familyImage from "../../../../public/images/pages/family-room-hero.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { FamilyRecords } from "./FamilyRecords";
import { FamilyScheduleCard } from "./FamilyScheduleCard";
import { FamilySchedulesScreen } from "./FamilySchedulesScreen";
import { HouseholdInviteForm } from "./HouseholdInviteForm";
import { HouseholdInvites } from "./HouseholdInvites";
import { HouseholdMembers } from "./HouseholdMembers";
import { HouseholdOwnershipTransfer } from "./HouseholdOwnershipTransfer";
import type { HouseholdMutation } from "./household-client";
import { roleLabel } from "./family-utils";
import { useHousehold } from "./use-household";
import { useFamilySchedules } from "./use-family-schedules";
import "./family-schedules.css";

type Props = {
  accessToken: string;
  disableScheduleOnline?: boolean;
  initialHousehold?: HouseholdDirectory;
  initialScheduleSnapshot?: HouseholdSchedulesSnapshot;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onScan: (roomName: string) => void;
};

export function FamilyScreen(props: Props) {
  const model = useHousehold(props.accessToken, props.store, props.initialHousehold);
  const schedules = useFamilySchedules({
    accessToken: props.accessToken,
    disableOnline: props.disableScheduleOnline,
    initialSnapshot: props.initialScheduleSnapshot,
    store: props.store,
    syncStatus: props.syncStatus,
  });
  const [inviting, setInviting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [schedulesOpen, setSchedulesOpen] = useState(false);
  const household = model.household;

  if (schedulesOpen) return <FamilySchedulesScreen
    directoryPeople={household?.members.map((member) => member.name) ?? []}
    model={schedules}
    onBack={() => setSchedulesOpen(false)}
    onNavigate={props.onNavigate}
  />;

  async function change(mutation: HouseholdMutation, success: string) {
    try {
      const result = await model.mutate(mutation);
      setMessage(success);
      return result;
    } catch {
      return null;
    }
  }

  return (
    <main className="family-screen">
      <header className="family-hero" style={{ backgroundImage: `url(${familyImage})` }}>
        <div className="family-hero-shade" />
        <button type="button" className="family-back" onClick={props.onBack} aria-label="Back to the estate map">‹</button>
        <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>{props.syncStatus.toLowerCase().replaceAll("_", " ")}</span>
        <div><p>{household?.householdName ?? "Your household"}</p><h1>Family Room</h1><strong>Your household, together.</strong></div>
      </header>

      <section className="family-intro family-card">
        <div>
          <p className="eyebrow">Household access</p>
          <h2>{household?.householdName ?? "Opening your household…"}</h2>
          <span>
            {household
              ? `${roleLabel(household.role)} · ${household.members.length} active account${household.members.length === 1 ? "" : "s"}`
              : "Encrypted and private by default"}
          </span>
        </div>
        <span className={model.source === "CACHE" ? "is-cached" : "is-online"}>
          {model.source === "CACHE" ? "Offline copy" : "Up to date"}
        </span>
      </section>

      <FamilyScheduleCard loading={schedules.loading} message={schedules.message}
        snapshot={schedules.snapshot} onOpen={() => setSchedulesOpen(true)} />

      {household?.role === "owner" ? (
        <section className="family-card family-owner-actions">
          <button type="button" className="family-primary" onClick={() => setInviting(true)}>＋ Invite someone</button>
          {!renaming ? <button type="button" onClick={() => { setName(household.householdName); setRenaming(true); }}>Rename household</button> : (
            <form onSubmit={(event) => { event.preventDefault(); void change({ action: "rename", name }, "Household name updated.").then((result) => { if (result) setRenaming(false); }); }}>
              <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} aria-label="Household name" />
              <button type="submit" disabled={model.busy}>Save</button><button type="button" onClick={() => setRenaming(false)}>Cancel</button>
            </form>
          )}
        </section>
      ) : null}

      {inviting && household?.role === "owner" ? (
        <HouseholdInviteForm busy={model.busy} onCancel={() => setInviting(false)} onCreate={async (mutation) => {
          const result = await change(mutation, "Invitation created. Share the secure link from Pending invitations.");
          if (result) setInviting(false);
        }} />
      ) : null}

      {household ? <HouseholdMembers
        household={household}
        busy={model.busy}
        onRole={async (userId, role) => { await change({ action: "update-role", userId, role }, "Household access updated."); }}
        onRemove={async (userId) => { await change({ action: "remove-member", userId }, "Household member removed."); }}
      /> : null}
      {household ? <HouseholdOwnershipTransfer household={household} busy={model.busy} onChange={change} /> : null}
      {household?.role === "owner" ? <HouseholdInvites
        busy={model.busy}
        invites={household.invites}
        onRenew={async (token) => { await change({ action: "renew-invite", token }, "Invitation renewed."); }}
        onCancel={async (token) => { await change({ action: "cancel-invite", token }, "Invitation cancelled."); }}
      /> : null}

      <FamilyRecords
        accessToken={props.accessToken} store={props.store} syncStatus={props.syncStatus} synchronize={props.synchronize}
        onScan={() => props.onScan("Family Room")} onAllFiles={() => props.onNavigate("FILES")} onAllReminders={() => props.onNavigate("REMINDERS")}
      />

      {household && household.role !== "owner" ? <section className="family-card family-leave"><div><h2>Leave this household</h2><p>Shared access will be revoked. Your private records remain yours.</p></div><button type="button" disabled={model.busy} onClick={() => {
        if (window.confirm("Leave this household and revoke its shared access?")) void change({ action: "leave" }, "You have left the household.");
      }}>Leave household</button></section> : null}
      {model.loading ? <p className="form-message">Opening your household securely…</p> : null}
      {model.error ? <p className="form-message form-error" role="alert">{model.error} <button type="button" onClick={() => void model.refresh().catch(() => undefined)}>Try again</button></p> : null}
      {message ? <p className="form-message" role="status">{message}</p> : null}
      <MobileBottomNav active="FAMILY" onNavigate={props.onNavigate} />
    </main>
  );
}
