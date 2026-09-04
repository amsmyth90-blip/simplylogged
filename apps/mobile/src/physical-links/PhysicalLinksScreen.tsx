import { useState } from "react";

import type {
  NewPhysicalLink,
  PhysicalAsset,
  PhysicalAssetDraft,
  PhysicalLink,
  PhysicalLinkAction,
  PhysicalLinksSnapshot,
} from "@diarydock/physical-links";
import type { OfflineStore } from "@diarydock/offline-store";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { PhysicalAssetEditor } from "./PhysicalAssetEditor";
import { PhysicalAssetList } from "./PhysicalAssetList";
import { PhysicalLinkOutput } from "./PhysicalLinkOutput";
import { PhysicalTagList } from "./PhysicalTagList";
import { usePhysicalLinks } from "./use-physical-links";

export function PhysicalLinksScreen(props: { accessToken: string; disableOnline?: boolean;
  initialSnapshot?: PhysicalLinksSnapshot; store: OfflineStore; syncStatus: string;
  onBack: () => void; onNavigate: (destination: MobileDestination) => void }) {
  const physical = usePhysicalLinks(props);
  const [editing, setEditing] = useState(false);
  const [newLink, setNewLink] = useState<NewPhysicalLink | null>(null);

  async function saveAsset(asset: PhysicalAssetDraft) {
    const result = await physical.mutate({ operation: "CREATE_ASSET", asset });
    if (result) setEditing(false);
  }

  async function makeTag(asset: PhysicalAsset) {
    const result = await physical.mutate({ operation: "CREATE_LINK", assetId: asset.id,
      name: `${asset.name} tag`, expiresAt: null });
    if (result?.newLink) setNewLink(result.newLink);
  }

  async function replace(link: PhysicalLink) {
    const result = await physical.mutate({ operation: "REPLACE_LINK", linkId: link.id });
    if (result?.newLink) setNewLink(result.newLink);
  }

  function manage(link: PhysicalLink, action: PhysicalLinkAction, value?: string) {
    void physical.mutate({ operation: "MANAGE_LINK", linkId: link.id, action,
      value: value ?? null });
  }

  return <main className="physical-screen"><header className="physical-header">
    <button type="button" onClick={props.onBack} aria-label="Back to the Front Gate">‹</button>
    <div><small>Private smart labels</small><h1>Physical Links</h1>
      <p>Connect a QR code or NFC tag without exposing the private item ID.</p></div>
    <span className={physical.online ? "is-live" : "is-cached"}>
      {physical.online ? "Live" : "Offline copy"}</span></header>
    {physical.message ? <p className="physical-message" role="status">{physical.message}</p> : null}
    <section className="physical-intro"><div><small>Smart items</small><h2>Your household items</h2>
      <p>Tags open through DiaryDock’s normal permission check. The secret itself is shown once.</p></div>
      <button type="button" disabled={!physical.online || physical.busy}
        onClick={() => setEditing(true)}>＋ Add item</button></section>
    {newLink ? <PhysicalLinkOutput link={newLink} onDone={() => setNewLink(null)}
      onMessage={physical.setMessage} /> : null}
    {physical.loading && !physical.snapshot ? <p className="physical-loading">Opening securely…</p> : null}
    {physical.snapshot ? <><PhysicalAssetList assets={physical.snapshot.assets}
      online={physical.online} busy={physical.busy} loadingAssetId={physical.loadingAssetId}
      isDetailed={physical.isAssetDetailed} onOpenDetails={(assetId) => void physical.loadAsset(assetId)}
      onMakeTag={(asset) => void makeTag(asset)} />
      <PhysicalTagList assets={physical.snapshot.assets} links={physical.snapshot.links}
        online={physical.online} busy={physical.busy} onManage={manage}
        onReplace={(link) => void replace(link)} /></> : null}
    {editing ? <PhysicalAssetEditor busy={physical.busy} onCancel={() => setEditing(false)}
      onSave={(asset) => void saveAsset(asset)} /> : null}
    <MobileBottomNav active={null} onNavigate={props.onNavigate} />
  </main>;
}
