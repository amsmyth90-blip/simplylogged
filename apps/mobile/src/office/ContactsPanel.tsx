import { useMemo, useState } from "react";

import { officeContactCategories, type OfficeContact } from "@diarydock/office";

import { officeContactInitials, officeContactName } from "./contact-ui";

export function ContactsPanel(props: {
  contacts: OfficeContact[];
  loadingContactId: string;
  onEdit: (contact: OfficeContact) => Promise<void>;
  onImport: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [favourites, setFavourites] = useState(false);
  const contacts = useMemo(() => props.contacts
    .filter((item) => category === "All categories" || item.category === category)
    .filter((item) => !favourites || item.isFavourite)
    .filter((item) => `${officeContactName(item)} ${item.role} ${item.company} ${item.category}`
      .toLowerCase().includes(query.trim().toLowerCase()))
    .sort((left, right) => officeContactName(left).localeCompare(officeContactName(right))),
  [category, favourites, props.contacts, query]);
  return <>
    <div className="office-contact-filters">
      <input aria-label="Search contacts" value={query} placeholder="Search name, role or company"
        onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Contact category" value={category}
        onChange={(event) => setCategory(event.target.value)}>
        <option>All categories</option>
        {officeContactCategories.map((item) => <option key={item}>{item}</option>)}
      </select>
      <label><input type="checkbox" checked={favourites}
        onChange={(event) => setFavourites(event.target.checked)} />Favourites</label>
      <button type="button" onClick={props.onImport}>Import CSV</button>
    </div>
    <div className="office-contact-list">{contacts.length ? contacts.map((item) =>
      <button type="button" className="office-contact-row" key={item.id}
        disabled={Boolean(props.loadingContactId)} onClick={() => void props.onEdit(item)}>
        <span>{officeContactInitials(item)}</span><span><strong>{officeContactName(item)}</strong>
          <small>{props.loadingContactId === item.id ? "Opening full details…"
            : <>{item.role || item.category}{item.company ? ` · ${item.company}` : ""}</>}</small></span>
        <b>{item.isEmergencyContact ? "Key" : item.isFavourite ? "★" : "›"}</b>
      </button>) : <p className="office-empty">No contacts match this view.</p>}</div>
  </>;
}
