import type { RoomProfile } from "@diarydock/home";
import type { OfflineStore } from "@diarydock/offline-store";

import type { MobileDestination } from "@mobile/components/MobileBottomNav";
import {
  AtticScreen,
  DrivewayScreen,
  GarageScreen,
  GardenScreen,
  HealthScreen,
  MailboxScreen,
  OfficeScreen,
  RoomScreen,
  SafeRoomScreen,
} from "@mobile/signed-in-screens";

type Props = {
  accessToken: string;
  profile: RoomProfile;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onOpenKitchen: () => void;
  onOpenSafeRoom: () => void;
  onScan: (roomName: string) => void;
};

export function SignedInRoom(props: Props) {
  const common = {
    accessToken: props.accessToken,
    store: props.store,
    syncStatus: props.syncStatus,
    onBack: props.onBack,
    onNavigate: props.onNavigate,
    onScan: props.onScan,
  };
  if (props.profile.id === "attic") {
    return <AtticScreen {...common} synchronize={props.synchronize} />;
  }
  if (props.profile.id === "garage") return <GarageScreen {...common} />;
  if (props.profile.id === "driveway") {
    return <DrivewayScreen {...common} synchronize={props.synchronize} />;
  }
  if (props.profile.id === "garden") {
    return <GardenScreen {...common} synchronize={props.synchronize} />;
  }
  if (props.profile.id === "bedroom") {
    return <HealthScreen {...common} synchronize={props.synchronize} />;
  }
  if (props.profile.id === "mailbox") {
    return <MailboxScreen {...common} synchronize={props.synchronize} />;
  }
  if (props.profile.id === "safe-room") {
    return <SafeRoomScreen {...common} synchronize={props.synchronize} />;
  }
  if (props.profile.id === "office") {
    return <OfficeScreen {...common} synchronize={props.synchronize}
      onOpenSafeRoom={props.onOpenSafeRoom} />;
  }
  return <RoomScreen {...common} profile={props.profile}
    synchronize={props.synchronize} onOpenKitchen={props.onOpenKitchen} />;
}
