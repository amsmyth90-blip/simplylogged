import { roomProfiles } from "@diarydock/home";

import { RoomSceneScreen } from "@mobile/rooms/RoomSceneScreen";

export function RoomPreview() {
  const roomId = new URLSearchParams(window.location.search).get("room") ?? "office";
  const profile = roomProfiles[roomId] ?? roomProfiles.office!;
  return (
    <RoomSceneScreen
      profile={profile}
      syncStatus="READY"
      onBack={() => undefined}
      onNavigate={() => undefined}
      onOpen={() => undefined}
    />
  );
}
