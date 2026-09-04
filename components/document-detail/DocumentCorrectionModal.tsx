import type { Dispatch, SetStateAction } from "react";

import {
  documentRoomOptions,
  type DocumentCorrectionDraft,
} from "@/components/document-detail/document-detail-model";
import { ModalShell } from "@/components/ModalShell";
import { documentCategoryOptions } from "@/lib/document-extraction";
import type { HouseholdMember } from "@/lib/diarydock-data";

type DocumentCorrectionModalProps = {
  draft: DocumentCorrectionDraft | null;
  onClose: () => void;
  onSave: () => void;
  open: boolean;
  setDraft: Dispatch<SetStateAction<DocumentCorrectionDraft | null>>;
  shareOptions: HouseholdMember[];
};

const visibilityOptions = [
  ["PRIVATE", "Only me", "Private unless you change it"],
  ["HOUSEHOLD", "My household", "All active household members can view"],
  ["SELECTED_MEMBERS", "Choose people", "Only the people you select can view"],
] as const;

export function DocumentCorrectionModal({
  draft,
  onClose,
  onSave,
  open,
  setDraft,
  shareOptions,
}: DocumentCorrectionModalProps) {
  const update = <Key extends keyof DocumentCorrectionDraft>(
    key: Key,
    value: DocumentCorrectionDraft[Key],
  ) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  return (
    <ModalShell
      open={open}
      title="Correct document"
      subtitle="Update the AI capture, move it to the right room, and save a reviewed record."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
          >
            Save corrections
          </button>
        </div>
      }
    >
      {draft ? (
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Issuer</span>
              <input
                type="text"
                value={draft.issuer}
                onChange={(event) => update("issuer", event.target.value)}
                placeholder="Insurer, council, school, GP..."
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Due date</span>
              <input
                type="text"
                value={draft.dueDate}
                onChange={(event) => update("dueDate", event.target.value)}
                placeholder="12 Aug 2026"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Category</span>
              <select
                value={draft.category}
                onChange={(event) => update("category", event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              >
                {documentCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Room</span>
              <select
                value={draft.roomId}
                onChange={(event) => update("roomId", event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              >
                <option value="">All Files only</option>
                {documentRoomOptions.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">AI summary</span>
            <textarea
              value={draft.extractionSummary}
              onChange={(event) =>
                update("extractionSummary", event.target.value)
              }
              rows={3}
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Action items</span>
            <textarea
              value={draft.actionItems}
              onChange={(event) => update("actionItems", event.target.value)}
              rows={4}
              placeholder="One action per line"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
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
            <div className="grid gap-2 sm:grid-cols-3">
              {visibilityOptions.map(([visibility, label, detail]) => (
                <button
                  key={visibility}
                  type="button"
                  onClick={() => update("visibility", visibility)}
                  aria-pressed={draft.visibility === visibility}
                  className={`rounded-2xl border px-3 py-3 text-left ${draft.visibility === visibility ? "border-moss/35 bg-sage/55" : "border-black/10 bg-white/72"}`}
                >
                  <span className="block text-sm font-semibold text-ink">
                    {label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-ink/45">
                    {detail}
                  </span>
                </button>
              ))}
            </div>
            {draft.visibility === "SELECTED_MEMBERS" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {shareOptions.map((member) => {
                  const userId = member.userId;
                  if (!userId) return null;
                  const checked = draft.sharedWithUserIds.includes(userId);
                  return (
                    <label
                      key={member.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 transition ${checked ? "border-moss/30 bg-sage/55" : "border-black/10 bg-white/72"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          update(
                            "sharedWithUserIds",
                            event.target.checked
                              ? [
                                  ...new Set([
                                    ...draft.sharedWithUserIds,
                                    userId,
                                  ]),
                                ]
                              : draft.sharedWithUserIds.filter(
                                  (item) => item !== userId,
                                ),
                          )
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
                {!shareOptions.length ? (
                  <p className="text-xs text-ink/45">
                    Invite someone to your household before selecting them here.
                  </p>
                ) : null}
              </div>
            ) : null}
            <p className="text-xs leading-5 text-ink/45">
              DiaryDock checks this permission again whenever someone opens the
              record or its file.
            </p>
          </section>
          <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/72 px-4 py-3">
            <input
              type="checkbox"
              checked={draft.emergencyVisible}
              onChange={(event) =>
                update("emergencyVisible", event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-black/20 text-moss"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">
                Show in Emergency Access Mode
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-ink/45">
                Adds this to your emergency preview. It does not grant another
                person access.
              </span>
            </span>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">OCR text</span>
            <textarea
              value={draft.extractedText}
              onChange={(event) => update("extractedText", event.target.value)}
              rows={6}
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
        </div>
      ) : null}
    </ModalShell>
  );
}
