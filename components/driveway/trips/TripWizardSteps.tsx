"use client";

import type { ReactNode } from "react";

import { tripTypes, type TripType } from "@/lib/trip-records";

import { tripFieldClass, type TripDraft } from "./trips-model";
import type { CreateTripWizardController } from "./useCreateTripWizard";

export function TripWizardStep({ controller }: { controller: CreateTripWizardController }) {
  if (controller.step === 1) return <DetailsStep controller={controller} />;
  if (controller.step === 2) return <TravellersStep controller={controller} />;
  if (controller.step === 3) return <TransportStep controller={controller} />;
  if (controller.step === 4) return <StayStep controller={controller} />;
  return <SetupStep controller={controller} />;
}

type Props = { controller: CreateTripWizardController };

function DetailsStep({ controller }: Props) {
  const { draft, set } = controller;
  return (
    <div className="space-y-4">
      <Field label="Trip title *"><input value={draft.title} onChange={event => set("title", event.target.value)} placeholder="For example, Summer in Rome" className={tripFieldClass} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Destination city"><input value={draft.destinationCity} onChange={event => set("destinationCity", event.target.value)} className={tripFieldClass} /></Field>
        <Field label="Country"><input value={draft.destinationCountry} onChange={event => set("destinationCountry", event.target.value)} className={tripFieldClass} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Departure"><input type="date" value={draft.startDate} onChange={event => set("startDate", event.target.value)} className={`${tripFieldClass} px-2`} /></Field>
        <Field label="Return"><input type="date" value={draft.endDate} onChange={event => set("endDate", event.target.value)} min={draft.startDate} className={`${tripFieldClass} px-2`} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Trip type"><select value={draft.tripType} onChange={event => set("tripType", event.target.value as TripType)} className={tripFieldClass}>{tripTypes.map(type => <option key={type}>{type}</option>)}</select></Field>
        <Field label="Timezone"><input value={draft.destinationTimezone} onChange={event => set("destinationTimezone", event.target.value)} className={tripFieldClass} /></Field>
      </div>
      <Field label="Notes"><textarea rows={3} value={draft.notes} onChange={event => set("notes", event.target.value)} className={`${tripFieldClass} py-3`} /></Field>
    </div>
  );
}

function TravellersStep({ controller }: Props) {
  const { draft, set, people, contacts } = controller;
  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-[#667068]">Link existing household members and contacts. DiaryDock does not copy their identity or health records into the trip.</p>
      {people.length ? (
        <ChoiceGroup title="Household">
          {people.map(person => (
            <Choice key={person.id} checked={draft.travellerIds.includes(person.id)} onChange={() => set("travellerIds", toggleId(draft.travellerIds, person.id))}>
              <span className="text-sm font-medium">{person.name}</span><span className="ml-auto text-[10px] text-[#667068]">{person.role}</span>
            </Choice>
          ))}
        </ChoiceGroup>
      ) : null}
      {contacts.length ? (
        <ChoiceGroup title="Contacts">
          {contacts.map(contact => (
            <Choice key={contact.id} checked={draft.contactIds.includes(contact.id)} onChange={() => set("contactIds", toggleId(draft.contactIds, contact.id))}>
              <span className="text-sm font-medium">{`${contact.firstName} ${contact.lastName}`.trim() || contact.company}</span>
            </Choice>
          ))}
        </ChoiceGroup>
      ) : null}
      <Field label="Other travellers"><input value={draft.otherTravellers} onChange={event => set("otherTravellers", event.target.value)} placeholder="Names separated by commas" className={tripFieldClass} /></Field>
    </div>
  );
}

function TransportStep({ controller }: Props) {
  const { draft, set } = controller;
  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-[#667068]">Transport is optional. Anything entered here remains unconfirmed until you set its status on the trip.</p>
      <Field label="Transport type">
        <select value={draft.transportType}
          onChange={event => set("transportType", event.target.value)}
          className={tripFieldClass}>
          <option value="">Skip for now</option>
          {["Flight", "Train", "Ferry", "Car hire", "Transfer", "Other"]
            .map(type => <option key={type}>{type}</option>)}
        </select>
      </Field>
      <Field label="Provider"><input value={draft.transportProvider} onChange={event => set("transportProvider", event.target.value)} className={tripFieldClass} /></Field>
      <Field label="Booking reference"><input value={draft.transportReference} onChange={event => set("transportReference", event.target.value)} className={tripFieldClass} /></Field>
    </div>
  );
}

function StayStep({ controller }: Props) {
  const { draft, set } = controller;
  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-[#667068]">Accommodation is optional and will not be marked confirmed automatically.</p>
      <Field label="Accommodation type">
        <select value={draft.accommodationType}
          onChange={event => set("accommodationType", event.target.value)}
          className={tripFieldClass}>
          <option value="">Skip for now</option>
          {[
            "Hotel", "Apartment", "Villa", "Hostel", "Campsite", "Cruise cabin",
            "Staying with family or friends", "Other",
          ].map(type => <option key={type}>{type}</option>)}
        </select>
      </Field>
      <Field label="Name or provider"><input value={draft.accommodationName} onChange={event => set("accommodationName", event.target.value)} className={tripFieldClass} /></Field>
      <Field label="Booking reference"><input value={draft.accommodationReference} onChange={event => set("accommodationReference", event.target.value)} className={tripFieldClass} /></Field>
    </div>
  );
}

function SetupStep({ controller }: Props) {
  const { draft, set } = controller;
  return (
    <div className="space-y-4">
      <Field label="Checklist template">
        <select value={draft.checklistTemplate} onChange={event => set("checklistTemplate", event.target.value as TripDraft["checklistTemplate"])} className={tripFieldClass}>
          <option value="none">Start with an empty checklist</option><option value="city">City break</option><option value="beach">Beach holiday</option><option value="family">Family trip</option><option value="business">Business trip</option>
        </select>
      </Field>
      <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-3">
        <input type="checkbox" checked={draft.createReminder} onChange={event => set("createReminder", event.target.checked)} />
        <span><span className="block text-sm font-semibold">Trip start reminder</span><span className="mt-0.5 block text-[10px] text-[#667068]">Creates one DiaryDock reminder linked to this trip.</span></span>
      </label>
      <div className="rounded-2xl border border-[#d8dfd2] bg-[#eef2e9] p-4 text-xs leading-5 text-[#4f6256]">Documents, insurance, itinerary and sharing are available after the trip is created. External collaborator access is not granted until DiaryDock has server-enforced trip permissions.</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-semibold text-[#3c5145]">{label}{children}</label>;
}

function ChoiceGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div><h3 className="text-xs font-bold uppercase tracking-wide text-[#667068]">{title}</h3><div className="mt-2 space-y-2">{children}</div></div>;
}

function Choice({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
  return <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-white px-3"><input type="checkbox" checked={checked} onChange={onChange} />{children}</label>;
}

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter(value => value !== id) : [...values, id];
}
