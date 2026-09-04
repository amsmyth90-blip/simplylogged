import { useState, type FormEvent } from "react";

import type { GarageDraftMutation } from "./garage-client";

type AddVehicle = Extract<GarageDraftMutation, { operation: "ADD_VEHICLE" }>;
type Props = {
  busy: boolean;
  online: boolean;
  onCancel: () => void;
  onSave: (mutation: AddVehicle) => Promise<boolean>;
  onSaved: (vehicleId: string) => void;
};

export function GarageVehicleEditor(props: Props) {
  const [vehicleId] = useState(() => crypto.randomUUID());
  const [nickname, setNickname] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [registration, setRegistration] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!nickname.trim() && !make.trim() && !model.trim()) {
      setError("Add a vehicle name, make or model.");
      return;
    }
    const parsedYear = year.trim() ? Number(year) : null;
    if (parsedYear !== null && (!Number.isInteger(parsedYear)
      || parsedYear < 1886 || parsedYear > 2200)) {
      setError("Enter a valid vehicle year.");
      return;
    }
    setError(null);
    const saved = await props.onSave({
      operation: "ADD_VEHICLE",
      vehicleId,
      nickname: nickname.trim(),
      make: make.trim(),
      model: model.trim(),
      registration: registration.trim().toUpperCase(),
      year: parsedYear,
    });
    if (saved) props.onSaved(vehicleId);
  }

  return (
    <div className="garage-editor-backdrop" role="presentation">
      <section className="garage-vehicle-editor" role="dialog" aria-modal="true"
        aria-labelledby="garage-vehicle-title">
        <header><div><p>Vehicle profile</p><h2 id="garage-vehicle-title">Add a vehicle</h2></div>
          <button type="button" onClick={props.onCancel} aria-label="Close vehicle editor">×</button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <label className="garage-wide-field"><span>Vehicle name</span><input autoFocus
            maxLength={160} value={nickname} disabled={props.busy}
            placeholder="Family car" onChange={(event) => setNickname(event.target.value)} /></label>
          <label><span>Make</span><input maxLength={100} value={make} disabled={props.busy}
            placeholder="Volvo" onChange={(event) => setMake(event.target.value)} /></label>
          <label><span>Model</span><input maxLength={100} value={model} disabled={props.busy}
            placeholder="XC40" onChange={(event) => setModel(event.target.value)} /></label>
          <label><span>Registration</span><input maxLength={32} value={registration}
            disabled={props.busy} autoCapitalize="characters" placeholder="AB12 CDE"
            onChange={(event) => setRegistration(event.target.value.toUpperCase())} /></label>
          <label><span>Year</span><input type="number" min="1886" max="2200"
            inputMode="numeric" value={year} disabled={props.busy}
            onChange={(event) => setYear(event.target.value)} /></label>
          {!props.online ? <p className="garage-offline-notice">Connect to add this vehicle securely.</p> : null}
          {error ? <p className="garage-editor-error" role="alert">{error}</p> : null}
          <footer><button type="button" onClick={props.onCancel}>Cancel</button>
            <button type="submit" disabled={props.busy || !props.online}>
              {props.busy ? "Saving securely…" : "Add vehicle"}
            </button></footer>
        </form>
      </section>
    </div>
  );
}
