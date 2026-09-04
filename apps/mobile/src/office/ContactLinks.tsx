import type {
  OfficeBill,
  OfficeContract,
  OfficeInsurancePolicy,
  SaveOfficeContact,
} from "@diarydock/office";
import type { DocumentSummary } from "@diarydock/documents";

type LinkKey = "linkedDocumentIds" | "linkedPolicyIds" | "linkedContractIds" | "linkedBillIds";
type Item = { id: string; title: string };

function LinkField(props: {
  keyName: LinkKey;
  label: string;
  items: Item[];
  selected: string[];
  update: (key: LinkKey, value: string[]) => void;
}) {
  return <label>{props.label} ({props.selected.length})
    <select value="" onChange={(event) => {
      if (event.target.value) {
        props.update(props.keyName, [...new Set([...props.selected, event.target.value])]);
      }
    }}>
      <option value="">Link a record…</option>
      {props.items.filter((item) => !props.selected.includes(item.id))
        .map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
    </select>
    {props.selected.length ? <span className="office-linked-items">
      {props.selected.map((id) => <button type="button" key={id}
        onClick={() => props.update(props.keyName, props.selected.filter((item) => item !== id))}>
        {props.items.find((item) => item.id === id)?.title ?? "Linked record"} ×
      </button>)}
    </span> : null}
  </label>;
}

export function ContactLinks(props: {
  bills: OfficeBill[];
  contracts: OfficeContract[];
  documents: DocumentSummary[];
  draft: SaveOfficeContact;
  policies: OfficeInsurancePolicy[];
  update: (key: LinkKey, value: string[]) => void;
}) {
  const links: Array<[LinkKey, string, Item[]]> = [
    ["linkedDocumentIds", "Documents", props.documents.map((item) => ({ id: item.id, title: item.title }))],
    ["linkedPolicyIds", "Policies", props.policies.map((item) => ({ id: item.id, title: item.title }))],
    ["linkedContractIds", "Contracts", props.contracts.map((item) => ({
      id: item.id, title: item.serviceName || item.provider,
    }))],
    ["linkedBillIds", "Bills", props.bills.map((item) => ({ id: item.id, title: item.title }))],
  ];
  return <>
    <h3>Linked information</h3>
    <p className="office-advisory">Links organise your own records together. They do not change access.</p>
    <div className="office-form-grid">{links.map(([key, label, items]) =>
      <LinkField key={key} keyName={key} label={label} items={items}
        selected={props.draft[key]} update={props.update} />)}</div>
  </>;
}
