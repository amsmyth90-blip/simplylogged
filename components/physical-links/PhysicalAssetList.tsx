import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

import type { PhysicalLinksController } from "./usePhysicalLinks";

export function PhysicalAssetList({
  physical,
}: {
  physical: PhysicalLinksController;
}) {
  return (
    <section className="mt-6">
      <h2 className="font-serif text-2xl">Your items</h2>
      {physical.loading ? (
        <p className="mt-3 rounded-2xl bg-white/75 p-5 text-sm text-[#667068]">
          Opening your items…
        </p>
      ) : physical.assets.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {physical.assets.map((asset) => (
            <article
              key={asset.id}
              className="rounded-[24px] border border-white/85 bg-white/85 p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8efe5] text-[#52705a]">
                  <UiIcon
                    name={asset.category === "BOILER" ? "home" : "gear"}
                    className="h-5 w-5"
                  />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{asset.name}</h3>
                  <p className="mt-1 text-xs text-[#667068]">
                    {[asset.location, asset.manufacturer, asset.model]
                      .filter(Boolean)
                      .join(" · ") || "Details can be added later"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/assets/${asset.id}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[#315443]/15 text-xs font-semibold text-[#52705a]"
                >
                  Open
                </Link>
                <button
                  type="button"
                  disabled={physical.busy}
                  onClick={() =>
                    void physical.createOrReplace(
                      "CREATE_LINK",
                      asset.id,
                      `${asset.name} tag`,
                    )
                  }
                  className="min-h-11 flex-1 rounded-xl bg-[#315443] text-xs font-semibold text-white disabled:opacity-40"
                >
                  Make tag
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-[24px] bg-white/80 p-6 text-center text-sm text-[#667068]">
          Add an appliance, boiler or item to make your first private tag.
        </div>
      )}
    </section>
  );
}
