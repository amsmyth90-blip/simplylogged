import { useState } from "react";

import { HealthCard } from "./BedroomSectionUi";
import type { BedroomSectionController } from "./useBedroomSection";

export function BedroomCarePreferences({
  bedroom,
}: {
  bedroom: BedroomSectionController;
}) {
  const [value, setValue] = useState(bedroom.health.carePreferences);
  return (
    <HealthCard>
      <h2 className="font-serif text-2xl">Your own words</h2>
      <p className="mt-1 text-xs leading-5 text-[#667068]">
        This private note does not replace a legally reviewed advance decision,
        power of attorney or instructions from a clinician.
      </p>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="form-control mt-4 min-h-56 resize-y"
        placeholder="Record preferences you want to remember or discuss with a qualified professional…"
      />
      <button
        type="button"
        onClick={() => {
          bedroom.updateState((current) => ({
            ...current,
            health: {
              ...current.health,
              carePreferences: value,
              updatedAt: new Date().toISOString(),
            },
          }));
          bedroom.setMessage("Care preferences saved privately.");
        }}
        className="mt-4 min-h-12 rounded-2xl bg-[#315443] px-5 text-sm font-semibold text-white"
      >
        Save preferences
      </button>
    </HealthCard>
  );
}
