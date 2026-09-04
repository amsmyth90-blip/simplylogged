import type { PhysicalLink } from "./physical-link-model";
import type { PhysicalLinksController } from "./usePhysicalLinks";

export function PhysicalLinkList({
  physical,
}: {
  physical: PhysicalLinksController;
}) {
  if (!physical.links.length) return null;
  return (
    <section className="mt-7">
      <h2 className="font-serif text-2xl">Your tags</h2>
      <p className="mt-1 text-sm text-[#667068]">
        Existing secrets are never displayed again. Replace a tag if it is lost
        or damaged.
      </p>
      <div className="mt-3 space-y-3">
        {physical.links.map((link) => (
          <PhysicalLinkRow key={link.id} link={link} physical={physical} />
        ))}
      </div>
    </section>
  );
}

function PhysicalLinkRow({
  link,
  physical,
}: {
  link: PhysicalLink;
  physical: PhysicalLinksController;
}) {
  const canManage = link.status === "ACTIVE" || link.status === "DISABLED";
  const lastUsed = link.lastUsedAt
    ? ` · Last ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(link.lastUsedAt))}`
    : "";
  return (
    <article className="rounded-[22px] border border-white/85 bg-white/85 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{link.name}</h3>
            <span
              className={`rounded-full px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] ${link.status === "ACTIVE" ? "bg-[#e8efe5] text-[#52705a]" : "bg-slate-100 text-slate-500"}`}
            >
              {link.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#667068]">
            {physical.assetsById.get(link.resourceId)?.name || "Linked item"} ·
            Used {link.useCount} {link.useCount === 1 ? "time" : "times"}
            {lastUsed}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {link.status === "ACTIVE" ? (
            <TagButton
              busy={physical.busy}
              onClick={() => void physical.manage(link.id, "DISABLE")}
            >
              Disable
            </TagButton>
          ) : link.status === "DISABLED" ? (
            <TagButton
              busy={physical.busy}
              onClick={() => void physical.manage(link.id, "ENABLE")}
            >
              Enable
            </TagButton>
          ) : null}
          {canManage ? (
            <>
              <TagButton
                busy={physical.busy}
                onClick={() => {
                  const name = window.prompt("Name this tag", link.name);
                  if (name) void physical.manage(link.id, "RENAME", name);
                }}
              >
                Rename
              </TagButton>
              <select
                aria-label={`Reassign ${link.name}`}
                value={link.resourceId}
                onChange={(event) =>
                  void physical.manage(link.id, "REASSIGN", event.target.value)
                }
                className="min-h-10 rounded-xl border border-[#315443]/12 bg-white px-2 text-xs font-semibold"
              >
                {physical.assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
              <TagButton
                busy={physical.busy}
                onClick={() =>
                  void physical.createOrReplace("REPLACE_LINK", link.id)
                }
              >
                Replace
              </TagButton>
              <button
                disabled={physical.busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Permanently revoke this tag? It cannot be re-enabled.",
                    )
                  ) {
                    void physical.manage(link.id, "REVOKE");
                  }
                }}
                className="min-h-10 rounded-xl px-3 text-xs font-semibold text-[#a4473d]"
              >
                Revoke
              </button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function TagButton({
  busy,
  onClick,
  children,
}: {
  busy: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className="min-h-10 rounded-xl border border-[#315443]/12 px-3 text-xs font-semibold"
    >
      {children}
    </button>
  );
}
