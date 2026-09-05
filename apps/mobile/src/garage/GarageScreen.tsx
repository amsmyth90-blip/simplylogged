import { useEffect, useMemo, useState } from "react";

import type { GarageSnapshot } from "@diarydock/vehicles";
import type { OfflineStore } from "@diarydock/offline-store";

import garageImage from "../../../../public/images/pages/garage-folio-hero-v5.webp";
import {
  MobileBottomNav,
  type MobileDestination,
} from "@mobile/components/MobileBottomNav";
import { GarageOverview } from "./GarageOverview";
import { GarageQuickAdd } from "./GarageQuickAdd";
import { GarageRecords, type GarageTab } from "./GarageRecords";
import { GarageVehicleEditor } from "./GarageVehicleEditor";
import { useGarage } from "./use-garage";

type Props = {
  accessToken: string;
  disableOnline?: boolean;
  initialTab?: GarageTab;
  initialSnapshot?: GarageSnapshot;
  store: OfflineStore;
  syncStatus: string;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onScan: (roomName: string) => void;
};

const tabs: Array<{ id: GarageTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "services", label: "Service" },
  { id: "costs", label: "Costs" },
  { id: "notes", label: "Notes" },
];

export function GarageScreen(props: Props) {
  const garage = useGarage(props);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState<GarageTab>(props.initialTab ?? "overview");
  const [addingVehicle, setAddingVehicle] = useState(false);
  const vehicles = useMemo(
    () => garage.snapshot?.vehicles ?? [],
    [garage.snapshot],
  );

  useEffect(() => {
    if (!vehicles.length) {
      setSelectedId("");
      return;
    }
    if (!vehicles.some((item) => item.id === selectedId))
      setSelectedId(vehicles[0]!.id);
  }, [selectedId, vehicles]);

  const vehicle =
    vehicles.find((item) => item.id === selectedId) ?? vehicles[0];

  return (
    <main className="garage-screen">
      <header className="garage-header">
        <button
          type="button"
          onClick={props.onBack}
          aria-label="Back to the estate map"
        >
          ‹
        </button>
        <div>
          <strong>Garage</strong>
          <small>Vehicles & running costs</small>
        </div>
        <span className={garage.source === "NETWORK" ? "is-live" : "is-cached"}>
          {garage.source === "NETWORK" ? "Live" : "Offline copy"}
        </span>
      </header>

      <section
        className="garage-hero"
        style={{ backgroundImage: `url(${garageImage})` }}
      >
        <div />
        <article>
          <p>Everything road-ready</p>
          <h1>{vehicle?.displayName ?? "Your vehicles"}</h1>
          <span>
            {vehicle
              ? [vehicle.year, vehicle.make, vehicle.model]
                  .filter(Boolean)
                  .join(" · ")
              : "Keep legal dates, maintenance and costs together."}
          </span>
        </article>
      </section>

      <section className="garage-sheet">
        {garage.message ? (
          <p className="garage-message" role="status">
            {garage.message}
          </p>
        ) : null}
        {garage.loading && !garage.snapshot ? (
          <p className="garage-message">Opening your Garage securely…</p>
        ) : null}
        {vehicle ? (
          <>
            <div className="garage-toolbar">
              <label>
                <span>Vehicle</span>
                <select
                  value={vehicle.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  {vehicles.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => setAddingVehicle(true)}>
                ＋ Vehicle
              </button>
              <button type="button" onClick={() => props.onScan("Garage")}>
                ＋ Scan
              </button>
            </div>
            <div
              className="garage-tabs"
              role="tablist"
              aria-label="Vehicle records"
            >
              {tabs.map((item) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={tab === item.id ? "is-active" : ""}
                  onClick={() => setTab(item.id)}
                  key={item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {tab === "overview" ? (
              <GarageOverview vehicle={vehicle} />
            ) : (
              <GarageRecords tab={tab} vehicle={vehicle} />
            )}
            <section className="garage-file-link">
              <span>▤</span>
              <div>
                <strong>Vehicle documents</strong>
                <small>
                  {vehicle.documentCount} linked · policies, receipts and
                  certificates
                </small>
              </div>
              <button type="button" onClick={() => props.onNavigate("FILES")}>
                Open
              </button>
            </section>
            <GarageQuickAdd
              busy={garage.busy}
              online={garage.online}
              vehicleId={vehicle.id}
              mutate={garage.mutate}
            />
          </>
        ) : garage.snapshot ? (
          <section className="garage-panel garage-no-vehicles">
            <span>◇</span>
            <h2>No vehicles yet</h2>
            <p>
              Add the first vehicle here, then keep its dates, maintenance,
              costs and documents together.
            </p>
            <button className="garage-save" type="button"
              disabled={garage.busy || !garage.online}
              onClick={() => setAddingVehicle(true)}>Add your first vehicle</button>
            {!garage.online ? <p className="garage-offline-notice">
              Your encrypted Garage remains available offline. Connect to add a vehicle.
            </p> : null}
          </section>
        ) : null}
      </section>
      {addingVehicle ? <GarageVehicleEditor busy={garage.busy} online={garage.online}
        onCancel={() => setAddingVehicle(false)} onSave={garage.mutate}
        onSaved={(vehicleId) => { setSelectedId(vehicleId); setAddingVehicle(false); }} /> : null}
      <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
    </main>
  );
}
