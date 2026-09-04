import { MobileBottomNav } from "@mobile/components/MobileBottomNav";
import { OfficeContent } from "./OfficeContent";
import { OfficeEditors } from "./OfficeEditors";
import { OfficeOverview } from "./OfficeOverview";
import type { OfficeScreenProps } from "./office-screen-types";
import { useOfficeWorkspace } from "./use-office-workspace";
import "./office.css";

export function OfficeScreen(props: OfficeScreenProps) {
  const office = useOfficeWorkspace(props);
  return <main className="office-screen">
    <OfficeOverview area={office.area} bills={office.billsState.snapshot}
      contacts={office.contacts.snapshot} contracts={office.contracts.snapshot}
      correspondence={office.correspondence.snapshot} insurance={office.insurance.snapshot}
      syncStatus={props.syncStatus} onAdd={office.addRecord} onArea={office.setArea}
      onBack={props.onBack} onOpenSafeRoom={props.onOpenSafeRoom}
      onScan={() => props.onScan("Office")} />
    <OfficeContent office={office} />
    <OfficeEditors office={office} />
    <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
  </main>;
}
