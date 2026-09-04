"use client";
import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";
import { EmptySection, SectionHeading } from "./trip-detail-shared";
import type { TripDetailController } from "./useTripDetailController";
export function TripDocumentsSection({
  controller,
}: {
  controller: TripDetailController;
}) {
  const { trip, linkedDocuments, setAddMode, patchTrip } = controller;
  if (!trip) return null;
  return (
    <section>
      <SectionHeading
        title="Trip documents"
        detail="Link private files already stored in DiaryDock. Extracted details must be reviewed before use."
        action={
          <button
            type="button"
            onClick={() => setAddMode("document")}
            className="min-h-11 rounded-full bg-[#2f5140] px-4 text-xs font-semibold text-white"
          >
            Link document
          </button>
        }
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {linkedDocuments.map(({ link, document }) => (
          <article
            key={link.id}
            className="rounded-[22px] border border-[#20352a]/[0.07] bg-white/90 p-4"
          >
            <div className="flex gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
                <UiIcon name="file" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold">
                  {document.title}
                </h3>
                <p className="mt-1 text-[10px] text-[#667068]">
                  {link.category} · {document.kind} · {document.size}
                </p>
                <p
                  className={`mt-2 text-[10px] font-semibold ${document.reviewStatus === "needs-review" ? "text-[#a55443]" : "text-[#52705a]"}`}
                >
                  {document.reviewStatus === "needs-review"
                    ? "Check extracted details"
                    : "Reviewed"}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  patchTrip({
                    documentLinks: trip.documentLinks.filter(
                      (item) => item.id !== link.id,
                    ),
                  })
                }
                aria-label={`Unlink ${document.title}`}
                className="h-11 w-11 text-[#8a5145]"
              >
                <UiIcon name="plus" className="mx-auto h-4 w-4 rotate-45" />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!linkedDocuments.length ? (
        <div className="mt-5">
          <EmptySection
            icon="file"
            title="No trip documents linked"
            detail="Scan or upload to private All Files, then return here to link the reviewed record."
          />
        </div>
      ) : null}
      <Link
        href={`/capture?room=driveway&trip=${trip.id}`}
        className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#52705a]/20 bg-[#eef2e9] text-sm font-semibold text-[#315b42]"
      >
        <UiIcon name="camera" className="h-4 w-4" />
        Scan or upload securely
      </Link>
      <p className="mt-3 text-[10px] leading-4 text-[#667068]">
        The original document remains authoritative. Failed analysis does not
        prevent secure storage.
      </p>
    </section>
  );
}
