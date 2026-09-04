import { useState, type FormEvent } from "react";

import {
  garageExpenseCategories,
  type GarageService,
} from "@diarydock/vehicles";

import type { GarageDraftMutation } from "./garage-client";

type QuickKind = "expense" | "service" | "mileage" | "note";
type Props = {
  busy: boolean;
  online: boolean;
  vehicleId: string;
  mutate: (mutation: GarageDraftMutation) => Promise<boolean>;
};

const today = () => new Date().toISOString().slice(0, 10);
const optionalNumber = (value: string) => (value.trim() ? Number(value) : null);

export function GarageQuickAdd({ busy, online, vehicleId, mutate }: Props) {
  const [kind, setKind] = useState<QuickKind>("expense");
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] =
    useState<(typeof garageExpenseCategories)[number]>("Other");
  const [serviceKind, setServiceKind] =
    useState<GarageService["kind"]>("service");

  function reset() {
    setTitle("");
    setProvider("");
    setAmount("");
    setMileage("");
    setNotes("");
    setDate(today());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    let mutation: GarageDraftMutation;
    if (kind === "expense") {
      mutation = {
        operation: "ADD_EXPENSE",
        vehicleId,
        category,
        title,
        provider,
        amount: Number(amount),
        date,
        notes,
      };
    } else if (kind === "service") {
      mutation = {
        operation: "ADD_SERVICE",
        vehicleId,
        kind: serviceKind,
        title,
        provider,
        date,
        mileage: optionalNumber(mileage),
        cost: optionalNumber(amount),
        notes,
      };
    } else if (kind === "mileage") {
      mutation = {
        operation: "ADD_MILEAGE",
        vehicleId,
        mileage: Number(mileage),
        recordedAt: date,
        note: notes,
      };
    } else {
      mutation = { operation: "ADD_NOTE", vehicleId, title, content: notes };
    }
    if (await mutate(mutation)) reset();
  }

  const valid =
    kind === "mileage"
      ? mileage.trim() && Number.isFinite(Number(mileage)) && Boolean(date)
      : kind === "note"
        ? title.trim() && notes.trim()
        : kind === "expense"
          ? title.trim() &&
            amount.trim() &&
            Number.isFinite(Number(amount)) &&
            Boolean(date)
          : title.trim() && Boolean(date);

  return (
    <section className="garage-panel garage-quick-add">
      <header>
        <div>
          <p>Secure update</p>
          <h2>Quick add</h2>
        </div>
      </header>
      <div className="garage-add-tabs" role="tablist" aria-label="Record type">
        {(["expense", "service", "mileage", "note"] as const).map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={kind === item}
            className={kind === item ? "is-active" : ""}
            onClick={() => setKind(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <form onSubmit={(event) => void submit(event)}>
        {!online ? (
          <p className="garage-offline-notice">
            Your encrypted Garage remains available offline. Connect to save a
            new record.
          </p>
        ) : null}
        {kind !== "mileage" ? (
          <label>
            <span>Title</span>
            <input
              required
              maxLength={160}
              value={title}
              disabled={busy || !online}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                kind === "note"
                  ? "Useful vehicle information"
                  : "What was this for?"
              }
            />
          </label>
        ) : null}
        {kind === "expense" ? (
          <label>
            <span>Category</span>
            <select
              value={category}
              disabled={busy || !online}
              onChange={(event) =>
                setCategory(event.target.value as typeof category)
              }
            >
              {garageExpenseCategories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        ) : null}
        {kind === "service" ? (
          <label>
            <span>Type</span>
            <select
              value={serviceKind}
              disabled={busy || !online}
              onChange={(event) =>
                setServiceKind(event.target.value as GarageService["kind"])
              }
            >
              <option value="service">Service</option>
              <option value="repair">Repair</option>
              <option value="inspection">Inspection</option>
            </select>
          </label>
        ) : null}
        {kind === "expense" || kind === "service" ? (
          <label>
            <span>Provider</span>
            <input
              maxLength={160}
              value={provider}
              disabled={busy || !online}
              onChange={(event) => setProvider(event.target.value)}
              placeholder="Garage, insurer or retailer"
            />
          </label>
        ) : null}
        {kind !== "note" ? (
          <label>
            <span>Date</span>
            <input
              type="date"
              required
              value={date}
              disabled={busy || !online}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        ) : null}
        {kind === "expense" || kind === "service" ? (
          <label>
            <span>{kind === "expense" ? "Amount" : "Cost (optional)"}</span>
            <input
              type="number"
              min="0"
              max="10000000"
              step="0.01"
              required={kind === "expense"}
              value={amount}
              disabled={busy || !online}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
            />
          </label>
        ) : null}
        {kind === "mileage" || kind === "service" ? (
          <label>
            <span>{kind === "mileage" ? "Mileage" : "Mileage (optional)"}</span>
            <input
              type="number"
              min="0"
              max="10000000"
              required={kind === "mileage"}
              value={mileage}
              disabled={busy || !online}
              onChange={(event) => setMileage(event.target.value)}
              inputMode="numeric"
            />
          </label>
        ) : null}
        <label className="garage-wide-field">
          <span>{kind === "note" ? "Note" : "Details (optional)"}</span>
          <textarea
            required={kind === "note"}
            maxLength={kind === "note" ? 4000 : 2000}
            value={notes}
            disabled={busy || !online}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <button
          className="garage-save"
          type="submit"
          disabled={busy || !online || !valid}
        >
          {busy ? "Saving securely…" : "Save record"}
        </button>
      </form>
    </section>
  );
}
