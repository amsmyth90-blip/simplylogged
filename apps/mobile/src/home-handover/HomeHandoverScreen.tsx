import { useState } from "react";

import type { HomeHandoverSnapshot } from "@diarydock/home-handover";
import type { OfflineStore } from "@diarydock/offline-store";

import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";

import { HomeHandoverDetailText } from "./HomeHandoverDetail";
import { HomeHandoverSharing } from "./HomeHandoverSharing";
import { useHomeHandover } from "./use-home-handover";

export function HomeHandoverScreen(props: { accessToken: string; disableOnline?: boolean;
  initialSnapshot?: HomeHandoverSnapshot; store: OfflineStore; syncStatus: string;
  onBack: () => void; onNavigate: (destination: MobileDestination) => void }) {
  const handover = useHomeHandover(props); const [name, setName] = useState("My home handover");
  const snapshot = handover.snapshot; const draft = snapshot?.draft;
  return <main className="handover-screen"><header className="handover-header">
    <button type="button" onClick={props.onBack} aria-label="Back to the Front Gate">‹</button>
    <div><small>Private preparation</small><h1>Home Handover</h1>
      <p>Select useful home details without exposing personal records.</p></div>
    <span className={handover.online ? "is-live" : "is-cached"}>
      {handover.online ? "Live" : "Offline copy"}</span></header>
    {handover.message ? <p className="handover-message" role="status">{handover.message}</p> : null}
    {handover.loading && !snapshot ? <p className="handover-message">Opening your private draft…</p> : null}
    <section className="handover-safety"><span>⌂</span><div><small>Private by design</small>
      <h2>Deliberate and revocable</h2><p>Nothing is shared automatically. You select every item and one verified recipient.</p></div></section>
    {snapshot && !draft ? <section className="handover-card"><small>Start safely</small>
      <h2>Create a private draft</h2><label>Draft name<input maxLength={120} value={name}
        onChange={(event) => setName(event.target.value)} /></label><button type="button"
        disabled={!handover.online || Boolean(handover.busyKey) || !name.trim()}
        onClick={() => void handover.createDraft(name)}>Create private draft</button></section> : null}
    {draft && snapshot ? <><section className="handover-heading"><small>Draft</small>
      <h2>{draft.name}</h2><p>Eligible property documents appear only when linked to an eligible home item.</p></section>
      <section className="handover-candidates">{snapshot.candidates.length
        ? snapshot.candidates.map((item) => { const key = `${item.resourceType}:${item.resourceId}`;
          const request = { scope: "OWNER" as const, resourceType: item.resourceType,
            resourceId: item.resourceId };
          return <article key={key}><span>{item.resourceType === "DOCUMENT" ? "▱" : "⚙"}</span>
            <div><strong>{item.label}</strong><HomeHandoverDetailText summary={item.detail}
              request={request} detail={handover.detailFor(request)}
              loading={handover.detailLoading(request)} onLoad={handover.loadDetail} /></div>
            <button type="button" className={item.selected ? "is-remove" : ""}
              disabled={!handover.online || Boolean(handover.busyKey)}
              onClick={() => void handover.toggleItem(item)}>{item.selected ? "Remove" : "Add"}</button></article>; })
        : <p>No eligible appliances, boilers or equipment are available yet. Add them under Physical Links first.</p>}
      </section><section className="handover-card"><div className="handover-preview-title"><div>
        <small>Private preview</small><h2>{snapshot.items.length} selected {snapshot.items.length === 1 ? "item" : "items"}</h2>
      </div><b>Not shared</b></div>{snapshot.items.length ? <div className="handover-items">
        {snapshot.items.map((item) => { const request = { scope: "OWNER" as const,
          resourceType: item.resourceType, resourceId: item.resourceId }; return <article key={item.id}>
          <small>{item.resourceType === "ASSET" ? "Home item" : "Property document"}</small>
          <strong>{item.label}</strong><HomeHandoverDetailText summary={item.detail}
            request={request} detail={handover.detailFor(request)}
            loading={handover.detailLoading(request)} onLoad={handover.loadDetail} /></article>; })}</div>
        : <p className="handover-empty">Nothing selected. Your draft remains empty and private.</p>}</section></> : null}
    {snapshot ? <HomeHandoverSharing snapshot={snapshot} online={handover.online}
      busy={Boolean(handover.busyKey)} detailFor={handover.detailFor}
      detailLoading={handover.detailLoading} onLoadDetail={handover.loadDetail}
      onPublish={handover.publish} onRevoke={handover.revoke} /> : null}
    {snapshot ? <section className="handover-card handover-exclusions"><small>Always excluded</small>
      <h2>Sensitive information stays out</h2><p>These rules are enforced by the data model.</p><div>
        {snapshot.exclusions.map((item) => <span key={item}>✓ {item}</span>)}</div></section> : null}
    <MobileBottomNav active={null} onNavigate={props.onNavigate} /></main>;
}
