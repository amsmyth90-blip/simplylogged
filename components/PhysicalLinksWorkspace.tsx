"use client";

import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";
import { NewPhysicalLinkCard } from "@/components/physical-links/NewPhysicalLinkCard";
import { PhysicalAssetForm } from "@/components/physical-links/PhysicalAssetForm";
import { PhysicalAssetList } from "@/components/physical-links/PhysicalAssetList";
import { PhysicalLinkList } from "@/components/physical-links/PhysicalLinkList";
import { usePhysicalLinks } from "@/components/physical-links/usePhysicalLinks";

export function PhysicalLinksWorkspace() {
  const physical = usePhysicalLinks();
  const toggleForm = () => physical.setShowAssetForm((visible) => !visible);

  return (
    <main className="min-h-[100svh] bg-[#f5f1e8] px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] text-[#20352a] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Private smart labels"
          title="Physical Links"
          subtitle="Connect a QR code or NFC tag to an appliance or boiler without putting its private record ID on the label."
          backHref="/settings"
          action={
            <button
              type="button"
              onClick={toggleForm}
              className="hidden min-h-11 items-center gap-2 rounded-2xl bg-[#315443] px-4 text-sm font-semibold text-white sm:inline-flex"
            >
              <UiIcon name="plus" className="h-4 w-4" />
              Add item
            </button>
          }
        />
        <button
          type="button"
          onClick={toggleForm}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#315443] px-4 text-sm font-semibold text-white sm:hidden"
        >
          <UiIcon name="plus" className="h-4 w-4" />
          Add item
        </button>
        {physical.message ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-[#6f8e72]/15 bg-white/80 px-4 py-3 text-sm text-[#52705a]"
          >
            {physical.message}
          </p>
        ) : null}
        {physical.snapshot && !physical.snapshot.detailsComplete ? (
          <p className="mt-4 rounded-2xl border border-amber-700/15 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Some long notes are hidden in this view. Every item and tag control is still available.
          </p>
        ) : null}
        {physical.showAssetForm ? (
          <PhysicalAssetForm physical={physical} />
        ) : null}
        <NewPhysicalLinkCard physical={physical} />
        <PhysicalAssetList physical={physical} />
        <PhysicalLinkList physical={physical} />
      </div>
    </main>
  );
}
