import type {
  OfficeBillsSnapshot,
  OfficeContactsSnapshot,
  OfficeContractsSnapshot,
  OfficeCorrespondenceSnapshot,
  OfficeInsuranceSnapshot,
} from "@diarydock/office";
import type { OfflineStore } from "@diarydock/offline-store";

import type { MobileDestination } from "@mobile/components/MobileBottomNav";
import type { OfficeArea } from "./OfficeOverview";

export type OfficeScreenProps = {
  accessToken: string;
  disableOnline?: boolean;
  initialInsuranceSnapshot?: OfficeInsuranceSnapshot;
  initialSnapshot?: OfficeBillsSnapshot;
  initialContactsSnapshot?: OfficeContactsSnapshot;
  initialContractsSnapshot?: OfficeContractsSnapshot;
  initialCorrespondenceSnapshot?: OfficeCorrespondenceSnapshot;
  initialArea?: OfficeArea;
  store: OfflineStore;
  syncStatus: string;
  synchronize: () => Promise<unknown>;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onOpenSafeRoom: () => void;
  onScan: (roomName: string) => void;
};
