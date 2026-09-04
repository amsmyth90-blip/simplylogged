import type { PhysicalAsset } from "@diarydock/physical-links";

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "";
}

export function PhysicalAssetList(props: { assets: PhysicalAsset[]; online: boolean;
  busy: boolean; loadingAssetId: string; isDetailed: (assetId: string) => boolean;
  onMakeTag: (asset: PhysicalAsset) => void; onOpenDetails: (assetId: string) => void }) {
  if (!props.assets.length) return <div className="physical-empty"><strong>No smart items yet</strong>
    <p>Add an appliance, boiler or piece of equipment to make a private QR or NFC tag.</p></div>;
  return <div className="physical-asset-list">{props.assets.map((asset) => <article key={asset.id}>
    <header><span>{asset.category === "BOILER" ? "⌂" : "⚙"}</span><div><h3>{asset.name}</h3>
      <p>{[asset.location, asset.manufacturer, asset.model].filter(Boolean).join(" · ")
        || "Details can be added later"}</p></div></header>
    {asset.serialNumberMasked ? <p><b>Serial</b>{asset.serialNumberMasked}</p> : null}
    {asset.warrantyDueAt ? <p><b>Warranty</b>{date(asset.warrantyDueAt)}</p> : null}
    {asset.nextServiceAt ? <p><b>Next service</b>{date(asset.nextServiceAt)}</p> : null}
    {asset.maintenanceNotes ? <p className="physical-notes">{asset.maintenanceNotes}</p> : null}
    {!props.isDetailed(asset.id) ? <button type="button" className="physical-details"
      disabled={Boolean(props.loadingAssetId)} onClick={() => props.onOpenDetails(asset.id)}>
      {props.loadingAssetId === asset.id ? "Opening details…" : "Open full details"}</button> : null}
    <button type="button" disabled={!props.online || props.busy}
      onClick={() => props.onMakeTag(asset)}>Make private tag</button>
  </article>)}</div>;
}
