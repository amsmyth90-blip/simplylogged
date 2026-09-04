import { useState } from "react";

import type { HouseholdDirectory } from "@diarydock/household";

import type { HouseholdMutation } from "./household-client";

type Props = {
  household: HouseholdDirectory;
  busy: boolean;
  onChange: (mutation: HouseholdMutation, success: string) => Promise<unknown>;
};

function expiryLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function HouseholdOwnershipTransfer({ household, busy, onChange }: Props) {
  const eligible = household.members.filter((member) => member.role === "member");
  const transfer = household.ownershipTransfer;
  const [selectedId, setSelectedId] = useState(eligible[0]?.userId ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const effectiveSelectedId = eligible.some((member) => member.userId === selectedId)
    ? selectedId : eligible[0]?.userId ?? "";
  const proposed = transfer
    ? household.members.find((member) => member.userId === transfer.proposedOwnerId)
    : null;
  const isOwner = household.currentUserId === transfer?.currentOwnerId;
  const isProposed = household.currentUserId === transfer?.proposedOwnerId;

  if (!transfer && household.role !== "owner") return null;

  async function change(mutation: HouseholdMutation, success: string) {
    const result = await onChange(mutation, success);
    if (result) setConfirmed(false);
  }

  return <section className="family-card family-transfer">
    <div className="family-section-title"><div><p>Household administration</p><h2>Transfer ownership</h2></div></div>
    <p>Ownership controls household members and settings. Private records remain with their account owner.</p>
    {!transfer ? eligible.length ? <div className="family-transfer-form">
      <label>New household owner
        <select value={effectiveSelectedId}
          onChange={(event) => { setSelectedId(event.target.value); setConfirmed(false); }}>
          {eligible.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
        </select>
      </label>
      <label className="family-transfer-check"><input type="checkbox" checked={confirmed}
        onChange={(event) => setConfirmed(event.target.checked)} />
        <span>I understand they must accept within 24 hours before ownership changes.</span>
      </label>
      <button type="button" className="family-primary" disabled={busy || !confirmed || !effectiveSelectedId}
        onClick={() => void change({ action: "initiate-ownership-transfer", userId: effectiveSelectedId },
          "Ownership request sent for approval.")}>Request ownership transfer</button>
    </div> : <p className="family-transfer-note">Add an Adult member, or change an existing member to Adult, before transferring ownership.</p>
      : <div className="family-transfer-pending">
        <strong>Waiting for {proposed?.name ?? "the nominated member"}</strong>
        <small>This request expires {expiryLabel(transfer.expiresAt)}.</small>
        {isProposed ? <>
          <label className="family-transfer-check"><input type="checkbox" checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I accept responsibility for managing this household and its members.</span>
          </label>
          <div className="family-transfer-buttons">
            <button type="button" className="family-primary" disabled={busy || !confirmed}
              onClick={() => void change({ action: "resolve-ownership-transfer", transferId: transfer.id,
                decision: "accept" }, "You are now the household owner.")}>Accept ownership</button>
            <button type="button" disabled={busy}
              onClick={() => void change({ action: "resolve-ownership-transfer", transferId: transfer.id,
                decision: "decline" }, "Ownership request declined.")}>Decline</button>
          </div>
        </> : null}
        {isOwner ? <button type="button" className="family-transfer-cancel" disabled={busy}
          onClick={() => void change({ action: "resolve-ownership-transfer", transferId: transfer.id,
            decision: "cancel" }, "Ownership request cancelled.")}>Cancel request</button> : null}
      </div>}
  </section>;
}
