import Link from "next/link";

import { HealthCard, HealthEmpty } from "./BedroomSectionUi";
import type { BedroomSectionController } from "./useBedroomSection";

export function BedroomFamilyHealth({
  bedroom,
}: {
  bedroom: BedroomSectionController;
}) {
  return (
    <HealthCard>
      <h2 className="font-serif text-2xl">Existing family profiles</h2>
      <p className="mt-1 text-xs leading-5 text-[#667068]">
        Selecting a profile only organises your private view. It does not grant
        that person access to health information.
      </p>
      <div className="mt-4 space-y-2">
        {bedroom.state.householdMembers.map((member) => {
          const checked = bedroom.health.familyMemberIds.includes(member.id);
          return (
            <label
              key={member.id}
              className="flex min-h-14 items-center gap-3 rounded-[18px] bg-[#f7f5ef] px-3"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  bedroom.updateState((current) => ({
                    ...current,
                    health: {
                      ...current.health,
                      familyMemberIds: checked
                        ? current.health.familyMemberIds.filter(
                            (id) => id !== member.id,
                          )
                        : [...current.health.familyMemberIds, member.id],
                      updatedAt: new Date().toISOString(),
                    },
                  }))
                }
                className="h-4 w-4"
              />
              <span className="flex-1 text-sm font-semibold">
                {member.name}
              </span>
              <span className="text-[10px] text-[#667068]">{member.role}</span>
            </label>
          );
        })}
        {!bedroom.state.householdMembers.length ? (
          <HealthEmpty
            icon="users"
            title="No family profiles available"
            detail="Create profiles in the existing Family Room first, then link them here."
            action={
              <Link
                href="/family/household"
                className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white"
              >
                Open Family profiles
              </Link>
            }
          />
        ) : null}
      </div>
    </HealthCard>
  );
}
