import { useState } from "react";

import type { OfflineStore } from "@diarydock/offline-store";
import type { TravelSnapshot, TravelTrip, TravelTripDetails } from "@diarydock/travel";

import drivewayImage from "../../../../public/images/pages/driveway-hero.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { useDocuments } from "@mobile/files/use-documents";
import { TripDetail } from "./TripDetail";
import { TripDirectory } from "./TripDirectory";
import { TripEditor } from "./TripEditor";
import { DrivewayFeatureScreen } from "./DrivewayFeatureScreen";
import { useTravel } from "./use-travel";

type Props = {
  accessToken: string;
  disableOnline?: boolean;
  initialView?: DrivewayView;
  initialSnapshot?: TravelSnapshot;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onScan: (roomName: string) => void;
};

export type DrivewayView = "trips" | "travel-checklist" | "parking-permits";

export function DrivewayScreen(props: Props) {
  const travel = useTravel(props);
  const files = useDocuments(props.store, props.syncStatus, props.synchronize);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TravelTrip | null | undefined>();
  const selected = travel.snapshot?.trips.find((trip) => trip.id === selectedId) ?? null;
  const checklist = selected ? travel.snapshot?.checklist.filter((item) => item.tripId === selected.id)
    ?? [] : [];

  async function save(details: TravelTripDetails) {
    return travel.mutate({ operation: "SAVE_TRIP", tripId: editing?.id ?? null, trip: details });
  }

  async function remove(trip: TravelTrip) {
    if (!window.confirm(`Delete ${trip.title}? Linked files will remain in All Files.`)) return false;
    const removed = await travel.mutate({ operation: "DELETE_TRIP", tripId: trip.id });
    if (removed) setSelectedId(null);
    return removed;
  }

  if (!selected && props.initialView && props.initialView !== "trips") return <main
    className="travel-screen travel-feature-screen">
    <DrivewayFeatureScreen busy={travel.busy} online={travel.online}
      snapshot={travel.snapshot} view={props.initialView} mutate={travel.mutate}
      onBack={props.onBack} />
    <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
  </main>;

  return <main className="travel-screen">
    {selected ? <TripDetail busy={travel.busy} checklist={checklist} documents={files.documents}
      mutate={travel.mutate}
      online={travel.online} onBack={() => setSelectedId(null)} onEdit={() => setEditing(selected)}
      onNavigate={props.onNavigate} onScan={() => props.onScan("Driveway")}
      policies={travel.snapshot?.policies ?? []} trip={selected} /> : <>
      <header className="travel-header" style={{ backgroundImage: `url(${drivewayImage})` }}>
        <div className="travel-header-shade" />
        <button type="button" onClick={props.onBack} aria-label="Back to the estate map">‹</button>
        <span className={travel.online ? "is-online" : "is-offline"}>{
          travel.online ? "Ready" : "Offline copy"}</span>
        <article><p>Travel & access</p><h1>Driveway</h1>
          <strong>Trips and travel preparation, kept simple.</strong></article>
      </header>
      <section className="travel-sheet">
        {travel.message ? <p className="travel-message" role="status">{travel.message}</p> : null}
        {travel.loading && !travel.snapshot ? <p className="travel-message">Opening your trips securely…</p> : null}
        {travel.snapshot ? <TripDirectory online={travel.online} snapshot={travel.snapshot}
          onCreate={() => setEditing(null)} onOpen={(trip) => setSelectedId(trip.id)} /> : null}
        <button className="travel-scan" type="button" onClick={() => props.onScan("Driveway")}>
          ＋ Scan into Driveway</button>
      </section>
    </>}
    {editing !== undefined ? <TripEditor busy={travel.busy} trip={editing}
      onCancel={() => setEditing(undefined)} onDelete={remove} onSave={save} /> : null}
    <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
  </main>;
}
