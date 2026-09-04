import { UiIcon } from "@/components/UiIcon";
import { friendlyAccessDate } from "./people-sharing-model";
import { householdAuditLabel } from "@/lib/household-access";
import type {
  HouseholdAccessEvent,
  HouseholdDirectoryInvite,
  HouseholdDirectoryMember,
} from "@/lib/household-sharing";

export function HouseholdAccessActivity({
  busy,
  canManage,
  events,
  invites,
  members,
  onChangeInvite,
  onCopyInvite,
}: {
  busy: string;
  canManage: boolean;
  events: HouseholdAccessEvent[];
  invites: HouseholdDirectoryInvite[];
  members: HouseholdDirectoryMember[];
  onChangeInvite: (token: string, action: "renew" | "cancel") => void;
  onCopyInvite: (token: string) => void;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="estate-sheet p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Pending invitations
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink/48">
              Links work only for the invited email address.
            </p>
          </div>
          {canManage ? (
            <span className="rounded-full bg-sage/60 px-2.5 py-1 text-xs font-semibold text-moss">
              {invites.length}
            </span>
          ) : null}
        </div>
        <div className="mt-3 space-y-2">
          {invites.length ? (
            invites.map((invite) => (
              <div key={invite.token} className="rounded-2xl bg-white/72 p-3">
                <p className="truncate text-sm font-semibold text-ink">
                  {invite.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink/48">
                  {invite.email} · expires{" "}
                  {friendlyAccessDate(invite.expiresAt)}
                </p>
                {canManage ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onCopyInvite(invite.token)}
                      className="rounded-full bg-sage/60 px-3 py-1.5 text-[11px] font-semibold text-moss"
                    >
                      Copy link
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => onChangeInvite(invite.token, "renew")}
                      className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink/55"
                    >
                      Renew
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => onChangeInvite(invite.token, "cancel")}
                      className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-rose-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <EmptyActivity>No invitations are waiting.</EmptyActivity>
          )}
        </div>
      </div>
      <div className="estate-sheet p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ink">
          Recent access changes
        </h2>
        <p className="mt-1 text-xs leading-5 text-ink/48">
          Security history avoids document titles and personal content.
        </p>
        <div className="mt-3 space-y-2">
          {events.length ? (
            events.slice(0, 6).map((event) => {
              const actor = members.find(
                (member) => member.userId === event.actorUserId,
              );
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-2xl bg-white/72 px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist text-ink/50">
                    <UiIcon name="shield" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink">
                      {householdAuditLabel(event.eventType)}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-ink/42">
                      {actor?.name ?? "Household member"} ·{" "}
                      {friendlyAccessDate(event.createdAt)}
                    </span>
                  </span>
                </div>
              );
            })
          ) : (
            <EmptyActivity>No access changes recorded yet.</EmptyActivity>
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyActivity({ children }: { children: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-black/10 bg-white/45 px-4 py-5 text-center text-sm text-ink/45">
      {children}
    </p>
  );
}
