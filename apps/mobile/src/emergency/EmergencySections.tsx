import type { DocumentSummary } from "@diarydock/documents";
import type {
  EmergencyCareContact,
  EmergencyContact,
  EmergencyHomeInfo,
  EmergencyPlan,
} from "@diarydock/emergency";

function callHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

export function EmergencyContacts(props: {
  careContacts: EmergencyCareContact[];
  contacts: EmergencyContact[];
}) {
  const contacts = props.contacts.length ? props.contacts : props.careContacts.map((item) => ({
    id: item.id,
    name: item.name,
    relation: item.relation,
    phone: item.phone,
    note: item.detail,
  }));
  return (
    <section className="emergency-section">
      <div className="emergency-section-title"><span>People</span><h2>Emergency contacts</h2></div>
      <div className="emergency-list">
        {contacts.map((contact) => <article className="emergency-contact" key={contact.id}>
          <span className="emergency-avatar">{contact.name.slice(0, 1).toUpperCase()}</span>
          <div><h3>{contact.name}</h3><p>{contact.relation}{contact.note ? ` · ${contact.note}` : ""}</p><strong>{contact.phone}</strong></div>
          <a href={callHref(contact.phone)} aria-label={`Call ${contact.name}`}>☎</a>
        </article>)}
        {!contacts.length ? <p className="emergency-empty">No emergency contacts have been added yet.</p> : null}
      </div>
    </section>
  );
}

export function EmergencyPlans(props: { plans: EmergencyPlan[] }) {
  return (
    <section className="emergency-section">
      <div className="emergency-section-title"><span>Prepared</span><h2>Household plans</h2></div>
      <div className="emergency-plan-grid">
        {props.plans.map((plan) => <details className="emergency-plan" key={plan.id}>
          <summary><span>!</span><div><h3>{plan.title}</h3><p>{plan.summary}</p></div><strong>⌄</strong></summary>
          <ol>{plan.steps.map((step, index) => <li key={`${plan.id}-${index}`}><span>{index + 1}</span>{step}</li>)}</ol>
        </details>)}
        {!props.plans.length ? <p className="emergency-empty">No household plans have been added yet.</p> : null}
      </div>
    </section>
  );
}

export function EmergencyHome(props: { entries: EmergencyHomeInfo[] }) {
  return (
    <section className="emergency-section">
      <div className="emergency-section-title"><span>At home</span><h2>Know your home</h2></div>
      <div className="emergency-home-grid">
        {props.entries.map((entry, index) => <article key={`${entry.label}-${index}`}><span>{entry.label}</span><p>{entry.value}</p></article>)}
        {!props.entries.length ? <p className="emergency-empty">No important home information has been added yet.</p> : null}
      </div>
    </section>
  );
}

export function EmergencyDocuments(props: {
  documents: DocumentSummary[];
  onOpen: (document: DocumentSummary) => void;
}) {
  return (
    <section className="emergency-section">
      <div className="emergency-section-title"><span>Approved</span><h2>Emergency documents</h2></div>
      <div className="emergency-list">
        {props.documents.map((document) => <button type="button" className="emergency-document" key={document.syncId} onClick={() => props.onOpen(document)}>
          <span>▱</span><div><h3>{document.title}</h3><p>{document.category} · {document.kind}{document.hasStoredFile ? " · File available" : ""}</p></div><strong>›</strong>
        </button>)}
        {!props.documents.length ? <p className="emergency-empty">Mark a file “Include in my emergency panel” to see it here.</p> : null}
      </div>
    </section>
  );
}
