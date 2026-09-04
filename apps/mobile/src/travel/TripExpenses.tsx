import { useMemo, useState } from "react";

import { expenseCategories, type TravelExpense, type TravelTraveller } from "@diarydock/travel";

import type { TravelDraftMutation } from "./travel-client";
import { TravelRecordModal } from "./TravelRecordModal";

type Draft = Omit<TravelExpense, "id" | "createdAt">;

function Editor({ busy, currency, mutate, onClose, record, travellers, tripId }: {
  busy: boolean; currency: string; mutate: (value: TravelDraftMutation) => Promise<boolean>;
  onClose: () => void; record: TravelExpense | null; travellers: TravelTraveller[]; tripId: string;
}) {
  const [draft, setDraft] = useState<Draft>(record ? { title: record.title,
    category: record.category, amount: record.amount, currency: record.currency,
    status: record.status, paidByTravellerId: record.paidByTravellerId, notes: record.notes }
    : { title: "", category: "Other", amount: 0, currency, status: "estimated",
      paidByTravellerId: null, notes: "" });
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (await mutate({ operation: "SAVE_EXPENSE", tripId,
      recordId: record?.id ?? null, record: draft })) onClose();
  }
  async function remove() {
    if (!record || !window.confirm(`Delete ${record.title}?`)) return;
    if (await mutate({ operation: "DELETE_EXPENSE", tripId, recordId: record.id })) onClose();
  }
  return <TravelRecordModal busy={busy} label="Expense" onClose={onClose}
    onDelete={record ? () => void remove() : undefined} onSubmit={(event) => void save(event)}
    title={record?.title ?? "Add expense"}><div className="travel-editor-grid">
      <label className="is-wide">Description<input required maxLength={160} value={draft.title}
        onChange={(event) => set("title", event.target.value)} /></label>
      <label>Category<select value={draft.category}
        onChange={(event) => set("category", event.target.value as Draft["category"])}>
        {expenseCategories.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Status<select value={draft.status}
        onChange={(event) => set("status", event.target.value as Draft["status"])}>
        <option value="estimated">Estimated</option><option value="unpaid">Unpaid</option>
        <option value="paid">Paid</option></select></label>
      <label>Amount<input type="number" min="0" max="100000000" step="0.01" value={draft.amount}
        onChange={(event) => set("amount", Number(event.target.value))} /></label>
      <label>Currency<input required maxLength={3} value={draft.currency}
        onChange={(event) => set("currency", event.target.value.toUpperCase())} /></label>
      <label className="is-wide">Paid by<select value={draft.paidByTravellerId ?? ""}
        onChange={(event) => set("paidByTravellerId", event.target.value || null)}>
        <option value="">Not assigned</option>{travellers.map((person) =>
          <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label>
      <label className="is-wide">Notes<textarea maxLength={2_000} value={draft.notes}
        onChange={(event) => set("notes", event.target.value)} /></label>
    </div></TravelRecordModal>;
}

export function TripExpenses({ busy, currency, mutate, online, records, travellers, tripId }: {
  busy: boolean; currency: string; mutate: (value: TravelDraftMutation) => Promise<boolean>;
  online: boolean; records: TravelExpense[]; travellers: TravelTraveller[]; tripId: string;
}) {
  const [editing, setEditing] = useState<TravelExpense | null | undefined>();
  const total = useMemo(() => records.reduce((sum, item) => sum + item.amount, 0), [records]);
  return <section className="travel-section-panel"><header><div><p>Travel budget</p>
    <h2>Expenses</h2></div><button type="button" disabled={!online}
      onClick={() => setEditing(null)}>＋ Add</button></header>
    <div className="travel-total"><span>Recorded total</span><strong>{new Intl.NumberFormat("en-GB",
      { style: "currency", currency }).format(total)}</strong></div>
    {records.length ? <div className="travel-record-list">{records.map((record) =>
      <button type="button" key={record.id} onClick={() => setEditing(record)}>
        <span>{record.category.slice(0, 1)}</span><div><strong>{record.title}</strong>
          <small>{record.category} · {record.status}</small></div>
        <b>{new Intl.NumberFormat("en-GB", { style: "currency", currency: record.currency })
          .format(record.amount)}</b></button>)}</div>
      : <div className="travel-empty"><strong>No expenses recorded</strong>
        <span>Add estimates and paid costs to keep the trip budget together.</span></div>}
    {editing !== undefined ? <Editor busy={busy || !online} currency={currency} mutate={mutate}
      onClose={() => setEditing(undefined)} record={editing} travellers={travellers} tripId={tripId} /> : null}
  </section>;
}
