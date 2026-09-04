import { useState } from "react";

import type { TravelChecklistItem, TravelTrip } from "@diarydock/travel";

import type { TravelDraftMutation } from "./travel-client";
import { shareTripPack } from "./trip-pack";

export function TripActions({ busy, checklist, mutate, onDuplicated, online, trip }: {
  busy: boolean; checklist: TravelChecklistItem[];
  mutate: (value: TravelDraftMutation) => Promise<boolean>;
  onDuplicated: () => void;
  online: boolean; trip: TravelTrip;
}) {
  const [message, setMessage] = useState("");
  async function share() {
    try {
      await shareTripPack(trip, checklist);
      setMessage("Offline Trip Pack opened securely without identity documents.");
    } catch {
      setMessage("The Offline Trip Pack could not be opened on this device.");
    }
  }
  async function duplicate() {
    if (await mutate({ operation: "DUPLICATE_TRIP", tripId: trip.id })) onDuplicated();
  }
  return <section className="travel-section-panel"><header><div><p>Trip tools</p>
    <h2>Private offline pack</h2></div></header>
    <div className="travel-action-grid">
      <button type="button" onClick={() => void share()}><strong>Share Offline Trip Pack</strong>
        <span>Creates a local text summary without identity documents.</span></button>
      <button type="button" disabled={!online || busy} onClick={() => void duplicate()}>
        <strong>Duplicate trip structure</strong><span>Copies travellers, notes and checklist
          structure—not dates, bookings, documents, payments or insurance.</span></button>
    </div>
    {message ? <p className="travel-privacy-note" role="status">{message}</p> : null}
  </section>;
}
