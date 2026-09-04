import type { HouseholdDirectory } from "@diarydock/household";

import { initials, roleDescription, roleLabel } from "./family-utils";

type Props = {
  household: HouseholdDirectory;
  busy: boolean;
  onRemove: (userId: string) => Promise<void>;
  onRole: (userId: string, role: "member" | "viewer") => Promise<void>;
};

function managedRole(value: string): "member" | "viewer" {
  return value === "member" ? "member" : "viewer";
}

export function HouseholdMembers({ household, busy, onRemove, onRole }: Props) {
  const canManage = household.role === "owner";
  return (
    <section className="family-card">
      <div className="family-section-title"><div><p>Private by default</p><h2>Household members</h2></div><span>{household.members.length}</span></div>
      <div className="family-member-list">
        {household.members.map((member) => {
          const isCurrent = member.userId === household.currentUserId;
          return (
            <article className="family-member" key={member.userId}>
              <span className="family-avatar">{initials(member.name)}</span>
              <div><strong>{member.name}{isCurrent ? <small> You</small> : null}</strong><span>{roleLabel(member.role)} · {member.relation}</span><p>{roleDescription(member.role)}</p></div>
              {canManage && member.role !== "owner" ? (
                <div className="family-member-actions">
                  <select
                    aria-label={`Access role for ${member.name}`}
                    disabled={busy}
                    value={managedRole(member.role)}
                    onChange={(event) => void onRole(member.userId, event.target.value as "member" | "viewer")}
                  ><option value="viewer">Member</option><option value="member">Adult</option></select>
                  <button type="button" disabled={busy} onClick={() => {
                    if (window.confirm(`Remove ${member.name} from this household?`)) void onRemove(member.userId);
                  }}>Remove</button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
