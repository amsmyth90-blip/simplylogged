import Image from "next/image";

import type { PhysicalLinksController } from "./usePhysicalLinks";

export function NewPhysicalLinkCard({
  physical,
}: {
  physical: PhysicalLinksController;
}) {
  if (!physical.newLink) return null;
  return (
    <section className="mt-5 grid gap-5 rounded-[30px] border-2 border-[#b89a5c]/35 bg-[#fffdf8] p-5 shadow-sm sm:grid-cols-[240px_minmax(0,1fr)] sm:p-6">
      <div className="flex min-h-60 items-center justify-center rounded-[22px] bg-white p-3">
        {physical.qrDataUrl ? (
          <Image
            src={physical.qrDataUrl}
            alt="New DiaryDock Physical Link QR code"
            width={240}
            height={240}
            unoptimized
          />
        ) : (
          <span className="text-sm text-[#667068]">Preparing QR code…</span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789078]">
          Save this now
        </p>
        <h2 className="mt-2 font-serif text-3xl">Your new private tag</h2>
        <p className="mt-2 text-sm leading-6 text-[#667068]">
          For security, DiaryDock stores only a one-way verifier. This exact QR
          code and NFC payload cannot be shown again.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard
                .writeText(physical.newLink?.url ?? "")
                .then(() => physical.setMessage("Private link copied."))
            }
            className="min-h-11 rounded-xl bg-[#315443] px-4 text-xs font-semibold text-white"
          >
            Copy link
          </button>
          {physical.qrDataUrl ? (
            <a
              href={physical.qrDataUrl}
              download="diarydock-physical-link.png"
              className="inline-flex min-h-11 items-center rounded-xl border border-[#315443]/15 px-4 text-xs font-semibold text-[#52705a]"
            >
              Save QR
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => void physical.writeNfc()}
            className="min-h-11 rounded-xl border border-[#315443]/15 px-4 text-xs font-semibold text-[#52705a]"
          >
            Write NFC tag
          </button>
          <button
            type="button"
            onClick={() => physical.setNewLink(null)}
            className="min-h-11 px-3 text-xs font-semibold text-[#667068]"
          >
            Done
          </button>
        </div>
      </div>
    </section>
  );
}
