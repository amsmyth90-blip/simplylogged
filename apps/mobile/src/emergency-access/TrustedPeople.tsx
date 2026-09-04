import type {
  EmergencyAccessMutation,
  TrustedEmergencyContact,
} from "@diarydock/emergency-access";

export function TrustedPeople(props: {
  busy: boolean;
  contacts: TrustedEmergencyContact[];
  selectedId: string;
  onMutate: (mutation: EmergencyAccessMutation) => Promise<boolean>;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="trusted-section">
      <div><p className="trusted-kicker">Your sharing</p><h2>Trusted people</h2><p>Pending people cannot open selected items until they accept.</p></div>
      <div className="trusted-people-grid">
        {props.contacts.map((contact) => <article className={props.selectedId === contact.id ? "is-selected" : ""} key={contact.id}>
          <button type="button" className="trusted-person-select" onClick={() => props.onSelect(contact.id)}>
            <span>{contact.name.slice(0, 1).toUpperCase()}</span><div><h3>{contact.name}</h3><p>{contact.email} · {contact.relation || "Trusted person"}</p><small>{contact.grants.filter((grant) => !grant.revokedAt).length} selected items</small></div><strong>{contact.status}</strong>
          </button>
          {contact.status !== "REVOKED" ? <button type="button" className="trusted-revoke" disabled={props.busy} onClick={() => {
            if (window.confirm(`Remove all emergency access for ${contact.name}?`)) {
              void props.onMutate({ operation: "REVOKE_CONTACT", contactId: contact.id });
            }
          }}>Revoke all access</button> : null}
        </article>)}
        {!props.contacts.length ? <p className="trusted-empty">No trusted people have been added.</p> : null}
      </div>
    </section>
  );
}
