import type { FormEvent, RefObject } from "react";

import { UiIcon } from "@/components/UiIcon";
import { WillCard, WillSectionHeading } from "@/components/wills/WillUi";
import type { WillUploadStage } from "@/components/wills/my-will-dashboard-model";
import type { WillVersionStatus } from "@/lib/will-records";

type WillUploadPanelProps = {
  confirmReplacement: boolean;
  currentVersion: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  makeCurrent: boolean;
  message: string;
  onClose: () => void;
  onConfirmReplacementChange: (value: boolean) => void;
  onFileChange: (file: File | null) => void;
  onMakeCurrentChange: (value: boolean) => void;
  onSignedDateChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onVersionNotesChange: (value: string) => void;
  onVersionStatusChange: (value: WillVersionStatus) => void;
  signedDate: string;
  uploadStage: WillUploadStage;
  versionNotes: string;
  versionStatus: WillVersionStatus;
};

export function WillUploadPanel({
  confirmReplacement,
  currentVersion,
  fileInputRef,
  makeCurrent,
  message,
  onClose,
  onConfirmReplacementChange,
  onFileChange,
  onMakeCurrentChange,
  onSignedDateChange,
  onSubmit,
  onVersionNotesChange,
  onVersionStatusChange,
  signedDate,
  uploadStage,
  versionNotes,
  versionStatus,
}: WillUploadPanelProps) {
  const busy = uploadStage === "uploading" || uploadStage === "processing";
  return (
    <WillCard className="border-[#6f8e72]/20" as="section">
      <div className="flex items-start justify-between gap-3">
        <WillSectionHeading
          icon="plus"
          title={currentVersion ? "Add a newer version" : "Upload your will"}
          description="The original file is kept private. Previous versions are preserved."
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close upload form"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#667068] hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
        >
          <UiIcon name="plus" className="h-4 w-4 rotate-45" />
        </button>
      </div>
      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-[#20352a]">
            Will file
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/jpeg,image/png,image/webp,image/heic"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            className="mt-2 block min-h-12 w-full rounded-[15px] border border-dashed border-[#6f8e72]/45 bg-[#f8f8f2] px-3 py-3 text-sm text-[#59655d] file:mr-3 file:rounded-full file:border-0 file:bg-[#dde6d8] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#294436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          />
          <span className="mt-1.5 block text-[11px] leading-4 text-[#758078]">
            PDF, JPEG, PNG, WebP or HEIC, up to 4 MB.
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[#20352a]">
              Copy type
            </span>
            <select
              value={versionStatus}
              onChange={(event) =>
                onVersionStatusChange(event.target.value as WillVersionStatus)
              }
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a] outline-none focus:border-[#6f8e72]"
            >
              <option value="signed">Signed copy</option>
              <option value="draft">Draft</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#20352a]">
              Date signed{" "}
              <span className="font-normal text-[#667068]">(if known)</span>
            </span>
            <input
              type="date"
              value={signedDate}
              disabled={versionStatus === "draft"}
              onChange={(event) => onSignedDateChange(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a] outline-none focus:border-[#6f8e72] disabled:bg-[#f2f2ed]"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-[#20352a]">
            Version notes{" "}
            <span className="font-normal text-[#667068]">(optional)</span>
          </span>
          <textarea
            value={versionNotes}
            onChange={(event) => onVersionNotesChange(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm text-[#20352a] outline-none focus:border-[#6f8e72]"
            placeholder="For example, updated executors or signed after moving home."
          />
        </label>
        {currentVersion ? (
          <div className="space-y-3 rounded-[16px] bg-[#f4f5ee] p-3.5">
            <label className="flex min-h-11 items-center gap-3 text-sm text-[#20352a]">
              <input
                type="checkbox"
                checked={makeCurrent}
                onChange={(event) => onMakeCurrentChange(event.target.checked)}
                className="h-5 w-5 accent-[#52705a]"
              />
              Make this the current version
            </label>
            {makeCurrent ? (
              <label className="flex min-h-11 items-start gap-3 text-[12px] leading-5 text-[#59655d]">
                <input
                  type="checkbox"
                  checked={confirmReplacement}
                  onChange={(event) =>
                    onConfirmReplacementChange(event.target.checked)
                  }
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#52705a]"
                />
                I confirm this upload should become current. The previous
                version will remain available and will be marked superseded.
              </label>
            ) : null}
          </div>
        ) : null}
        {message ? (
          <p
            role="status"
            className={`rounded-[14px] px-3.5 py-3 text-[12px] leading-5 ${uploadStage === "error" ? "bg-red-50 text-red-700" : "bg-[#eef2e9] text-[#45604d]"}`}
          >
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#203f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        >
          <UiIcon
            name={uploadStage === "processing" ? "clock" : "lock"}
            className="h-4 w-4"
          />
          {uploadStage === "uploading"
            ? "Uploading securely…"
            : uploadStage === "processing"
              ? "Stored — preparing summary…"
              : "Store this version"}
        </button>
      </form>
    </WillCard>
  );
}
