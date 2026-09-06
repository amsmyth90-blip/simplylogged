import type { OfflineStore } from "@diarydock/offline-store";

import type { MobileDestination } from "@mobile/components/MobileBottomNav";
import { KitchenCalendarScreen, KitchenNoticeboardScreen,
  KitchenPlanningScreen, KitchenScreen } from "@mobile/signed-in-screens";

type Props = {
  accessToken: string;
  destination: MobileDestination;
  store: OfflineStore;
  syncStatus: string;
  onBackToRoom: () => void;
  onNavigate: (destination: MobileDestination) => void;
};

export function SignedInKitchen(props: Props) {
  if (props.destination === "KITCHEN") return <KitchenScreen
    accessToken={props.accessToken} store={props.store} syncStatus={props.syncStatus}
    onBack={props.onBackToRoom} onNavigate={props.onNavigate} />;
  if (props.destination === "KITCHEN_CALENDAR") return <KitchenCalendarScreen
    accessToken={props.accessToken} store={props.store} syncStatus={props.syncStatus}
    onBack={() => props.onNavigate("KITCHEN")} onNavigate={props.onNavigate} />;
  if (props.destination === "KITCHEN_NOTICES") return <KitchenNoticeboardScreen
    accessToken={props.accessToken} store={props.store} syncStatus={props.syncStatus}
    onBack={() => props.onNavigate("KITCHEN")} onNavigate={props.onNavigate} />;
  if (props.destination === "KITCHEN_RECIPES" || props.destination === "KITCHEN_MEALS") {
    return <KitchenPlanningScreen accessToken={props.accessToken} store={props.store}
      syncStatus={props.syncStatus}
      initialView={props.destination === "KITCHEN_RECIPES" ? "RECIPES" : "MEALS"}
      onBack={() => props.onNavigate("KITCHEN")} onNavigate={props.onNavigate} />;
  }
  return null;
}
