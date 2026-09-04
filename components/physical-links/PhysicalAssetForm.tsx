import type { ReactNode } from "react";

import type { PhysicalLinksController } from "./usePhysicalLinks";

const controlStyles = [
  "block",
  "[&_input]:w-full [&_input]:rounded-xl [&_input]:border",
  "[&_input]:border-[#315443]/12 [&_input]:bg-[#f8f6f0]",
  "[&_input]:px-3 [&_input]:py-3 [&_input]:font-normal",
  "[&_select]:w-full [&_select]:rounded-xl [&_select]:border",
  "[&_select]:border-[#315443]/12 [&_select]:bg-[#f8f6f0]",
  "[&_select]:px-3 [&_select]:py-3 [&_select]:font-normal",
  "[&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:resize-y",
  "[&_textarea]:rounded-xl [&_textarea]:border",
  "[&_textarea]:border-[#315443]/12 [&_textarea]:bg-[#f8f6f0]",
  "[&_textarea]:px-3 [&_textarea]:py-3 [&_textarea]:font-normal",
].join(" ");

export function PhysicalAssetForm({
  physical,
}: {
  physical: PhysicalLinksController;
}) {
  const update = (field: keyof typeof physical.draft, value: string) =>
    physical.setDraft((draft) => ({ ...draft, [field]: value }));

  return (
    <section className="mt-5 rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-sm">
      <h2 className="font-serif text-2xl">Add an item</h2>
      <p className="mt-1 text-sm text-[#667068]">
        Start with the basics. More details can be added later.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PhysicalField label="Name">
          <input
            value={physical.draft.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="e.g. Kitchen boiler"
          />
        </PhysicalField>
        <PhysicalField label="Type">
          <select
            value={physical.draft.category}
            onChange={(event) => update("category", event.target.value)}
          >
            <option value="APPLIANCE">Appliance</option>
            <option value="BOILER">Boiler</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="OTHER">Other</option>
          </select>
        </PhysicalField>
        <PhysicalField label="Location">
          <input
            value={physical.draft.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder="e.g. Utility room"
          />
        </PhysicalField>
        <PhysicalField label="Maker and model">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={physical.draft.manufacturer}
              onChange={(event) => update("manufacturer", event.target.value)}
              placeholder="Maker"
            />
            <input
              value={physical.draft.model}
              onChange={(event) => update("model", event.target.value)}
              placeholder="Model"
            />
          </div>
        </PhysicalField>
        <PhysicalField label="Serial number">
          <input
            value={physical.draft.serialNumber}
            onChange={(event) => update("serialNumber", event.target.value)}
            placeholder="Only the last four characters are saved"
          />
        </PhysicalField>
        <PhysicalField label="Warranty ends">
          <input
            type="date"
            value={physical.draft.warrantyDueAt}
            onChange={(event) => update("warrantyDueAt", event.target.value)}
          />
        </PhysicalField>
        <PhysicalField label="Next service">
          <input type="date" value={physical.draft.nextServiceAt}
            onChange={(event) => update("nextServiceAt", event.target.value)} />
        </PhysicalField>
        <PhysicalField label="Maintenance notes">
          <textarea value={physical.draft.maintenanceNotes} maxLength={1000}
            onChange={(event) => update("maintenanceNotes", event.target.value)}
            placeholder="Optional service or care notes" />
        </PhysicalField>
      </div>
      <button
        type="button"
        disabled={physical.busy || !physical.draft.name.trim()}
        onClick={() => void physical.createAsset()}
        className="mt-5 min-h-12 rounded-2xl bg-[#315443] px-5 text-sm font-semibold text-white disabled:opacity-40"
      >
        Save item
      </button>
    </section>
  );
}

function PhysicalField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-[#20352a]">
      <span>{label}</span>
      <span className={controlStyles}>
        {children}
      </span>
    </label>
  );
}
