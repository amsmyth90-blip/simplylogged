import { useMemo, useState } from "react";

import type { DocumentSummary } from "@diarydock/documents";
import type { TravelPolicyOption, TravelTrip } from "@diarydock/travel";

import type { MobileDestination } from "@mobile/components/MobileBottomNav";

import type { TravelDraftMutation } from "./travel-client";

export function TripDocuments({ busy, documents, mutate, onNavigate, onScan, online,
  policies, trip }: {
  busy: boolean;
  documents: DocumentSummary[];
  mutate: (value: TravelDraftMutation) => Promise<boolean>;
  onNavigate: (destination: MobileDestination) => void;
  onScan: () => void;
  online: boolean;
  policies: TravelPolicyOption[];
  trip: TravelTrip;
}) {
  const [documentId, setDocumentId] = useState("");
  const [category, setCategory] = useState("Travel document");
  const [reviewDate, setReviewDate] = useState("");
  const available = useMemo(() => documents.filter((document) =>
    !trip.documentLinks.some((link) => link.documentId === document.id)), [documents, trip.documentLinks]);
  async function link(event: React.FormEvent) {
    event.preventDefault();
    if (!documentId) return;
    if (await mutate({ operation: "LINK_DOCUMENT", tripId: trip.id,
      documentId, category, reviewDate })) setDocumentId("");
  }
  return <section className="travel-section-panel"><header><div><p>Private records</p>
    <h2>Documents & insurance</h2></div><button type="button"
      onClick={() => onNavigate("FILES")}>All Files</button></header>
    <label className="travel-policy-select">Travel insurance policy<select disabled={!online || busy}
      value={trip.linkedInsurancePolicyId ?? ""} onChange={(event) => void mutate({
        operation: "SET_INSURANCE", tripId: trip.id, policyId: event.target.value || null })}>
      <option value="">No policy linked</option>{policies.map((policy) =>
        <option key={policy.id} value={policy.id}>{policy.title} · {policy.provider}</option>)}</select></label>
    {trip.documentLinks.length ? <div className="travel-record-list">{trip.documentLinks.map((record) => {
      const document = documents.find((item) => item.id === record.documentId);
      return <div className="travel-linked-document" key={record.id}>
        <button type="button" onClick={() => onNavigate("FILES")}><span>▤</span><div>
          <strong>{document?.title ?? record.category}</strong><small>{record.category}{
            record.reviewDate ? ` · Review ${record.reviewDate}` : ""}</small></div><b>Open</b></button>
        <button type="button" aria-label={`Unlink ${document?.title ?? record.category}`}
          disabled={!online || busy} onClick={() => void mutate({ operation: "UNLINK_DOCUMENT",
            tripId: trip.id, recordId: record.id })}>×</button></div>;
    })}</div> : <div className="travel-empty"><strong>No documents linked</strong>
      <span>Use All Files to securely store travel policies, confirmations and identity records.</span></div>}
    <form className="travel-document-link" onSubmit={(event) => void link(event)}>
      <label>Link a file<select value={documentId} disabled={!online || busy}
        onChange={(event) => setDocumentId(event.target.value)}><option value="">Choose a file</option>
        {available.map((document) => <option key={document.id} value={document.id}>{
          document.title}</option>)}</select></label>
      <label>Category<input maxLength={100} value={category}
        onChange={(event) => setCategory(event.target.value)} /></label>
      <label>Review date<input type="date" value={reviewDate}
        onChange={(event) => setReviewDate(event.target.value)} /></label>
      <button type="submit" disabled={!online || busy || !documentId}>Link document</button>
    </form>
    <button type="button" className="travel-scan-secondary" onClick={onScan}>＋ Scan or upload securely</button>
    <p className="travel-privacy-note">Passport numbers and original identity documents are never copied
      into the trip record.</p>
  </section>;
}
