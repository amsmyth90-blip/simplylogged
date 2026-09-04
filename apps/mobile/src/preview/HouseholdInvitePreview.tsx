import { HouseholdInviteScreen } from "@mobile/family/HouseholdInviteScreen";

export function HouseholdInvitePreview() {
  return <HouseholdInviteScreen
    accessToken="preview-only"
    token="11111111-1111-4111-8111-111111111111"
    initialInvite={{
      token: "11111111-1111-4111-8111-111111111111",
      householdName: "Greenwood Household",
      name: "Amy Smyth",
      relation: "Partner",
      access: "Adult — shared household spaces",
      expiresAt: "2026-09-18T12:00:00.000Z",
    }}
    onAccepted={() => undefined}
    onClose={() => undefined}
  />;
}
