import { useState } from "react";

import type { TravelSnapshot } from "@diarydock/travel";

import { MobileIcon } from "@mobile/components/MobileIcon";
import { TripChecklist } from "./TripChecklist";
import type { TravelDraftMutation } from "./travel-client";
import type { DrivewayView } from "./DrivewayScreen";

export function DrivewayFeatureScreen(props: {
  busy: boolean;
  mutate: (mutation: TravelDraftMutation) => Promise<boolean>;
  online: boolean;
  snapshot: TravelSnapshot | null;
  view: Exclude<DrivewayView, "trips">;
  onBack: () => void;
}) {
  const [tripId, setTripId] = useState(props.snapshot?.trips[0]?.id ?? "");
  const trip = props.snapshot?.trips.find((item) => item.id === tripId);
  return <div className="driveway-feature-shell"><header><button type="button"
    onClick={props.onBack} aria-label="Back to Driveway"><MobileIcon name="arrow-left" /></button>
    <span><MobileIcon name={props.view === "travel-checklist" ? "check" : "briefcase"} /></span>
    <div><small>Driveway</small><h1>{props.view === "travel-checklist"
      ? "Travel Checklist" : "Parking & Permits"}</h1></div></header>
    {props.view === "travel-checklist" ? <>
      <p className="driveway-feature-lead">Pack smarter. Travel lighter. Worry less.</p>
      <label className="driveway-trip-picker"><span>Checklist for</span><select value={tripId}
        onChange={(event) => setTripId(event.target.value)}>
        {props.snapshot?.trips.map((item) => <option value={item.id} key={item.id}>
          {item.title} · {item.destination}</option>)}</select></label>
      {trip ? <TripChecklist busy={props.busy} online={props.online} tripId={trip.id}
        items={props.snapshot?.checklist.filter((item) => item.tripId === trip.id) ?? []}
        mutate={props.mutate} /> : <section className="driveway-feature-empty"><h2>No trip selected</h2>
        <p>Create a trip in My Trips to give it a private packing checklist.</p></section>}
    </> : <PermitPlaceholder />}
  </div>;
}

function PermitPlaceholder() {
  const items = ["Visitor parking", "Permit details", "Access codes", "Restrictions"];
  return <section className="driveway-permit-card"><span><MobileIcon name="briefcase" /></span>
    <h2>A calm place to begin</h2><p>Organise visitor parking instructions, permits and access information.</p>
    <div>{items.map((item) => <strong key={item}><MobileIcon name="check" />{item}</strong>)}</div>
    <aside><b>Ready for the next design step</b><p>This section is connected from the Driveway.
      Its detailed tools and layout can now be designed without changing the room scene.</p></aside>
  </section>;
}
