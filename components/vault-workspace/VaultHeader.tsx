import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import type { VaultController } from "@/components/vault-workspace/useVaultController";
import type { VaultSort } from "@/components/vault-workspace/vault-workspace-model";

export function VaultHeader({ controller }: { controller: VaultController }) {
  return (
    <>
      <PageHeader
        eyebrow={controller.reviewInboxMode ? "Review inbox" : "All files"}
        title={controller.reviewInboxMode ? "Review Inbox" : "All Files"}
        subtitle={
          controller.reviewInboxMode
            ? "Check new scans, shares and emailed documents before DiaryDock files them away."
            : "Every document, securely stored in one place."
        }
        heroImage="/images/pages/vault-hero.webp"
        heroPosition="center 44%"
        badge="Secure archive"
        action={
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-white/30 bg-white/14 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md sm:inline-flex">
              {controller.repositoryMode === "supabase"
                ? "Secure sync"
                : "Local session"}
            </span>
            <button
              type="button"
              onClick={controller.openCreate}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/16 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md transition hover:bg-white/22"
            >
              <UiIcon name="plus" className="h-4 w-4" />
              Add file
            </button>
          </div>
        }
      />
      <label className="estate-sheet flex items-center gap-3 px-4 py-3">
        <UiIcon name="search" className="h-5 w-5 shrink-0 text-ink/35" />
        <input
          type="search"
          value={controller.query}
          onChange={(event) => controller.setQuery(event.target.value)}
          placeholder={
            controller.reviewInboxMode
              ? "Search documents waiting for review..."
              : "Search passports, policies, deeds..."
          }
          aria-label={
            controller.reviewInboxMode ? "Search review inbox" : "Search files"
          }
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
        />
      </label>
      <section className="estate-sheet p-3">
        <div className="flex flex-wrap gap-2">
          {controller.filterOptions.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => controller.setSelectedFilter(filter.id)}
              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${controller.selectedFilter === filter.id ? "bg-ink text-white shadow-soft" : "border border-white/70 bg-white/62 text-ink/58 hover:bg-white"}`}
            >
              {filter.label}
              <span
                className={
                  controller.selectedFilter === filter.id
                    ? "ml-1 text-white/72"
                    : "ml-1 text-ink/38"
                }
              >
                {filter.count}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 px-1 py-1">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">
            Sort documents
          </span>
          <select
            value={controller.sortBy}
            onChange={(event) =>
              controller.setSortBy(event.target.value as VaultSort)
            }
            className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-ink/62 outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="category">Category</option>
            <option value="due-date">Due date</option>
            <option value="title">Title</option>
          </select>
        </div>
      </section>
      {controller.reviewInboxMode ? (
        <section className="estate-sheet border border-amber-200/65 bg-amber-50/82 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/88 text-amber-700">
              <UiIcon name="alert" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <SectionHeader
                title="Review inbox"
                hint={
                  controller.emailImportQueue.length
                    ? `${controller.emailImportQueue.length} emailed document${controller.emailImportQueue.length === 1 ? "" : "s"} waiting`
                    : "Scans and emailed files stay here until checked"
                }
              />
              <p className="mt-1.5 text-xs leading-5 text-ink/62">
                Open the original, check the suggested place, then mark it
                reviewed or delete obvious duplicates.
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Check", detail: "Open original" },
              { label: "File", detail: "Use suggestion" },
              { label: "Done", detail: "Mark reviewed" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/78 px-3 py-2.5"
              >
                <p className="text-xs font-semibold text-ink">{item.label}</p>
                <p className="mt-0.5 text-[10px] leading-4 text-ink/50">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
