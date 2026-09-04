"use client";

import { useState } from "react";

import type { HouseholdDirectory } from "@diarydock/household";

import {
  initiateHouseholdOwnershipTransfer,
  resolveHouseholdOwnershipTransfer,
} from "@/lib/household-sharing";

type Props = {
  household: HouseholdDirectory;
  onRefresh: () => Promise<unknown>;
};

function expiryLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function HouseholdOwnershipTransfer({ household, onRefresh }: Props) {
  const eligible = household.members.filter((member) => member.role === "member");
  const transfer = household.ownershipTransfer;
  const [selectedId, setSelectedId] = useState(eligible[0]?.userId ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const effectiveSelectedId = eligible.some((member) => member.userId === selectedId)
    ? selectedId : eligible[0]?.userId ?? "";
  const proposed = transfer
    ? household.members.find((member) => member.userId === transfer.proposedOwnerId)
    : null;
  const isOwner = household.currentUserId === transfer?.currentOwnerId;
  const isProposed = household.currentUserId === transfer?.proposedOwnerId;

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await onRefresh();
      setConfirmed(false);
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Household ownership could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  if (!transfer && household.role !== "owner") return null;

  return (
    <section className="estate-sheet p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-moss/70">Household administration</p>
      <h2 className="mt-1 text-base font-semibold text-ink">Transfer ownership</h2>
      <p className="mt-2 text-sm leading-6 text-ink/55">
        Ownership controls household members and settings. Private records remain with their account owner.
      </p>

      {!transfer ? (
        eligible.length ? <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-xs font-semibold text-ink/60">New household owner
            <select value={effectiveSelectedId} onChange={(event) => { setSelectedId(event.target.value); setConfirmed(false); }}
              className="min-h-11 rounded-xl border border-ink/10 bg-white px-3 text-sm text-ink">
              {eligible.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
            </select>
          </label>
          <label className="flex items-start gap-3 text-xs leading-5 text-ink/60">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 size-4 accent-moss" />
            I understand they must accept within 24 hours before ownership changes.
          </label>
          <button type="button" disabled={busy || !confirmed || !effectiveSelectedId}
            onClick={() => void run(() => initiateHouseholdOwnershipTransfer(effectiveSelectedId),
              "Ownership request sent for approval.")}
            className="min-h-11 rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-45">
            Request ownership transfer
          </button>
        </div> : <p className="mt-4 rounded-xl bg-sand/55 p-3 text-xs leading-5 text-ink/55">
          Add an Adult member, or change an existing member to Adult, before transferring ownership.
        </p>
      ) : (
        <div className="mt-4 rounded-2xl border border-gold/25 bg-sand/45 p-4">
          <p className="text-sm font-semibold text-ink">Waiting for {proposed?.name ?? "the nominated member"}</p>
          <p className="mt-1 text-xs leading-5 text-ink/55">This request expires {expiryLabel(transfer.expiresAt)}.</p>
          {isProposed ? <div className="mt-3 grid gap-3">
            <label className="flex items-start gap-3 text-xs leading-5 text-ink/60">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-1 size-4 accent-moss" />
              I accept responsibility for managing this household and its members.
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy || !confirmed}
                onClick={() => void run(() => resolveHouseholdOwnershipTransfer(transfer.id, "accept"),
                  "You are now the household owner.")}
                className="min-h-11 rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-45">Accept ownership</button>
              <button type="button" disabled={busy}
                onClick={() => void run(() => resolveHouseholdOwnershipTransfer(transfer.id, "decline"),
                  "Ownership request declined.")}
                className="min-h-11 rounded-xl border border-ink/10 bg-white px-4 text-sm font-semibold text-ink">Decline</button>
            </div>
          </div> : null}
          {isOwner ? <button type="button" disabled={busy}
            onClick={() => void run(() => resolveHouseholdOwnershipTransfer(transfer.id, "cancel"),
              "Ownership request cancelled.")}
            className="mt-3 min-h-11 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700">Cancel request</button> : null}
        </div>
      )}
      {message ? <p role="status" className="mt-3 text-xs font-semibold text-moss">{message}</p> : null}
    </section>
  );
}
