import { useState } from "react";

import type { AtticSectionId } from "@diarydock/attic";
import type { GardenSectionId } from "@diarydock/garden";
import type { RoomProfile } from "@diarydock/home";
import type { OfflineStore } from "@diarydock/offline-store";

import type { MobileDestination } from "@mobile/components/MobileBottomNav";
import type { GarageTab } from "@mobile/garage/GarageRecords";
import type { HealthView } from "@mobile/health/HealthRecords";
import type { OfficeArea } from "@mobile/office/OfficeOverview";
import { RoomSceneScreen } from "@mobile/rooms/RoomSceneScreen";
import type { RoomSceneAction } from "@mobile/rooms/room-scene-config";
import type { WillsView } from "@mobile/wills/wills-model";
import {
  AtticScreen,
  DrivewayScreen,
  FamilyScreen,
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
  onOpenKitchenAction: (actionId: string) => void;
  onOpenSafeRoom: () => void;
  onScan: (roomName: string) => void;
};

export function SignedInRoom(props: Props) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  function openAction(action: RoomSceneAction) {
    if (props.profile.id === "kitchen") {
      props.onOpenKitchenAction(action.id);
      return;
    }
    if (props.profile.id === "office" && action.id === "safe-room") {
      props.onOpenSafeRoom();
      return;
    }
    if (props.profile.id === "mailbox" && action.id === "scan") {
      props.onScan("Mailbox");
      return;
    }
    setActiveAction(action.id);
  }
  if (!activeAction) {
    return <RoomSceneScreen profile={props.profile} syncStatus={props.syncStatus}
      onBack={props.onBack} onNavigate={props.onNavigate} onOpen={openAction} />;
  }

  const common = {
    accessToken: props.accessToken,
    store: props.store,
    syncStatus: props.syncStatus,
    onBack: () => setActiveAction(null),
    onNavigate: props.onNavigate,
    onScan: props.onScan,
  };
  if (props.profile.id === "attic") {
    return <AtticScreen {...common} initialSection={activeAction as AtticSectionId}
      synchronize={props.synchronize} />;
  }
  if (props.profile.id === "garage") {
    return <GarageScreen {...common} initialTab={activeAction as GarageTab} />;
  }
  if (props.profile.id === "driveway") {
    return <DrivewayScreen {...common} synchronize={props.synchronize} />;
  }
  if (props.profile.id === "garden") {
    return <GardenScreen {...common} initialSection={activeAction as GardenSectionId}
      synchronize={props.synchronize} />;
  }
  if (props.profile.id === "bedroom") {
    const view = activeAction === "medications" || activeAction === "appointments"
      ? activeAction : "overview";
    return <HealthScreen {...common} initialView={view as HealthView}
      synchronize={props.synchronize} />;
  }
  if (props.profile.id === "mailbox") {
    return <MailboxScreen {...common} synchronize={props.synchronize} />;
  }
  if (props.profile.id === "safe-room") {
    return <SafeRoomScreen {...common} initialView={activeAction as WillsView}
      synchronize={props.synchronize} />;
  }
  if (props.profile.id === "office") {
    return <OfficeScreen {...common} initialArea={activeAction as OfficeArea}
      synchronize={props.synchronize}
      onOpenSafeRoom={props.onOpenSafeRoom} />;
  }
  if (props.profile.id === "family-room") {
    return <FamilyScreen {...common}
      initialView={activeAction as "household" | "inbox" | "schedules"}
      synchronize={props.synchronize} />;
  }
  return <RoomScreen {...common} profile={props.profile}
    synchronize={props.synchronize} onOpenKitchen={props.onOpenKitchen} />;
}
