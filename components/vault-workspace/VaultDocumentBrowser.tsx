import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { VaultController } from "@/components/vault-workspace/useVaultController";
import {
  filingDestinationOptions,
  filingDestinationValue,
  isEmailImport,
  parseFilingDestination,
  type FilingDestination,
} from "@/components/vault-workspace/vault-workspace-model";
import { suggestFilingDestination } from "@/lib/life-inbox/suggestions";

export function VaultDocumentBrowser({
  controller,
}: {
  controller: VaultController;
}) {
  return (
    <>
      <section className="space-y-3">
        <SectionHeader
          title="Categories"
          hint={`${controller.documents.length} documents across your secure collections`}
        />
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => controller.setSelectedCategory("all")}
            className={`estate-sheet flex w-36 shrink-0 items-center gap-2.5 px-3 py-2.5 text-left transition ${controller.selectedCategory === "all" ? "ring-1 ring-moss/30" : ""}`}
          >
            <div className="flex shrink-0 items-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mist text-ink/60">
                <UiIcon name="folder" className="h-5 w-5" />
              </span>
              <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-ink/55">
                {controller.documents.length}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">All documents</p>
              <p className="hidden">Everything currently stored in DiaryDock</p>
            </div>
          </button>
          {controller.categoryCounts.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => controller.setSelectedCategory(category.name)}
              className={`estate-sheet flex w-36 shrink-0 items-center gap-2.5 px-3 py-2.5 text-left transition ${controller.selectedCategory === category.name ? "ring-1 ring-moss/30" : ""}`}
            >
              <div className="flex shrink-0 items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mist text-ink/60">
                  <UiIcon
                    name={category.icon as IconName}
                    className="h-5 w-5"
                  />
                </span>
                <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-ink/55">
                  {category.count}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">
                  {category.name}
                </p>
                <p className="hidden">{category.note}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="estate-sheet divide-y divide-white/60 overflow-hidden">
        {controller.filteredDocuments.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon="folder"
              title="No matches yet"
              message="Try another search term or add a new document to this category."
            />
          </div>
        ) : (
          controller.filteredDocuments.map((document) => (
            <VaultDocumentRow
              key={document.id}
              controller={controller}
              document={document}
            />
          ))
        )}
      </section>
    </>
  );
}

function VaultDocumentRow({
  controller,
  document,
}: {
  controller: VaultController;
  document: VaultController["documents"][number];
}) {
  const suggestion = suggestFilingDestination(document);
  const suggestionValue = filingDestinationValue(suggestion);
  const destinationValue =
    controller.manualDestinationValues[document.id] ?? suggestionValue;
  const selectedDestination: FilingDestination =
    parseFilingDestination(destinationValue) ?? suggestion;
  const destinationOptions = [
    suggestion,
    ...filingDestinationOptions.filter(
      (option) => filingDestinationValue(option) !== suggestionValue,
    ),
  ];
  return (
    <article
      className={`px-3.5 py-3 transition hover:bg-white/60 ${controller.selectedDocument?.id === document.id ? "bg-white/45" : ""}`}
    >
      <Link
        href={`/document/${document.id}`}
        className="flex items-center gap-3 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist text-[10px] font-bold text-ink/70">
          {document.kind}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-ink">
              {document.title}
            </span>
            {document.starred ? (
              <UiIcon name="star" className="h-3.5 w-3.5 shrink-0 text-gold" />
            ) : null}
            {document.emergencyVisible ? (
              <span className="shrink-0 rounded-full bg-blush px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                Emergency
              </span>
            ) : null}
            {document.reviewStatus === "needs-review" ? (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Review
              </span>
            ) : null}
            {isEmailImport(document) ? (
              <span className="shrink-0 rounded-full bg-sage/65 px-2 py-0.5 text-[10px] font-semibold text-moss">
                Email import
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs text-ink/50">
            {document.category} - {document.size} - Updated{" "}
            {document.updated.toLowerCase()}
          </span>
        </span>
        <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/25" />
      </Link>
      {controller.reviewInboxMode ? (
        <div className="mt-2.5 rounded-2xl bg-white/62 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sage/60 text-moss">
              <UiIcon name="folder" className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-ink">
                Suggested: {suggestion.roomName} · {suggestion.category}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-ink/50">
                {suggestion.reason}
              </p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <label className="col-span-3">
              <span className="sr-only">
                Choose where to file {document.title}
              </span>
              <select
                value={destinationValue}
                onChange={(event) =>
                  controller.setManualDestinationValues((current) => ({
                    ...current,
                    [document.id]: event.target.value,
                  }))
                }
                className="min-h-9 w-full rounded-xl border border-ink/10 bg-white/88 px-3 text-[11px] font-semibold text-ink/70 outline-none transition focus:border-moss/40 focus:ring-2 focus:ring-moss/15"
              >
                {destinationOptions.map((option) => (
                  <option
                    key={filingDestinationValue(option)}
                    value={filingDestinationValue(option)}
                  >
                    {option.roomName} · {option.category}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() =>
                void controller.fileDocumentToDestination(
                  document,
                  selectedDestination,
                )
              }
              disabled={controller.busyDocumentId === document.id}
              className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#2f5140] px-2 text-[10px] font-semibold text-white disabled:opacity-55"
            >
              File here
            </button>
            <Link
              href={`/document/${document.id}`}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-ink/10 bg-white/80 px-2 text-[10px] font-semibold text-ink/65"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={() => void controller.deleteDuplicateDocument(document)}
              disabled={controller.busyDocumentId === document.id}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-2 text-[10px] font-semibold text-red-700 disabled:opacity-55"
            >
              Duplicate
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
