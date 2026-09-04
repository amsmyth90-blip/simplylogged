import type { GarageVehicle } from "@diarydock/vehicles";

import { garageDate, garageMileage, garageMoney } from "./garage-format";

export type GarageTab = "overview" | "services" | "costs" | "notes";

export function GarageRecords({
  tab,
  vehicle,
}: {
  tab: GarageTab;
  vehicle: GarageVehicle;
}) {
  if (tab === "services") {
    return (
      <section className="garage-panel">
        <header>
          <div>
            <p>Maintenance history</p>
            <h2>Services & repairs</h2>
          </div>
          <span>{vehicle.services.length}</span>
        </header>
        <div className="garage-record-list">
          {vehicle.services.map((item) => (
            <article key={item.id}>
              <span className="garage-record-icon">
                {item.kind === "repair"
                  ? "R"
                  : item.kind === "inspection"
                    ? "I"
                    : "S"}
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>
                  {garageDate(item.date)}
                  {item.provider ? ` · ${item.provider}` : ""}
                </small>
                {item.notes ? <p>{item.notes}</p> : null}
              </div>
              <aside>
                <b>{garageMoney(item.cost)}</b>
                <small>{garageMileage(item.mileage)}</small>
              </aside>
            </article>
          ))}
          {!vehicle.services.length ? (
            <p className="garage-empty">
              No service or repair records have been added.
            </p>
          ) : null}
        </div>
      </section>
    );
  }
  if (tab === "costs") {
    return (
      <section className="garage-panel">
        <header>
          <div>
            <p>Running costs</p>
            <h2>Expenses</h2>
          </div>
          <span>{garageMoney(vehicle.totalSpend)}</span>
        </header>
        <div className="garage-record-list">
          {vehicle.expenses.map((item) => (
            <article key={item.id}>
              <span className="garage-record-icon">£</span>
              <div>
                <strong>{item.title}</strong>
                <small>
                  {item.category} · {garageDate(item.date)}
                  {item.provider ? ` · ${item.provider}` : ""}
                </small>
                {item.notes ? <p>{item.notes}</p> : null}
              </div>
              <aside>
                <b>{garageMoney(item.amount)}</b>
              </aside>
            </article>
          ))}
          {!vehicle.expenses.length ? (
            <p className="garage-empty">No vehicle expenses have been added.</p>
          ) : null}
        </div>
      </section>
    );
  }
  return (
    <section className="garage-panel">
      <header>
        <div>
          <p>Useful details</p>
          <h2>Vehicle notes</h2>
        </div>
        <span>{vehicle.notes.length}</span>
      </header>
      <div className="garage-note-grid">
        {vehicle.notes.map((item) => (
          <article key={item.id}>
            <small>{garageDate(item.updatedAt.slice(0, 10))}</small>
            <strong>{item.title}</strong>
            <p>{item.content}</p>
          </article>
        ))}
        {!vehicle.notes.length ? (
          <p className="garage-empty">
            No notes have been added for this vehicle.
          </p>
        ) : null}
      </div>
    </section>
  );
}
