import { useMemo } from "react";

import { GuardianScreen } from "@mobile/guardian/GuardianScreen";

import { PreviewStore } from "./MobilePreview";

export function GuardianPreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return (
    <GuardianScreen
      accessToken="guardian-preview-access-token"
      disableOnline
      store={store}
      syncStatus="READY"
      onBack={() => undefined}
      onNavigate={() => undefined}
    />
  );
}
