import {
  officeContactCategories,
  type SaveOfficeContact,
} from "@diarydock/office";

type Props = {
  draft: SaveOfficeContact;
  update: <Key extends keyof SaveOfficeContact>(
    key: Key,
    value: SaveOfficeContact[Key],
  ) => void;
};

export function ContactFields({ draft, update }: Props) {
  return <>
    <div className="office-form-grid">
      <label>First name<input value={draft.firstName} maxLength={120}
        onChange={(event) => update("firstName", event.target.value)} /></label>
      <label>Last name<input value={draft.lastName} maxLength={120}
        onChange={(event) => update("lastName", event.target.value)} /></label>
      <label>Role<input value={draft.role} maxLength={160}
        placeholder="Solicitor, adviser…"
        onChange={(event) => update("role", event.target.value)} /></label>
      <label>Company<input value={draft.company} maxLength={200}
        onChange={(event) => update("company", event.target.value)} /></label>
      <label>Category<select value={draft.category}
        onChange={(event) => update("category", event.target.value as SaveOfficeContact["category"])}>
        {officeContactCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Next review<input type="date" value={draft.nextReviewDate}
        onChange={(event) => update("nextReviewDate", event.target.value)} /></label>
      <label>Phone<input type="tel" value={draft.phone} maxLength={80}
        onChange={(event) => update("phone", event.target.value)} /></label>
      <label>Email<input type="email" value={draft.email} maxLength={254}
        onChange={(event) => update("email", event.target.value)} /></label>
      <label className="office-wide">Address<textarea rows={3} value={draft.address}
        maxLength={1000} onChange={(event) => update("address", event.target.value)} /></label>
      <label className="office-wide">Notes<textarea rows={4} value={draft.notes}
        maxLength={4000} onChange={(event) => update("notes", event.target.value)} /></label>
      <label className="office-check"><input type="checkbox" checked={draft.isFavourite}
        onChange={(event) => update("isFavourite", event.target.checked)} />Favourite</label>
      <label className="office-check"><input type="checkbox" checked={draft.isEmergencyContact}
        onChange={(event) => update("isEmergencyContact", event.target.checked)} />Key emergency contact</label>
    </div>
    {draft.isEmergencyContact ? <p className="office-advisory">
      This improves visibility inside your account only. It does not grant this person access.
    </p> : null}
  </>;
}
