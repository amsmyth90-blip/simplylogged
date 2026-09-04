import { useState } from "react";

import type { DocumentSummary } from "@diarydock/documents";
import type {
  OfficeBill,
  OfficeContact,
  OfficeContract,
  OfficeInsurancePolicy,
  SaveOfficeContact,
} from "@diarydock/office";

import { ContactFields } from "./ContactFields";
import { ContactHistory } from "./ContactHistory";
import { ContactLinks } from "./ContactLinks";
import { editableOfficeContact, officeContactName } from "./contact-ui";
import { useOfficeModal } from "./use-office-modal";

type Props = {
  bills: OfficeBill[];
  busy: boolean;
  contact: OfficeContact | null;
  contracts: OfficeContract[];
  documents: DocumentSummary[];
  policies: OfficeInsurancePolicy[];
  onCancel: () => void;
  onDelete: (contact: OfficeContact) => Promise<boolean>;
  onSave: (contact: SaveOfficeContact) => Promise<boolean>;
};

export function ContactEditor(props: Props) {
  useOfficeModal();
  const [draft, setDraft] = useState(() => editableOfficeContact(props.contact));
  const update = <Key extends keyof SaveOfficeContact>(
    key: Key,
    value: SaveOfficeContact[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  const phone = draft.phone.replace(/[^+\d]/g, "");
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())
    ? draft.email.trim() : "";
  return <section className="office-editor" role="dialog" aria-modal="true"
    aria-label={props.contact ? "Edit contact" : "Add contact"}>
    <div className="office-editor-heading"><div><p>Professional contacts</p>
      <h2>{props.contact ? officeContactName(props.contact) : "Add a contact"}</h2></div>
      <button type="button" onClick={props.onCancel} aria-label="Close contact editor">×</button></div>
    {phone || email ? <div className="office-contact-actions">
      {phone ? <a href={`tel:${phone}`}>Call</a> : null}
      {email ? <a href={`mailto:${email}`}>Email</a> : null}
    </div> : null}
    <ContactFields draft={draft} update={update} />
    <ContactLinks bills={props.bills} contracts={props.contracts} documents={props.documents}
      draft={draft} policies={props.policies} update={update} />
    <ContactHistory draft={draft} update={update} />
    <p className="office-advisory">Listing or linking a contact never gives them access to DiaryDock.</p>
    <div className="office-editor-actions">
      <button type="button" disabled={props.busy} onClick={() => void props.onSave(draft)}>
        {props.busy ? "Saving…" : "Save contact"}</button>
      {props.contact ? <button className="office-danger" type="button" disabled={props.busy}
        onClick={() => void props.onDelete(props.contact!)}>Delete contact</button> : null}
    </div>
  </section>;
}
