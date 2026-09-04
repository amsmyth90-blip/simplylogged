import { Share } from "@capacitor/share";
import type { HouseholdDirectoryInvite } from "@diarydock/household";

import { getSecureRuntime } from "@mobile/platform/runtime-security";
import { friendlyDate } from "./family-utils";

type Props = {
  busy: boolean;
  invites: HouseholdDirectoryInvite[];
  onCancel: (token: string) => Promise<void>;
  onRenew: (token: string) => Promise<void>;
};

function inviteUrl(token: string) {
  return new URL(`/family/invite/${encodeURIComponent(token)}`, getSecureRuntime().apiOrigin).toString();
}

async function shareInvite(invite: HouseholdDirectoryInvite) {
  const url = inviteUrl(invite.token);
  try {
    await Share.share({
      title: "DiaryDock household invitation",
      text: `${invite.name}, you have been invited to join a DiaryDock household.`,
      url,
      dialogTitle: "Share secure invitation",
    });
  } catch {
    await navigator.clipboard.writeText(url);
  }
}

export function HouseholdInvites({ busy, invites, onCancel, onRenew }: Props) {
  return (
    <section className="family-card">
      <div className="family-section-title"><div><p>Email-bound access</p><h2>Pending invitations</h2></div><span>{invites.length}</span></div>
      {invites.length ? <div className="family-invite-list">{invites.map((invite) => (
        <article key={invite.token}>
          <div><strong>{invite.name}</strong><span>{invite.email}</span><small>Expires {friendlyDate(invite.expiresAt)}</small></div>
          <div>
            <button type="button" onClick={() => void shareInvite(invite)}>Share link</button>
            <button type="button" disabled={busy} onClick={() => void onRenew(invite.token)}>Renew</button>
            <button type="button" disabled={busy} onClick={() => {
              if (window.confirm(`Cancel the invitation for ${invite.name}?`)) void onCancel(invite.token);
            }}>Cancel</button>
          </div>
        </article>
      ))}</div> : <p className="family-empty">No invitations are waiting.</p>}
    </section>
  );
}
