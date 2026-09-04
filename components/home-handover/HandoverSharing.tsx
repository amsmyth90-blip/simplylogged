"use client";

import { useState } from "react";

import type { HandoverPublication, ReceivedHandover } from "@diarydock/home-handover";

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(value));
}

export function HandoverSharing(props: {
  busyKey: string;
  draftExists: boolean;
  itemCount: number;
  publication: HandoverPublication | null;
  received: ReceivedHandover[];
  recipientEmail: string;
  onRecipientEmailChange: (value: string) => void;
  onPublish: () => Promise<void>;
  onRevoke: () => Promise<void>;
}) {
  const [confirmed, setConfirmed] = useState(false);
  return <>
    {props.draftExists ? <section className="estate-sheet p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#789078]">
        Recipient access
      </p>
      <h2 className="mt-1 font-serif text-xl">Share a time-limited read-only copy</h2>
      <p className="mt-1 text-sm leading-6 text-[#667068]">
        Only the minimal preview shown above is copied. The recipient must sign in with the exact
        verified email address. Future access expires after 30 days and can be revoked immediately.
      </p>
      {props.publication ? <div className="mt-4 rounded-[20px] bg-[#e8efe5] p-4">
        <p className="text-sm font-semibold text-[#315443]">Shared with {props.publication.recipientEmail}</p>
        <p className="mt-1 text-xs text-[#667068]">
          {props.publication.itemCount} read-only {props.publication.itemCount === 1 ? "item" : "items"}
          {" · "}expires {date(props.publication.expiresAt)}
        </p>
        <button type="button" disabled={Boolean(props.busyKey)} onClick={() => void props.onRevoke()}
          className="mt-3 min-h-11 rounded-[14px] bg-white px-4 text-sm font-semibold text-red-600 disabled:opacity-45">
          Revoke access
        </button>
      </div> : <div className="mt-4 space-y-3">
        <label className="block text-xs font-semibold text-[#667068]">
          Recipient email
          <input type="email" autoComplete="email" maxLength={254} value={props.recipientEmail}
            onChange={(event) => props.onRecipientEmailChange(event.target.value)}
            className="form-control mt-1" placeholder="newowner@example.com" />
        </label>
        <label className="flex items-start gap-3 rounded-2xl bg-white/70 p-3 text-xs leading-5 text-[#667068]">
          <input type="checkbox" checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
          <span>I have reviewed the selected items and want this person to receive read-only access.</span>
        </label>
        <button type="button"
          disabled={Boolean(props.busyKey) || !confirmed || !props.recipientEmail.trim()
            || props.itemCount < 1}
          onClick={() => void props.onPublish().then(() => setConfirmed(false))}
          className="min-h-12 w-full rounded-[15px] bg-[#315443] px-5 text-sm font-semibold text-white disabled:opacity-45">
          Share for 30 days
        </button>
        {!props.itemCount ? <p className="text-xs text-[#8a5b4c]">Select at least one item first.</p> : null}
      </div>}
    </section> : null}

    {props.received.length ? <section className="estate-sheet p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#789078]">Shared with me</p>
      <h2 className="mt-1 font-serif text-xl">Received home handovers</h2>
      <div className="mt-4 space-y-3">{props.received.map((handover) =>
        <article key={handover.id} className="rounded-[20px] border border-[#315443]/10 bg-white/75 p-4">
          <h3 className="font-semibold">{handover.name}</h3>
          <p className="mt-1 text-xs text-[#667068]">Read-only · expires {date(handover.expiresAt)}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{handover.items.map((item) =>
            <div key={item.id} className="rounded-2xl bg-[#f2f4ee] p-3">
              <p className="text-xs font-semibold">{item.label}</p>
              {item.detail ? <p className="mt-1 text-xs leading-5 text-[#667068]">{item.detail}</p> : null}
            </div>)}</div>
        </article>)}</div>
    </section> : null}
  </>;
}
