import type { Dispatch, FormEvent, SetStateAction } from "react";

import {
  FieldGroup,
  SubmitButton,
  TextField,
  fieldClass,
} from "@/components/garage/VehicleProfileFields";
import type { VehicleDraft } from "@/components/garage/vehicle-profile-model";
import type { VehicleOwnershipStatus } from "@/lib/vehicle-records";

export function VehicleDetailsForm({
  draft,
  setDraft,
  onSubmit,
}: {
  draft: VehicleDraft;
  setDraft: Dispatch<SetStateAction<VehicleDraft>>;
  onSubmit: (event: FormEvent) => void;
}) {
  const set = <K extends keyof VehicleDraft>(key: K, value: VehicleDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FieldGroup title="Identity">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Nickname" value={draft.nickname} onChange={(value) => set("nickname", value)} />
          <TextField label="Registration" value={draft.registration} onChange={(value) => set("registration", value.toUpperCase())} />
          <TextField label="Make" value={draft.make} onChange={(value) => set("make", value)} />
          <TextField label="Model" value={draft.model} onChange={(value) => set("model", value)} />
          <TextField label="Variant" value={draft.variant} onChange={(value) => set("variant", value)} />
          <TextField label="Year" type="number" value={draft.year} onChange={(value) => set("year", value)} />
          <TextField label="VIN / chassis number" value={draft.vin} onChange={(value) => set("vin", value.toUpperCase())} />
          <TextField label="Colour" value={draft.colour} onChange={(value) => set("colour", value)} />
          <TextField label="Fuel type" value={draft.fuelType} onChange={(value) => set("fuelType", value)} />
          <TextField label="Transmission" value={draft.transmission} onChange={(value) => set("transmission", value)} />
          <TextField label="Drivetrain" value={draft.drivetrain} onChange={(value) => set("drivetrain", value)} />
          <TextField label="Engine size" value={draft.engineSize} onChange={(value) => set("engineSize", value)} />
          <TextField label="Category / body type" value={draft.category} onChange={(value) => set("category", value)} />
          <TextField label="Seating capacity" type="number" value={draft.seatingCapacity} onChange={(value) => set("seatingCapacity", value)} />
        </div>
      </FieldGroup>

      <FieldGroup title="Ownership">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Ownership status
            <select
              value={draft.ownershipStatus}
              onChange={(event) => set("ownershipStatus", event.target.value as VehicleOwnershipStatus)}
              className={fieldClass}
            >
              <option value="unknown">Not recorded</option>
              <option value="owned">Owned</option>
              <option value="financed">Financed</option>
              <option value="leased">Leased</option>
              <option value="company">Company vehicle</option>
              <option value="other">Other</option>
            </select>
          </label>
          <TextField label="Registered keeper" value={draft.keeperName} onChange={(value) => set("keeperName", value)} />
          <TextField label="Purchase date" type="date" value={draft.purchaseDate} onChange={(value) => set("purchaseDate", value)} />
          <TextField label="Purchase price" type="number" value={draft.purchasePrice} onChange={(value) => set("purchasePrice", value)} />
          <TextField label="Current value" type="number" value={draft.currentValue} onChange={(value) => set("currentValue", value)} />
          <TextField label="Value checked on" type="date" value={draft.currentValueUpdatedAt} onChange={(value) => set("currentValueUpdatedAt", value)} />
        </div>
      </FieldGroup>
      <SubmitButton label="Save vehicle details" />
    </form>
  );
}
