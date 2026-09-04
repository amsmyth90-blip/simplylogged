import { useEffect, useState } from "react";

import type { HealthDirectory } from "@diarydock/health";

import type { HealthDraftMutation } from "./health-client";

type Props = {
  busy: boolean;
  directory: HealthDirectory;
  online: boolean;
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
  onSave: (mutation: HealthDraftMutation) => Promise<boolean>;
};

export function HealthFamilyEditor(props: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (props.open) setSelected(props.selectedIds);
  }, [props.open, props.selectedIds]);

  if (!props.open) return null;

  function toggle(id: string) {
    setSelected((current) => current.includes(id)
      ? current.filter((candidate) => candidate !== id)
      : [...current, id]);
  }

  async function save() {
    if (props.busy || !props.online) return;
    if (await props.onSave({
      operation: "UPDATE_FAMILY_MEMBERS",
      familyMemberIds: selected,
    })) props.onClose();
  }

  return (
    <div className="health-editor-backdrop" role="presentation">
      <section className="health-editor" role="dialog" aria-modal="true" aria-labelledby="health-family-editor-title">
        <header><div><p>Private organisation</p><h2 id="health-family-editor-title">Family health profiles</h2></div><button type="button" onClick={props.onClose} aria-label="Close family health editor">×</button></header>
        <p>Selecting a profile organises only your private Health view. It does not give that person access.</p>
        <div className="health-family-options">
          {props.directory.familyProfiles.map((profile) => <label key={profile.id}><input type="checkbox" checked={selected.includes(profile.id)} onChange={() => toggle(profile.id)} /><span><strong>{profile.name}</strong><small>{profile.role || "Family profile"}</small></span></label>)}
          {!props.directory.familyProfiles.length ? <p>No family profiles are available yet.</p> : null}
        </div>
        {!props.online ? <p>Connect to change linked family profiles.</p> : null}
        <footer><button type="button" onClick={props.onClose}>Cancel</button><button type="button" disabled={props.busy || !props.online} onClick={() => void save()}>{props.busy ? "Saving…" : "Save profiles"}</button></footer>
      </section>
    </div>
  );
}
