import { ModalShell } from "@/components/ModalShell";

import { HealthField } from "./BedroomSectionUi";
import type { BedroomSectionController } from "./useBedroomSection";

export function BedroomRecordModal({
  bedroom,
}: {
  bedroom: BedroomSectionController;
}) {
  const update = (field: keyof typeof bedroom.draft, value: string | boolean) =>
    bedroom.setDraft((draft) => ({ ...draft, [field]: value }));
  const { section } = bedroom;

  return (
    <ModalShell
      open={bedroom.adding && bedroom.addable}
      title={`Add to ${bedroom.meta.title}`}
      subtitle="Enter only information you are comfortable recording. Check it against your source before relying on it."
      onClose={() => bedroom.setAdding(false)}
    >
      <form onSubmit={bedroom.saveRecord} className="space-y-4">
        <HealthField label={titleLabel(section)}>
          <input
            required
            value={bedroom.draft.title}
            onChange={(event) => update("title", event.target.value)}
            className="form-control"
          />
        </HealthField>
        <div className="grid gap-4 sm:grid-cols-2">
          <HealthField label={secondaryLabel(section)}>
            <input
              value={bedroom.draft.secondary}
              inputMode={section === "wellbeing" ? "decimal" : undefined}
              onChange={(event) => update("secondary", event.target.value)}
              className="form-control"
            />
          </HealthField>
          <HealthField label={detailLabel(section)}>
            <input
              value={bedroom.draft.detail}
              onChange={(event) => update("detail", event.target.value)}
              className="form-control"
            />
          </HealthField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <HealthField
            label={section === "medications" ? "Review date" : "Date"}
          >
            <input
              type="date"
              value={bedroom.draft.date}
              onChange={(event) => update("date", event.target.value)}
              className="form-control"
            />
          </HealthField>
          {section === "appointments" ? (
            <HealthField label="Time">
              <input
                type="time"
                value={bedroom.draft.time}
                onChange={(event) => update("time", event.target.value)}
                className="form-control"
              />
            </HealthField>
          ) : null}
        </div>
        <HealthField label="Notes">
          <textarea
            value={bedroom.draft.notes}
            onChange={(event) => update("notes", event.target.value)}
            className="form-control min-h-24 resize-y"
          />
        </HealthField>
        {section === "appointments" ? (
          <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#f7f5ef] px-3 text-xs">
            <input
              type="checkbox"
              checked={bedroom.draft.makeReminder}
              onChange={(event) => update("makeReminder", event.target.checked)}
              className="h-4 w-4"
            />
            <span>Create a Reminder after I save this appointment</span>
          </label>
        ) : null}
        {bedroom.message ? (
          <p className="text-xs text-[#8a5149]">{bedroom.message}</p>
        ) : null}
        <button
          type="submit"
          className="min-h-12 w-full rounded-2xl bg-[#315443] text-sm font-semibold text-white"
        >
          Save checked information
        </button>
      </form>
    </ModalShell>
  );
}

function titleLabel(section: BedroomSectionController["section"]) {
  if (section === "allergies") return "Allergen";
  if (section === "medications") return "Medication name";
  return "Name or title";
}

function secondaryLabel(section: BedroomSectionController["section"]) {
  if (section === "medications") return "Dose";
  if (section === "wellbeing") return "Sleep hours (optional)";
  return "Provider or detail";
}

function detailLabel(section: BedroomSectionController["section"]) {
  if (section === "appointments") return "Location";
  if (section === "medications") return "Frequency";
  if (section === "allergies") return "Severity";
  if (section === "conditions") return "Status";
  if (section === "dental-optical") return "Type (dental or optical)";
  if (section === "vaccinations") return "Next date (optional)";
  return "Additional detail";
}
