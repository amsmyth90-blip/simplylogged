import { useMemo, useState } from "react";

import type { MailboxAction, MailboxSnapshot } from "@diarydock/mailbox";
import type { OfflineStore } from "@diarydock/offline-store";

import mailboxImage from "../../../../public/images/pages/mailbox-hero.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { DocumentViewer } from "@mobile/files/DocumentViewer";
import { useDocuments } from "@mobile/files/use-documents";
import { MailboxItemCard } from "./MailboxItemCard";
import { useMailbox } from "./use-mailbox";

type Props = { accessToken: string; disableOnline?: boolean; initialSnapshot?: MailboxSnapshot;
  initialFilter?: "new" | "all";
  store: OfflineStore; syncStatus: string; synchronize: () => Promise<unknown>;
  onBack: () => void; onNavigate: (destination: MobileDestination) => void;
  onScan: (roomName: string) => void };

export function MailboxScreen(props: Props) {
  const mailbox = useMailbox(props);
  const files = useDocuments(props.store, props.syncStatus, props.synchronize);
  const [filter, setFilter] = useState<"new" | "all">(props.initialFilter ?? "new");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const items = useMemo(() => mailbox.snapshot?.items.filter((item) =>
    filter === "all" || item.routeStatus === "new") ?? [], [filter, mailbox.snapshot]);
  const counts = useMemo(() => ({ total: mailbox.snapshot?.items.length ?? 0,
    fresh: mailbox.snapshot?.items.filter((item) => item.routeStatus === "new").length ?? 0,
    filed: mailbox.snapshot?.items.filter((item) => item.routeStatus === "vault"
      || item.routeStatus === "room").length ?? 0,
    reminders: mailbox.snapshot?.items.filter((item) => item.routeStatus === "reminder").length ?? 0,
  }), [mailbox.snapshot]);
  const viewing = files.documents.find((item) => item.id === viewingId) ?? null;
  function open(documentId: string | null) {
    if (!documentId) return;
    if (files.documents.some((item) => item.id === documentId)) setViewingId(documentId);
    else props.onNavigate("FILES");
  }
  function route(item: typeof items[number], action: MailboxAction) {
    void mailbox.route(item, action);
  }
  return <main className="mailbox-screen">
    <header className="mailbox-hero" style={{ backgroundImage: `url(${mailboxImage})` }}>
      <div /><button type="button" onClick={props.onBack} aria-label="Back to the estate map">‹</button>
      <span>{mailbox.online ? "Ready" : "Offline copy"}</span><article><p>Mailbox</p>
        <h1>Intake Queue</h1><strong>A calm place to review and file incoming items.</strong></article>
    </header>
    <section className="mailbox-sheet">
      <div className="mailbox-totals"><span><b>{counts.total}</b>Incoming</span>
        <span><b>{counts.fresh}</b>Needs filing</span><span><b>{counts.filed}</b>Filed</span>
        <span><b>{counts.reminders}</b>Follow-ups</span></div>
      {mailbox.message ? <p className="mailbox-message" role="status">{mailbox.message}</p> : null}
      <div className="mailbox-toolbar"><div><p>To be filed</p><h2>Incoming items</h2></div>
        <div>{(["new", "all"] as const).map((value) => <button type="button" key={value}
          className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{
            value === "new" ? "Needs filing" : "All"}</button>)}</div></div>
      {mailbox.loading && !mailbox.snapshot ? <p className="mailbox-empty">Opening Mailbox securely…</p>
        : items.length ? <div className="mailbox-list">{items.map((item) => <MailboxItemCard
          busy={mailbox.busy} item={item} key={item.id} online={mailbox.online}
          onOpen={() => open(item.documentId)} onRoute={(action) => route(item, action)} />)}</div>
        : <p className="mailbox-empty">Nothing is waiting to be filed.</p>}
      <button className="mailbox-scan" type="button" onClick={() => props.onScan("Mailbox")}>
        ＋ Scan an incoming document</button>
    </section>
    {viewing ? <DocumentViewer accessToken={props.accessToken} document={viewing}
      store={props.store} onClose={() => setViewingId(null)} /> : null}
    <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
  </main>;
}
