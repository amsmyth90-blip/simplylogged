import { useState } from "react";

import type { HomeHandoverDetail, HomeHandoverDetailRequest,
  HomeHandoverSnapshot } from "@diarydock/home-handover";

import { HomeHandoverDetailText } from "./HomeHandoverDetail";

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(value));
}

export function HomeHandoverSharing(props: { busy: boolean; online: boolean;
  snapshot: HomeHandoverSnapshot; onPublish: (email: string) => Promise<void>;
  onRevoke: () => Promise<void>;
  detailFor: (request: HomeHandoverDetailRequest) => HomeHandoverDetail | null;
  detailLoading: (request: HomeHandoverDetailRequest) => boolean;
  onLoadDetail: (request: HomeHandoverDetailRequest) => Promise<unknown> }) {
  const [email, setEmail] = useState(""); const [confirmed, setConfirmed] = useState(false);
  const publication = props.snapshot.publication;
  return <>
    {props.snapshot.draft ? <section className="handover-card handover-share"><small>Recipient access</small>
      <h2>Share a read-only copy</h2><p>Only this minimal preview is copied. The recipient must sign in
        with the exact verified email. Future access expires after 30 days and can be revoked.</p>
      {publication ? <div className="handover-publication"><strong>{publication.recipientEmail}</strong>
        <span>{publication.itemCount} read-only {publication.itemCount === 1 ? "item" : "items"}</span>
        <span>Expires {date(publication.expiresAt)}</span><button type="button"
          disabled={!props.online || props.busy} onClick={() => void props.onRevoke()}>Revoke access</button></div>
        : <div className="handover-share-form"><label>Recipient email<input type="email"
          autoComplete="email" maxLength={254} value={email}
          onChange={(event) => setEmail(event.target.value)} placeholder="newowner@example.com" /></label>
          <label className="handover-confirm"><input type="checkbox" checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)} /><span>I have reviewed the selected
              items and want this person to receive read-only access.</span></label>
          <button type="button" disabled={!props.online || props.busy || !confirmed || !email.trim()
            || !props.snapshot.items.length} onClick={() => void props.onPublish(email)
              .then(() => { setEmail(""); setConfirmed(false); })}>Share for 30 days</button>
          {!props.snapshot.items.length ? <span>Select at least one item first.</span> : null}</div>}
    </section> : null}
    {props.online && props.snapshot.received.length ? <section className="handover-card handover-received"><small>Shared with me</small>
      <h2>Received home handovers</h2>{props.snapshot.received.map((handover) =>
        <article key={handover.id}><strong>{handover.name}</strong><span>Read-only · expires {date(handover.expiresAt)}</span>
          <div>{handover.items.map((item) => { const request = { scope: "RECEIVED" as const,
            publicationId: handover.id, itemId: item.id }; return <p key={item.id}><b>{item.label}</b>
            <HomeHandoverDetailText summary={item.detail} request={request}
              detail={props.detailFor(request)} loading={props.detailLoading(request)}
              onLoad={props.onLoadDetail} /></p>; })}</div></article>)}</section> : null}
  </>;
}
