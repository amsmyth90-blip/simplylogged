import { useState } from "react";

import type { HouseholdDirectory, HouseholdSchedulesSnapshot } from "@diarydock/household";
import type { OfflineStore } from "@diarydock/offline-store";

import familyImage from "../../../../public/images/pages/family-room-hero.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { FamilyInboxScreen } from "./FamilyInboxScreen";
import { FamilySchedulesScreen } from "./FamilySchedulesScreen";
import { HouseholdInviteForm } from "./HouseholdInviteForm";
import { HouseholdInvites } from "./HouseholdInvites";
import { HouseholdMembers } from "./HouseholdMembers";
import { HouseholdOwnershipTransfer } from "./HouseholdOwnershipTransfer";
import { HouseholdPeople } from "./HouseholdPeople";
import type { HouseholdMutation } from "./household-client";
import { useFamilySchedules } from "./use-family-schedules";
import { useHousehold } from "./use-household";
import "./family-schedules.css";

type Props = {
  accessToken: string;
  disableScheduleOnline?: boolean;
  initialHousehold?: HouseholdDirectory;
  initialScheduleSnapshot?: HouseholdSchedulesSnapshot;
  initialView?: "household" | "people" | "inbox" | "schedules";
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
  const [managing, setManaging] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const household = model.household;

  if (props.initialView === "schedules") {
    return <FamilySchedulesScreen
      directoryPeople={household?.members.map((member) => member.name) ?? []}
      model={schedules}
      onBack={props.onBack}
      onNavigate={props.onNavigate}
    />;
  }
  if (props.initialView === "inbox") {
    return <FamilyInboxScreen
      accessToken={props.accessToken}
      store={props.store}
      syncStatus={props.syncStatus}
      synchronize={props.synchronize}
      onBack={props.onBack}
      onNavigate={props.onNavigate}
      onScan={() => props.onScan("Family Room")}
    />;
  }

  async function change(mutation: HouseholdMutation, success: string) {
    try {
      const result = await model.mutate(mutation);
      setMessage(success);
      return result;
    } catch {
      return null;
    }
  }

  return <main className="family-screen family-detail-screen">
    <header className="family-page-header" style={{ backgroundImage: `url(${familyImage})` }}>
      <div className="family-hero-shade" />
      <button type="button" className="family-back"
        onClick={managing ? () => setManaging(false) : props.onBack}
        aria-label={managing ? "Back to People" : "Back to Family Room"}>‹</button>
      <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>
        {props.syncStatus.toLowerCase().replaceAll("_", " ")}
      </span>
      <div><h1>{managing ? "Manage" : "People"}</h1></div>
    </header>

    <section className="family-intro family-card">
      <h2>{household?.householdName ?? "Opening…"}</h2>
      {household && !managing
        ? <button type="button" onClick={() => setManaging(true)}>Manage</button>
        : null}
    </section>

    {!managing && household ? <>
      <HouseholdPeople accessToken={props.accessToken} canManage={household.role === "owner"} />
      <HouseholdMembers household={household} busy={model.busy}
        onRole={async (userId, role) => {
          await change({ action: "update-role", userId, role }, "Access updated.");
        }}
        onRemove={async (userId) => {
          await change({ action: "remove-member", userId }, "Person removed.");
        }} />
      {household.role === "owner" ? <section className="family-card family-single-action">
        <button type="button" className="family-primary"
          onClick={() => setInviting(true)}>Invite to app</button>
      </section> : null}
      {inviting && household.role === "owner" ? <HouseholdInviteForm
        busy={model.busy}
        onCancel={() => setInviting(false)}
        onCreate={async (mutation) => {
          const result = await change(mutation, "Invitation created.");
          if (result) setInviting(false);
        }} /> : null}
    </> : null}

    {managing && household ? <>
      {household.role === "owner" ? <section className="family-card family-owner-actions">
        {!renaming ? <button type="button" onClick={() => {
          setName(household.householdName);
          setRenaming(true);
        }}>Rename household</button> : <form onSubmit={(event) => {
          event.preventDefault();
          void change({ action: "rename", name }, "Household renamed.")
            .then((result) => { if (result) setRenaming(false); });
        }}>
          <input required maxLength={80} value={name}
            onChange={(event) => setName(event.target.value)} aria-label="Household name" />
          <button type="submit" disabled={model.busy}>Save</button>
          <button type="button" onClick={() => setRenaming(false)}>Cancel</button>
        </form>}
      </section> : null}
      {household.role === "owner" ? <HouseholdInvites
        busy={model.busy}
        invites={household.invites}
        onRenew={async (token) => {
          await change({ action: "renew-invite", token }, "Invitation renewed.");
        }}
        onCancel={async (token) => {
          await change({ action: "cancel-invite", token }, "Invitation cancelled.");
        }} /> : null}
      <HouseholdOwnershipTransfer household={household} busy={model.busy} onChange={change} />
      {household.role !== "owner" ? <section className="family-card family-leave">
        <h2>Leave household</h2>
        <button type="button" disabled={model.busy} onClick={() => {
          if (window.confirm("Leave this household and revoke its shared access?")) {
            void change({ action: "leave" }, "You have left the household.");
          }
        }}>Leave</button>
      </section> : null}
    </> : null}

    {model.loading ? <p className="form-message">Opening…</p> : null}
    {model.error ? <p className="form-message form-error" role="alert">{model.error} <button
      type="button" onClick={() => void model.refresh().catch(() => undefined)}>Try again</button></p> : null}
    {message ? <p className="form-message" role="status">{message}</p> : null}
    <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
  </main>;
}
