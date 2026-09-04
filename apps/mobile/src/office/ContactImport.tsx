import { useState, type ChangeEvent } from "react";

import { parseOfficeContactCsv, type SaveOfficeContact } from "@diarydock/office";

import { officeContactName } from "./contact-ui";
import { useOfficeModal } from "./use-office-modal";

export function ContactImport(props: {
  busy: boolean;
  onCancel: () => void;
  onImport: (contacts: SaveOfficeContact[]) => Promise<boolean>;
}) {
  useOfficeModal();
  const [contacts, setContacts] = useState<SaveOfficeContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > 256 * 1024) {
      setError("The CSV file is too large.");
      return;
    }
    try {
      setContacts(parseOfficeContactCsv(await file.text()));
    } catch (reason) {
      setContacts([]);
      setError(reason instanceof Error ? reason.message : "The CSV file could not be read.");
    }
  }
  return <section className="office-editor" role="dialog" aria-modal="true"
    aria-label="Import professional contacts">
    <div className="office-editor-heading"><div><p>Professional contacts</p>
      <h2>Import a CSV file</h2></div><button type="button" onClick={props.onCancel}
        aria-label="Close contact import">×</button></div>
    <p className="office-advisory">Choose up to 100 contacts. The file is checked on this device,
      then only the reviewed fields are sent securely.</p>
    <label className="office-file-picker">Choose CSV file<input type="file" accept=".csv,text/csv"
      onChange={(event) => void choose(event)} /></label>
    {error ? <p className="office-message" role="alert">{error}</p> : null}
    <div className="office-import-preview">{contacts.map((contact, index) =>
      <p key={`${contact.email}-${index}`}><strong>{officeContactName(contact)}</strong>
        <small>{contact.role || contact.category}{contact.company ? ` · ${contact.company}` : ""}</small></p>)}</div>
    {contacts.length ? <div className="office-editor-actions"><button type="button"
      disabled={props.busy} onClick={() => void props.onImport(contacts)}>
      {props.busy ? "Importing…" : `Import ${contacts.length} contact${contacts.length === 1 ? "" : "s"}`}
    </button></div> : null}
  </section>;
}
