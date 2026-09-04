"use client";
import { ModalShell } from "@/components/ModalShell";
import type { VaultDocument } from "@/lib/mock-data";
import type { Trip } from "@/lib/trip-records";
import type { TripAddMode } from "./trip-detail-shared";
import { useTripAddForm } from "./useTripAddForm";

type Person = { id: string; name: string; source: "household" | "contact" };

export function TripAddModal({
  mode,
  trip,
  vaultDocuments,
  people,
  onClose,
  onSave,
}: {
  mode: TripAddMode;
  trip: Trip;
  vaultDocuments: VaultDocument[];
  people: Person[];
  onClose: () => void;
  onSave: (value: Trip) => void;
}) {
  const form = useTripAddForm({
    mode,
    trip,
    vaultDocuments,
    people,
    onClose,
    onSave,
  });
  return (
    <ModalShell
      open={mode !== null}
      title={form.titleText}
      subtitle={`For ${trip.title}`}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={form.save}
          className="min-h-12 w-full rounded-2xl bg-[#2f5140] text-sm font-semibold text-white"
        >
          Save
        </button>
      }
    >
      <div className="space-y-4">
        {mode === "document" ? (
          <label className="block text-xs font-semibold">
            Document
            <select
              value={form.documentId}
              onChange={(event) => form.setDocumentId(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            >
              <option value="">Choose from All Files</option>
              {vaultDocuments.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
          </label>
        ) : mode === "traveller" ? (
          <>
            <label className="block text-xs font-semibold">
              Existing person
              <select
                value={form.personId}
                onChange={(event) => form.setPersonId(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              >
                <option value="">Add by display name instead</option>
                {people.map((person) => (
                  <option
                    key={`${person.source}-${person.id}`}
                    value={person.id}
                  >
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            {!form.personId ? (
              <label className="block text-xs font-semibold">
                Display name
                <input
                  value={form.title}
                  onChange={(event) => form.setTitle(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
                />
              </label>
            ) : null}
          </>
        ) : (
          <label className="block text-xs font-semibold">
            Title
            <input
              value={form.title}
              onChange={(event) => form.setTitle(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
            />
          </label>
        )}
        <label className="block text-xs font-semibold">
          {mode === "traveller"
            ? "Traveller type"
            : mode === "document"
              ? "Document category"
              : "Category"}
          <select
            value={form.kind}
            onChange={(event) => form.setKind(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
          >
            <option value="">Choose</option>
            {form.typeOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        {mode === "booking" || mode === "itinerary" ? (
          <>
            <label className="block text-xs font-semibold">
              Provider
              <input
                value={form.provider}
                onChange={(event) => form.setProvider(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-semibold">
              Booking reference
              <input
                value={form.reference}
                onChange={(event) => form.setReference(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold">
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => form.setDate(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-2 text-sm font-normal"
                />
              </label>
              {mode === "booking" ? (
                <label className="block text-xs font-semibold">
                  End date
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) => form.setEndDate(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-2 text-sm font-normal"
                  />
                </label>
              ) : (
                <label className="block text-xs font-semibold">
                  Start time
                  <input
                    type="time"
                    value={form.time}
                    onChange={(event) => form.setTime(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-2 text-sm font-normal"
                  />
                </label>
              )}
            </div>
            <label className="block text-xs font-semibold">
              Location
              <input
                value={form.location}
                onChange={(event) => form.setLocation(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              />
            </label>
          </>
        ) : null}
        {mode === "booking" || mode === "itinerary" || mode === "expense" ? (
          <>
            <label className="block text-xs font-semibold">
              Amount ({trip.currency})
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => form.setAmount(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-semibold">
              Status
              <select
                value={form.status}
                onChange={(event) => form.setStatus(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
              >
                {mode === "expense" ? (
                  <>
                    <option value="estimated">Estimated</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </>
                ) : (
                  <>
                    <option value="unknown">Status unknown</option>
                    <option value="draft">Draft</option>
                    <option value="reserved">Reserved</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="payment-due">Payment due</option>
                  </>
                )}
              </select>
            </label>
          </>
        ) : null}
        {mode !== "traveller" ? (
          <label className="block text-xs font-semibold">
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => form.setNotes(event.target.value)}
              className="mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm font-normal"
            />
          </label>
        ) : null}
        {form.error ? (
          <p
            role="alert"
            className="rounded-xl bg-[#f8e7e2] px-3 py-2 text-xs font-medium text-[#8a5145]"
          >
            {form.error}
          </p>
        ) : null}
      </div>
    </ModalShell>
  );
}
