import { useMemo } from "react";

import { roomProfiles } from "@diarydock/home";

import { PreviewStore } from "@mobile/preview/MobilePreview";
import { RoomScreen } from "@mobile/rooms/RoomScreen";

export function RoomPreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return (
    <RoomScreen
      accessToken="preview-token-not-used-123456"
      profile={roomProfiles.office!}
      store={store}
      syncStatus="READY"
      synchronize={async () => true}
      onBack={() => undefined}
      onNavigate={() => undefined}
      onOpenKitchen={() => undefined}
      onScan={() => undefined}
    />
  );
}
