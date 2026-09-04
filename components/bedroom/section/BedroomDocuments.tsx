import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

import { HealthCard, HealthEmpty } from "./BedroomSectionUi";
import type { BedroomSectionController } from "./useBedroomSection";

export function BedroomDocuments({
  bedroom,
}: {
  bedroom: BedroomSectionController;
}) {
  return (
    <HealthCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Your private files</h2>
          <p className="mt-1 text-xs text-[#667068]">
            Uploaded through the same protected document flow as All Files.
          </p>
        </div>
        <Link
          href="/capture?room=bedroom"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#315443] px-4 text-xs font-semibold text-white"
        >
          <UiIcon name="camera" className="h-4 w-4" />
          Scan
        </Link>
      </div>
      <div className="mt-4 space-y-2">
        {bedroom.documents.length ? (
          bedroom.documents.map((document) => (
            <Link
              key={document.id}
              href={`/document/${document.id}?from=bedroom`}
              className="flex min-h-16 items-center gap-3 rounded-[18px] bg-[#f7f5ef] p-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
                <UiIcon name="lock" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {document.title}
                </span>
                <span className="mt-1 block text-[10px] text-[#667068]">
                  {document.kind} · {document.updated} ·{" "}
                  {document.reviewStatus === "needs-review"
                    ? "Check details"
                    : "Reviewed"}
                </span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" />
            </Link>
          ))
        ) : (
          <HealthEmpty
            icon="folder"
            title="No medical documents uploaded"
            detail="Scan or upload a document when you are ready. If reading fails, the original can still be stored privately for you to review."
            action={
              <Link
                href="/capture?room=bedroom"
                className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white"
              >
                Add a document
              </Link>
            }
          />
        )}
      </div>
    </HealthCard>
  );
}
