import { Share } from "@capacitor/share";
import { useState, type FormEvent } from "react";

import type { EmergencyAccessMutation } from "@diarydock/emergency-access";

import { getSecureRuntime } from "@mobile/platform/runtime-security";

export function TrustedContactForm(props: {
  busy: boolean;
  invitePath: string | null;
  onClearInvite: () => void;
  onMutate: (mutation: EmergencyAccessMutation) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState("");
  const inviteUrl = props.invitePath
    ? new URL(props.invitePath, getSecureRuntime().apiOrigin).toString()
    : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const saved = await props.onMutate({ operation: "CREATE_CONTACT", name, email, relation });
    if (saved) { setName(""); setEmail(""); setRelation(""); }
  }

  async function share() {
    if (!inviteUrl) return;
    await Share.share({
      title: "DiaryDock trusted emergency invitation",
      text: "I’ve shared a limited emergency view with you in DiaryDock.",
      url: inviteUrl,
      dialogTitle: "Share this one-time invitation",
    });
  }

  return <>
    {inviteUrl ? <section className="trusted-invite">
      <p className="trusted-kicker">Shown once</p><h2>Share this private invitation now</h2>
      <p>The secret link is held only in this screen. Send it to the named person through a channel you trust.</p>
      <button type="button" className="trusted-primary" onClick={() => void share()}>Share invitation</button>
      <button type="button" onClick={props.onClearInvite}>I have saved it</button>
    </section> : null}
    <form className="trusted-card trusted-contact-form" onSubmit={(event) => void submit(event)}>
      <div><p className="trusted-kicker">Invite</p><h2>Add a trusted person</h2><p>They receive nothing until they accept with the invited email.</p></div>
      <label>Name<input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Email<input required maxLength={254} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Relationship<input maxLength={120} value={relation} onChange={(event) => setRelation(event.target.value)} placeholder="Neighbour, sibling…" /></label>
      <button className="trusted-primary" disabled={props.busy} type="submit">{props.busy ? "Creating…" : "Create invitation"}</button>
    </form>
  </>;
}
