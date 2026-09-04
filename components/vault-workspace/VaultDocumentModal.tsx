import { ModalShell } from "@/components/ModalShell";
import type { VaultController } from "@/components/vault-workspace/useVaultController";
import { vaultCategories, type VaultDocument } from "@/lib/mock-data";

const fieldClass =
  "w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss";
const visibilityOptions = [
  ["PRIVATE", "Only me", "Private unless you change it"],
  ["HOUSEHOLD", "My household", "All active household members can view"],
  ["SELECTED_MEMBERS", "Choose people", "Only selected members can view"],
] as const;

export function VaultDocumentModal({
  controller,
}: {
  controller: VaultController;
}) {
  const { draft, setDraft } = controller;
  return (
    <ModalShell
      open={controller.open}
      title={controller.editingId ? "Edit document" : "Add document"}
      subtitle="Shared with rooms and mailbox routing through the DiaryDock data layer."
      onClose={controller.closeModal}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={controller.closeModal}
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void controller.saveDocument()}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
          >
            Save document
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink">Title</span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Passport scan bundle"
            className={fieldClass}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Category</span>
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              className={fieldClass}
            >
              {vaultCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">
              Document type
            </span>
            <select
              value={draft.kind}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  kind: event.target.value as VaultDocument["kind"],
                }))
              }
              className={fieldClass}
            >
              <option value="PDF">PDF</option>
              <option value="Scan">Scan</option>
              <option value="Note">Note</option>
              <option value="Image">Image</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">File size</span>
            <input
              type="text"
              value={draft.size}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  size: event.target.value,
                }))
              }
              placeholder="1.2 MB"
              className={fieldClass}
            />
          </label>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ink">
                Who can see this?
              </span>
              <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-ink/45">
                {draft.visibility === "PRIVATE"
                  ? "Only you"
                  : draft.visibility === "HOUSEHOLD"
                    ? "Household"
                    : `${draft.sharedWithUserIds.length} selected`}
              </span>
            </div>
            <div className="grid gap-2">
              {visibilityOptions.map(([visibility, label, detail]) => (
                <button
                  key={visibility}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({ ...current, visibility }))
                  }
                  aria-pressed={draft.visibility === visibility}
                  className={`rounded-2xl border px-3.5 py-3 text-left ${draft.visibility === visibility ? "border-moss/30 bg-sage/55" : "border-black/10 bg-white/72"}`}
                >
                  <span className="block text-sm font-semibold text-ink">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-ink/45">
                    {detail}
                  </span>
                </button>
              ))}
            </div>
            {draft.visibility === "SELECTED_MEMBERS" ? (
              <MemberOptions controller={controller} />
            ) : null}
          </section>
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
          <input
            type="checkbox"
            checked={draft.starred}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                starred: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-black/20 text-ink"
          />
          <span className="text-sm font-medium text-ink">
            Pin this document to Starred
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
          <input
            type="checkbox"
            checked={draft.emergencyVisible}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                emergencyVisible: event.target.checked,
              }))
            }
            className="mt-1 h-4 w-4 rounded border-black/20 text-moss"
          />
          <span>
            <span className="block text-sm font-medium text-ink">
              Show in Emergency Access Mode
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-ink/45">
              Makes this document available in the limited emergency view.
            </span>
          </span>
        </label>
      </div>
    </ModalShell>
  );
}

function MemberOptions({ controller }: { controller: VaultController }) {
  return (
    <div className="grid gap-2">
      {controller.shareOptions.map((member) => {
        const userId = member.userId;
        if (!userId) return null;
        const checked = controller.draft.sharedWithUserIds.includes(userId);
        return (
          <label
            key={member.id}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 ${checked ? "border-moss/30 bg-sage/55" : "border-black/10 bg-white/72"}`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) =>
                controller.setDraft((current) => ({
                  ...current,
                  sharedWithUserIds: event.target.checked
                    ? [...new Set([...current.sharedWithUserIds, userId])]
                    : current.sharedWithUserIds.filter(
                        (item) => item !== userId,
                      ),
                }))
              }
              className="h-4 w-4 rounded border-black/20 text-moss"
            />
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/82 text-xs font-semibold text-ink/62">
              {member.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">
                {member.name}
              </span>
              <span className="block truncate text-xs text-ink/45">
                {member.access}
              </span>
            </span>
          </label>
        );
      })}
      {!controller.shareOptions.length ? (
        <p className="text-xs leading-5 text-ink/45">
          Invite someone to your household before selecting them here.
        </p>
      ) : null}
    </div>
  );
}
