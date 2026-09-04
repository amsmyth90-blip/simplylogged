import type { ReceivedEmergencyGrant } from "@diarydock/emergency-access";

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function ReceivedAccess(props: {
  grants: ReceivedEmergencyGrant[];
  onOpenDocument: (grant: ReceivedEmergencyGrant) => void;
}) {
  return (
    <section className="trusted-section">
      <div><p className="trusted-kicker">Read only</p><h2>Shared with me</h2><p>Only items another DiaryDock user selected for your signed-in email appear here.</p></div>
      <div className="received-grid">
        {props.grants.map((grant) => {
          const steps = Array.isArray(grant.snapshot.steps)
            ? grant.snapshot.steps.filter((step): step is string => typeof step === "string")
            : [];
          const phone = text(grant.snapshot.phone);
          return <article key={grant.id}>
            <p className="trusted-kicker">{grant.resourceType.replace("_", " ")}</p><h3>{grant.label}</h3>
            <small>Shared by {grant.contactName}{grant.contactRelation ? ` · ${grant.contactRelation}` : ""}</small>
            {text(grant.snapshot.summary) ? <p>{text(grant.snapshot.summary)}</p> : null}
            {text(grant.snapshot.value) ? <p>{text(grant.snapshot.value)}</p> : null}
            {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>☎ {phone}</a> : null}
            {steps.length ? <ol>{steps.map((step, index) => <li key={`${grant.id}-${index}`}><span>{index + 1}</span>{step}</li>)}</ol> : null}
            {grant.resourceType === "DOCUMENT" && grant.snapshot.downloadable === true ? <button type="button" onClick={() => props.onOpenDocument(grant)}>Open selected document</button> : null}
          </article>;
        })}
        {!props.grants.length ? <p className="trusted-empty">Nothing is currently shared with you.</p> : null}
      </div>
    </section>
  );
}
