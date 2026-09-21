import { useState, type FormEvent } from "react";

import type { HouseholdMutation } from "./household-client";

type Props = {
  busy: boolean;
  onCancel: () => void;
  onCreate: (mutation: Extract<HouseholdMutation, { action: "create-role-invite" }>) => Promise<void>;
};

export function HouseholdInviteForm({ busy, onCancel, onCreate }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("viewer");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onCreate({ action: "create-role-invite", name, email, relation, role });
  }

  return (
    <form className="family-invite-form" onSubmit={(event) => void submit(event)}>
      <div className="family-section-title"><h2>Invite someone</h2><button type="button" onClick={onCancel}>Close</button></div>
      <label><span>Name</span><input required maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label><span>Email address</span><input required maxLength={254} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label><span>Relationship</span><input required maxLength={100} value={relation} onChange={(event) => setRelation(event.target.value)} /></label>
      <fieldset>
        <legend>Access</legend>
        <button type="button" aria-pressed={role === "viewer"} onClick={() => setRole("viewer")}><strong>Member</strong></button>
        <button type="button" aria-pressed={role === "member"} onClick={() => setRole("member")}><strong>Adult</strong></button>
      </fieldset>
      <button className="family-primary" type="submit" disabled={busy}>{busy ? "Creating…" : "Create invite"}</button>
    </form>
  );
}
