import { useState } from "react";

import {
  officeCorrespondenceFolders,
  officeCorrespondenceStatuses,
  type OfficeBill,
  type OfficeCorrespondence,
  type OfficeInsurancePolicy,
  type SaveOfficeCorrespondence,
} from "@diarydock/office";

import { useOfficeModal } from "./use-office-modal";

function emptyCorrespondence(): SaveOfficeCorrespondence {
  return {
    title: "",
    sender: "",
    correspondenceType: "Letter",
    folder: "Other",
    receivedDate: new Date().toISOString().slice(0, 10),
    deadline: "",
    status: "unread",
    summary: "",
    actions: [],
    contactName: "",
    contactPhone: "",
    contactUrl: "",
    linkedReminderIds: [],
    linkedBillId: null,
    linkedPolicyId: null,
    responses: [],
  };
}

function editable(item: OfficeCorrespondence | null): SaveOfficeCorrespondence {
  if (!item) return emptyCorrespondence();
  const { contentComplete, id, documentId, reviewStatus, updatedAt, ...fields } = item;
  void contentComplete; void id; void documentId; void reviewStatus; void updatedAt;
  return fields;
}

type Props = {
  bills: OfficeBill[];
  busy: boolean;
  correspondence: OfficeCorrespondence | null;
  policies: OfficeInsurancePolicy[];
  onAddReminder: (item: SaveOfficeCorrespondence) => Promise<string | null>;
  onCancel: () => void;
  onSave: (item: SaveOfficeCorrespondence) => Promise<boolean>;
};

export function CorrespondenceEditor(props: Props) {
  useOfficeModal();
  const [draft, setDraft] = useState(() => editable(props.correspondence));
  const [actionText, setActionText] = useState("");
  const [responseText, setResponseText] = useState("");
  const update = <Key extends keyof SaveOfficeCorrespondence>(
    key: Key,
    value: SaveOfficeCorrespondence[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  function addAction() {
    const label = actionText.trim();
    if (!label || draft.actions.length >= 24) return;
    update("actions", [...draft.actions, {
      id: crypto.randomUUID(), label, completed: false,
    }]);
    setActionText("");
  }

  function addResponse() {
    const note = responseText.trim();
    if (!note || draft.responses.length >= 100) return;
    update("responses", [{
      id: crypto.randomUUID(), note, createdAt: new Date().toISOString(),
    }, ...draft.responses]);
    setResponseText("");
  }

  async function addReminder() {
    const id = await props.onAddReminder(draft);
    if (!id) return;
    const next = {
      ...draft,
      linkedReminderIds: Array.from(new Set([id, ...draft.linkedReminderIds])).slice(0, 24),
    };
    setDraft(next);
    await props.onSave(next);
  }

  return (
    <section className="office-editor" role="dialog" aria-modal="true"
      aria-label={props.correspondence ? "Edit correspondence" : "Add correspondence"}>
      <div className="office-editor-heading">
        <div><p>Important correspondence</p><h2>{props.correspondence
          ? "Check letter details" : "Add correspondence"}</h2></div>
        <button type="button" onClick={props.onCancel} aria-label="Close correspondence editor">×</button>
      </div>
      <p className="office-advisory">Check summaries, dates and required actions against the
        original letter. DiaryDock does not provide legal, tax or financial advice.</p>
      <div className="office-form-grid">
        <label>Title<input value={draft.title} maxLength={160}
          onChange={(event) => update("title", event.target.value)} /></label>
        <label>Sender<input value={draft.sender} maxLength={160}
          onChange={(event) => update("sender", event.target.value)} /></label>
        <label>Type<input value={draft.correspondenceType} maxLength={120}
          onChange={(event) => update("correspondenceType", event.target.value)} /></label>
        <label>Folder<select value={draft.folder}
          onChange={(event) => update("folder", event.target.value as SaveOfficeCorrespondence["folder"])}>
          {officeCorrespondenceFolders.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Received<input type="date" value={draft.receivedDate}
          onChange={(event) => update("receivedDate", event.target.value)} /></label>
        <label>Deadline<input type="date" value={draft.deadline}
          onChange={(event) => update("deadline", event.target.value)} /></label>
        <label>Status<select value={draft.status}
          onChange={(event) => update("status", event.target.value as SaveOfficeCorrespondence["status"])}>
          {officeCorrespondenceStatuses.map((item) => <option key={item} value={item}>
            {item.replace("action-needed", "Action needed")}</option>)}</select></label>
        <label className="office-wide">Summary<textarea rows={4} value={draft.summary}
          maxLength={4000} onChange={(event) => update("summary", event.target.value)} /></label>
      </div>
      <h3>Actions required</h3>
      <div className="office-task-list">
        {draft.actions.map((action) => <label key={action.id} className="office-task">
          <input type="checkbox" checked={action.completed} onChange={(event) => update("actions",
            draft.actions.map((item) => item.id === action.id
              ? { ...item, completed: event.target.checked } : item))} />
          <span>{action.label}</span>
        </label>)}
        <div className="office-inline-entry"><input value={actionText} maxLength={240}
          placeholder="Add another action" onChange={(event) => setActionText(event.target.value)} />
          <button type="button" onClick={addAction}>Add</button></div>
      </div>
      <h3>Contact and linked records</h3>
      <div className="office-form-grid">
        <label>Contact name<input value={draft.contactName} maxLength={160}
          onChange={(event) => update("contactName", event.target.value)} /></label>
        <label>Phone<input type="tel" value={draft.contactPhone} maxLength={80}
          onChange={(event) => update("contactPhone", event.target.value)} /></label>
        <label className="office-wide">Official web address<input type="url" value={draft.contactUrl}
          maxLength={2048} onChange={(event) => update("contactUrl", event.target.value)} /></label>
        <label>Linked bill<select value={draft.linkedBillId ?? ""}
          onChange={(event) => update("linkedBillId", event.target.value || null)}><option value="">None</option>
          {props.bills.map((bill) => <option key={bill.id} value={bill.id}>{bill.title}</option>)}</select></label>
        <label>Linked policy<select value={draft.linkedPolicyId ?? ""}
          onChange={(event) => update("linkedPolicyId", event.target.value || null)}><option value="">None</option>
          {props.policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.title}</option>)}</select></label>
      </div>
      <h3>Follow-up log</h3>
      <div className="office-task-list">
        {draft.responses.map((response) => <p className="office-response" key={response.id}>
          <span>{response.note}</span><small>{new Date(response.createdAt).toLocaleString("en-GB")}</small>
        </p>)}
        <div className="office-inline-entry"><input value={responseText} maxLength={2000}
          placeholder="Called provider, sent form…" onChange={(event) => setResponseText(event.target.value)} />
          <button type="button" onClick={addResponse}>Save</button></div>
      </div>
      <div className="office-editor-actions">
        <button type="button" disabled={props.busy} onClick={() => void props.onSave(draft)}>
          {props.busy ? "Saving…" : props.correspondence?.reviewStatus === "needs-review"
            ? "Confirm and save" : "Save correspondence"}</button>
        {draft.deadline ? <button className="office-secondary" type="button" disabled={props.busy}
          onClick={() => void addReminder()}>Add deadline reminder</button> : null}
      </div>
    </section>
  );
}
