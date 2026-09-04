import {
  WillCard,
  WillSectionHeading,
  formatWillDate,
} from "@/components/wills/WillUi";
import type { WillVersionStatus } from "@/lib/will-records";

import { willFieldClass } from "./WillDetailsUi";
import type { WillDetailsViewModel } from "./useWillDetails";

export function WillImportantDetailsCard({
  view,
}: {
  view: WillDetailsViewModel;
}) {
  return (
    <WillCard>
      <WillSectionHeading
        icon="file"
        title="Important details"
        description="These are your own organisational records and can be updated at any time."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[#20352a]">
            Will status
          </span>
          <select
            disabled={!view.currentVersion}
            value={view.currentVersion?.status ?? "draft"}
            onChange={(event) =>
              view.setDraft((current) => ({
                ...current,
                versions: current.versions.map((version) =>
                  version.id === current.currentVersionId
                    ? {
                        ...version,
                        status: event.target.value as WillVersionStatus,
                      }
                    : version,
                ),
              }))
            }
            className={`${willFieldClass} disabled:bg-[#f1f1ec]`}
          >
            <option value="draft">Draft</option>
            <option value="signed">Signed copy</option>
            <option value="superseded">Superseded</option>
          </select>
          <span className="mt-1 block text-[11px] text-[#758078]">
            {view.currentVersion
              ? `Current upload: ${view.currentVersion.versionLabel}`
              : "Upload a will before setting its status."}
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[#20352a]">
            Date uploaded
          </span>
          <input
            readOnly
            value={
              view.currentVersion
                ? formatWillDate(view.currentVersion.uploadedAt)
                : "Not recorded"
            }
            className={`${willFieldClass} bg-[#f5f5ef] text-[#667068]`}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[#20352a]">
            Date signed
          </span>
          <input
            type="date"
            disabled={!view.currentVersion}
            value={view.currentVersion?.signedDate ?? ""}
            onChange={(event) =>
              view.setDraft((current) => ({
                ...current,
                versions: current.versions.map((version) =>
                  version.id === current.currentVersionId
                    ? { ...version, signedDate: event.target.value }
                    : version,
                ),
              }))
            }
            className={`${willFieldClass} disabled:bg-[#f1f1ec]`}
          />
        </label>
        <DateField
          label="Last reviewed date"
          value={view.draft.lastReviewedAt}
          onChange={(value) => view.updateField("lastReviewedAt", value)}
        />
        <DateField
          label="Next review date"
          value={view.draft.nextReviewAt}
          onChange={(value) => view.updateField("nextReviewAt", value)}
        />
        <TextField
          label="Reference number"
          value={view.draft.referenceNumber}
          onChange={(value) => view.updateField("referenceNumber", value)}
        />
      </div>
    </WillCard>
  );
}

export function WillSolicitorCard({ view }: { view: WillDetailsViewModel }) {
  return (
    <WillCard>
      <WillSectionHeading
        icon="briefcase"
        title="Solicitor or firm"
        description="Record who prepared or holds information about the will, if applicable."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField
          label="Solicitor name"
          value={view.draft.solicitorName}
          onChange={(value) => view.updateField("solicitorName", value)}
          autoComplete="name"
        />
        <TextField
          label="Firm"
          value={view.draft.solicitorFirm}
          onChange={(value) => view.updateField("solicitorFirm", value)}
        />
        <TextField
          label="Telephone"
          value={view.draft.solicitorPhone}
          onChange={(value) => view.updateField("solicitorPhone", value)}
          type="tel"
          autoComplete="tel"
        />
        <TextField
          label="Email"
          value={view.draft.solicitorEmail}
          onChange={(value) => view.updateField("solicitorEmail", value)}
          type="email"
          autoComplete="email"
        />
      </div>
    </WillCard>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextField label={label} value={value} onChange={onChange} type="date" />
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#20352a]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={willFieldClass}
        autoComplete={autoComplete}
      />
    </label>
  );
}
