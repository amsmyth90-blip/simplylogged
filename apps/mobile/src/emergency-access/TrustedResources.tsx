import type {
  EmergencyAccessMutation,
  EmergencyAccessResource,
  TrustedEmergencyContact,
} from "@diarydock/emergency-access";

const icons = { CONTACT: "☎", DOCUMENT: "▱", HOME_INFO: "⌂", INSTRUCTION: "!" };

export function TrustedResources(props: {
  busy: boolean;
  contact: TrustedEmergencyContact;
  onMutate: (mutation: EmergencyAccessMutation) => Promise<boolean>;
  resources: EmergencyAccessResource[];
}) {
  const active = new Set(props.contact.grants.filter((grant) => !grant.revokedAt)
    .map((grant) => `${grant.resourceType}:${grant.resourceId}`));
  return (
    <section className="trusted-section">
      <div><p className="trusted-kicker">Individual items</p><h2>Items for {props.contact.name}</h2><p>Only approved Emergency items are available. Nothing is shared by default.</p></div>
      <div className="trusted-resource-list">
        {props.resources.map((resource) => {
          const granted = active.has(`${resource.type}:${resource.id}`);
          return <article key={`${resource.type}:${resource.id}`}>
            <span>{icons[resource.type]}</span><div><h3>{resource.label}</h3><p>{resource.detail || resource.type.replace("_", " ")}</p></div>
            <button type="button" disabled={props.busy} className={granted ? "is-remove" : ""} onClick={() => void props.onMutate({ operation: "SET_GRANT", contactId: props.contact.id, resourceType: resource.type, resourceId: resource.id, granted: !granted })}>{granted ? "Remove" : "Allow"}</button>
          </article>;
        })}
        {!props.resources.length ? <p className="trusted-empty">Add Emergency contacts, plans or home information—or approve a document—to make it selectable here.</p> : null}
      </div>
    </section>
  );
}
