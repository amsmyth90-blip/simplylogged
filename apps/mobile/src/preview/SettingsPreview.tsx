import type { User } from "@supabase/supabase-js";

import { SettingsScreen } from "@mobile/settings/SettingsScreen";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  app_metadata: { provider: "email" },
  email: "amy@example.com",
  created_at: "2025-02-14T10:00:00.000Z",
  user_metadata: { full_name: "Amy Smyth" },
} as User;

export function SettingsPreview() {
  return (
    <SettingsScreen
      accessToken="preview-token-not-used-123456"
      initialSummary={{
        profile: { name: "Amy Smyth", email: "amy@example.com", memberSince: user.created_at },
        analytics: { enabled: false, retentionDays: 90 },
        storage: { tier: "standard", usedBytes: 86 * 1024 ** 2, reservedBytes: 0, limitBytes: 1024 ** 3 },
        forwarding: { configured: true, address: "home-example@inbound.diarydock.com" },
      }}
      user={user}
      syncStatus="READY"
      synchronize={async () => true}
      onBack={() => undefined}
      onNavigate={() => undefined}
      onSignOut={() => undefined}
    />
  );
}
