import { useEffect, useState } from "react";

import type { HealthDirectory, HealthProfile } from "@diarydock/health";

import type { HealthDraftMutation } from "./health-client";

type Props = {
  busy: boolean;
  carePreferences: string;
  directory: HealthDirectory;
  online: boolean;
  open: boolean;
  profile: HealthProfile;
  onClose: () => void;
  onSave: (mutation: HealthDraftMutation) => Promise<boolean>;
};

export function HealthOverviewEditor(props: Props) {
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [carePreferences, setCarePreferences] = useState("");
  const [gpContactId, setGpContactId] = useState("");
  const [pharmacyContactId, setPharmacyContactId] = useState("");
  const [emergencyContactId, setEmergencyContactId] = useState("");

  useEffect(() => {
    if (!props.open) return;
    setBloodGroup(props.profile.bloodGroup);
    setEmergencyNotes(props.profile.emergencyNotes);
    setCarePreferences(props.carePreferences);
    setGpContactId(availableContactId(props.directory, props.profile.gpContactId));
    setPharmacyContactId(
      availableContactId(props.directory, props.profile.pharmacyContactId),
    );
    setEmergencyContactId(
      availableContactId(props.directory, props.profile.emergencyContactId),
    );
  }, [props.carePreferences, props.directory, props.open, props.profile]);

  if (!props.open) return null;

  async function save() {
    if (props.busy || !props.online) return;
    const saved = await props.onSave({
      operation: "UPDATE_OVERVIEW",
      profile: {
        ...props.profile,
        bloodGroup: bloodGroup.trim(),
        emergencyNotes: emergencyNotes.trim(),
        gpContactId,
        pharmacyContactId,
        emergencyContactId,
        lastReviewedAt: new Date().toISOString(),
      },
      carePreferences: carePreferences.trim(),
    });
    if (saved) props.onClose();
  }

  return (
    <div className="health-editor-backdrop" role="presentation">
      <section
        className="health-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="health-overview-editor-title"
      >
        <header>
          <div>
            <p>Private health profile</p>
            <h2 id="health-overview-editor-title">Review essential details</h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close health profile editor"
          >
            ×
          </button>
        </header>
        <label>
          <span>Blood group</span>
          <input
            autoFocus
            maxLength={20}
            value={bloodGroup}
            onChange={(event) => setBloodGroup(event.target.value)}
            placeholder="Only if known"
          />
        </label>
        <ContactSelect
          label="GP or practice"
          value={gpContactId}
          directory={props.directory}
          onChange={setGpContactId}
        />
        <ContactSelect
          label="Pharmacy"
          value={pharmacyContactId}
          directory={props.directory}
          onChange={setPharmacyContactId}
        />
        <ContactSelect
          label="Emergency contact"
          value={emergencyContactId}
          directory={props.directory}
          onChange={setEmergencyContactId}
        />
        <label>
          <span>Emergency notes</span>
          <textarea
            rows={5}
            maxLength={4_000}
            value={emergencyNotes}
            onChange={(event) => setEmergencyNotes(event.target.value)}
            placeholder="Essential information you choose to record"
          />
        </label>
        <label>
          <span>Care preferences</span>
          <textarea
            rows={5}
            maxLength={10_000}
            value={carePreferences}
            onChange={(event) => setCarePreferences(event.target.value)}
            placeholder="Preferences you want kept with your health records"
          />
        </label>
        <p>
          Linking a contact organises your private view only. It never shares your
          health information.
        </p>
        {!props.online ? <p>Connect to update essential health details.</p> : null}
        <footer>
          <button type="button" onClick={props.onClose}>Cancel</button>
          <button
            type="button"
            disabled={props.busy || !props.online}
            onClick={() => void save()}
          >
            {props.busy ? "Saving…" : "Save review"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function availableContactId(directory: HealthDirectory, id: string) {
  return directory.contacts.some((contact) => contact.id === id) ? id : "";
}

function ContactSelect(props: {
  directory: HealthDirectory;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        <option value="">Not linked</option>
        {props.directory.contacts.map((contact) => (
          <option key={contact.id} value={contact.id}>
            {contact.name}{contact.role ? ` — ${contact.role}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
