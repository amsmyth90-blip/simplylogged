import { useEffect, useState } from "react";

import type { HouseholdInvitePreview } from "@diarydock/household";

import familyImage from "../../../../public/images/pages/family-room-hero.webp";
import { friendlyDate } from "./family-utils";
import { loadMobileHouseholdInvite, mutateMobileHousehold } from "./household-client";

type Props = {
  accessToken: string;
  initialInvite?: HouseholdInvitePreview;
  token: string;
  onAccepted: () => void;
  onClose: () => void;
};

export function HouseholdInviteScreen({ accessToken, initialInvite, token, onAccepted, onClose }: Props) {
  const [invite, setInvite] = useState<HouseholdInvitePreview | null>(initialInvite ?? null);
  const [loading, setLoading] = useState(!initialInvite);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialInvite) return;
    let active = true;
    setLoading(true);
    void loadMobileHouseholdInvite(accessToken, token).then((result) => {
      if (!active) return;
      setInvite(result);
      if (!result) setError("This invitation is unavailable or was created for another email address.");
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "The invitation could not be opened.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [accessToken, initialInvite, token]);

  async function accept() {
    if (!invite || !confirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      await mutateMobileHousehold(accessToken, { action: "accept-invite", token });
      onAccepted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The invitation could not be accepted.");
      setBusy(false);
    }
  }

  return (
    <main className="family-invite-screen">
      <header style={{ backgroundImage: `url(${familyImage})` }}>
        <div />
        <button type="button" onClick={onClose} aria-label="Close invitation">×</button>
        <section><p>Secure invitation</p><h1>Join a household</h1></section>
      </header>
      <section className="family-card family-invite-acceptance">
        {loading ? <p>Checking this invitation securely…</p> : invite ? <>
          <p className="eyebrow">You have been invited to</p>
          <h2>{invite.householdName}</h2>
          <dl>
            <div><dt>Name</dt><dd>{invite.name}</dd></div>
            <div><dt>Relationship</dt><dd>{invite.relation}</dd></div>
            <div><dt>Access</dt><dd>{invite.access}</dd></div>
            <div><dt>Expires</dt><dd>{friendlyDate(invite.expiresAt)}</dd></div>
          </dl>
          <label>
            <input type="checkbox" checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I understand this joins my account to this household. My private records remain mine.</span>
          </label>
          <button className="family-primary" type="button" disabled={!confirmed || busy}
            onClick={() => void accept()}>{busy ? "Joining household…" : "Accept invitation"}</button>
        </> : null}
        {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
        {!loading && !invite ? <button type="button" onClick={onClose}>Close</button> : null}
      </section>
    </main>
  );
}
