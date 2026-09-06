import type { GarageVehicle } from "@diarydock/vehicles";

import {
  dateStatus,
  garageDate,
  garageMileage,
  garageMoney,
} from "./garage-format";

const dates = [
  ["MOT", "motDueDate"],
  ["Road tax", "taxDueDate"],
  ["Insurance", "insuranceRenewalDate"],
  ["Next service", "nextServiceDate"],
  ["Breakdown cover", "breakdownRenewalDate"],
] as const;

export function GarageOverview({ vehicle, view = "profile" }: {
  vehicle: GarageVehicle;
  view?: "profile" | "mot-tax" | "insurance";
}) {
  const visibleDates = view === "mot-tax" ? dates.slice(0, 2)
    : view === "insurance" ? [dates[2], dates[4]] : dates;
  return (
    <>
      {view === "profile" ? <section className="garage-summary-grid" aria-label="Vehicle summary">
        <article>
          <small>Registration</small>
          <strong>{vehicle.registration || "Not recorded"}</strong>
        </article>
        <article>
          <small>Current mileage</small>
          <strong>{garageMileage(vehicle.mileage)}</strong>
        </article>
        <article>
          <small>Recorded costs</small>
          <strong>{garageMoney(vehicle.totalSpend)}</strong>
        </article>
        <article>
          <small>Documents</small>
          <strong>{vehicle.documentCount.toLocaleString("en-GB")}</strong>
        </article>
      </section> : null}

      <section className="garage-panel">
        <header>
          <div>
            <p>Stay ahead</p>
            <h2>{view === "mot-tax" ? "MOT & road tax" : view === "insurance"
              ? "Insurance & breakdown cover" : "Key dates"}</h2>
          </div>
        </header>
        <div className="garage-date-list">
          {visibleDates.map(([label, key]) => (
            <article key={key}>
              <span
                className={`garage-date-mark is-${dateStatus(vehicle[key])}`}
                aria-hidden="true"
              />
              <div>
                <strong>{label}</strong>
                <small>{garageDate(vehicle[key])}</small>
              </div>
              <b className={`is-${dateStatus(vehicle[key])}`}>
                {dateStatus(vehicle[key])}
              </b>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
