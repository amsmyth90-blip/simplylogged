import type { PhysicalAsset, PhysicalLink, PhysicalLinkAction } from "@diarydock/physical-links";

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "Never";
}

export function PhysicalTagList(props: { assets: PhysicalAsset[]; links: PhysicalLink[];
  online: boolean; busy: boolean;
  onManage: (link: PhysicalLink, action: PhysicalLinkAction, value?: string) => void;
  onReplace: (link: PhysicalLink) => void }) {
  if (!props.links.length) return null;
  const names = new Map(props.assets.map((asset) => [asset.id, asset.name]));
  const manage = (link: PhysicalLink, action: PhysicalLinkAction, value?: string) =>
    props.onManage(link, action, value);
  return <section className="physical-tags"><header><small>Private labels</small><h2>Your tags</h2>
    <p>Existing secrets are never displayed again. Replace a tag if it is lost or damaged.</p></header>
    {props.links.map((link) => { const active = link.status === "ACTIVE";
      const manageable = active || link.status === "DISABLED";
      return <article key={link.id}><div className="physical-tag-heading"><div><h3>{link.name}</h3>
        <p>{names.get(link.resourceId) || "Linked item"} · Used {link.useCount} times</p></div>
        <span className={active ? "is-active" : ""}>{link.status.toLowerCase()}</span></div>
        <div className="physical-tag-meta"><span>Last used: {date(link.lastUsedAt)}</span>
          <span>Expires: {date(link.expiresAt)}</span></div>
        {manageable ? <div className="physical-tag-actions">
          <button type="button" disabled={!props.online || props.busy}
            onClick={() => manage(link, active ? "DISABLE" : "ENABLE")}>{active ? "Disable" : "Enable"}</button>
          <button type="button" disabled={!props.online || props.busy} onClick={() => {
            const name = window.prompt("Name this tag", link.name); if (name) manage(link, "RENAME", name);
          }}>Rename</button><select aria-label={`Reassign ${link.name}`} value={link.resourceId}
            disabled={!props.online || props.busy} onChange={(event) => manage(
              link, "REASSIGN", event.target.value)}>{props.assets.map((asset) =>
              <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select>
          <button type="button" disabled={!props.online || props.busy}
            onClick={() => props.onReplace(link)}>Replace</button>
          <button type="button" className="is-danger" disabled={!props.online || props.busy}
            onClick={() => { if (window.confirm("Permanently revoke this tag?")) manage(link, "REVOKE"); }}>
            Revoke</button></div> : null}
      </article>; })}</section>;
}
