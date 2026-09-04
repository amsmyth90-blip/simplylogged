import type { HealthDirectory, HealthRecord } from "@diarydock/health";

type Props = {
  directory: HealthDirectory;
  health: HealthRecord;
  onEditFamily: () => void;
  onEditOverview: () => void;
};

function contact(
  directory: HealthDirectory,
  id: string,
) {
  return directory.contacts.find((item) => item.id === id);
}

export function HealthConnections(props: Props) {
  const links = [
    ["GP or practice", props.health.profile.gpContactId],
    ["Pharmacy", props.health.profile.pharmacyContactId],
    ["Emergency contact", props.health.profile.emergencyContactId],
  ] as const;
  const selectedFamily = props.directory.familyProfiles.filter((profile) =>
    props.health.familyMemberIds.includes(profile.id),
  );

  return (
    <div className="health-connections-grid">
      <section className="health-card health-connections-card">
        <header><div><p>Healthcare directory</p><h2>Linked contacts</h2></div><button className="health-edit-profile" type="button" onClick={props.onEditOverview}>Manage</button></header>
        <div className="health-connection-list">
          {links.map(([label, id]) => {
            const linked = contact(props.directory, id);
            return <article key={label}><span>☎</span><div><small>{label}</small><strong>{linked?.name ?? "Not linked"}</strong>{linked?.phone ? <a href={`tel:${linked.phone}`}>{linked.phone}</a> : null}</div></article>;
          })}
        </div>
      </section>
      <section className="health-card health-connections-card">
        <header><div><p>Private organisation</p><h2>Family health profiles</h2></div><button className="health-edit-profile" type="button" onClick={props.onEditFamily}>Manage</button></header>
        <div className="health-family-list">
          {selectedFamily.map((profile) => <article key={profile.id}><span>{profile.name.slice(0, 1).toUpperCase()}</span><div><strong>{profile.name}</strong><small>{profile.role || "Family profile"}</small></div></article>)}
          {!selectedFamily.length ? <p>No family profiles are linked. Linking a profile never shares your health information.</p> : null}
        </div>
      </section>
    </div>
  );
}
