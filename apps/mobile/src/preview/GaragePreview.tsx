import { useMemo } from "react";

import type { GarageSnapshot } from "@diarydock/vehicles";

import { GarageScreen } from "@mobile/garage/GarageScreen";
import type { GarageTab } from "@mobile/garage/GarageRecords";
import { PreviewStore } from "@mobile/preview/MobilePreview";

const snapshot: GarageSnapshot = {
  schemaVersion: 1,
  revision: "2026-09-02T09:00:00.000Z",
  vehicles: [
    {
      id: "family-car",
      displayName: "Family car",
      make: "Volvo",
      model: "XC40",
      registration: "AB12 CDE",
      year: 2024,
      mileage: 24_500,
      motDueDate: "2027-02-10",
      taxDueDate: "2027-01-01",
      insuranceRenewalDate: "2026-11-08",
      nextServiceDate: "2027-03-12",
      breakdownRenewalDate: "2026-12-04",
      documentCount: 7,
      totalSpend: 1_476.72,
      services: [
        {
          id: "service-1",
          kind: "service",
          title: "Annual service",
          provider: "North Garage",
          date: "2026-07-12",
          mileage: 23_900,
          cost: 280,
          notes: "Oil, filters and safety inspection completed.",
        },
        {
          id: "service-2",
          kind: "repair",
          title: "Rear brake pads",
          provider: "North Garage",
          date: "2026-02-18",
          mileage: 21_820,
          cost: 194.5,
          notes: "Pads replaced and discs inspected.",
        },
      ],
      expenses: [
        {
          id: "expense-1",
          category: "Fuel",
          title: "Petrol",
          provider: "Shell",
          amount: 68.24,
          date: "2026-08-29",
          notes: "",
        },
        {
          id: "expense-2",
          category: "Insurance",
          title: "Annual motor insurance",
          provider: "Aviva",
          amount: 612.98,
          date: "2026-04-08",
          notes: "Comprehensive cover.",
        },
      ],
      notes: [
        {
          id: "note-1",
          title: "Locking wheel nut",
          content: "Stored beneath the boot floor beside the tyre kit.",
          updatedAt: "2026-08-20T09:00:00.000Z",
        },
      ],
    },
  ],
};

export function GaragePreview() {
  const store = useMemo(() => new PreviewStore(), []);
  const requested = new URLSearchParams(window.location.search).get("view");
  const tabs: GarageTab[] = ["profile", "mot-tax", "insurance", "services", "costs", "notes"];
  const initialTab = tabs.includes(requested as GarageTab) ? requested as GarageTab : "profile";
  return (
    <GarageScreen
      accessToken="preview-access-token-that-is-long-enough"
      disableOnline
      initialSnapshot={snapshot}
      initialTab={initialTab}
      store={store}
      syncStatus="READY"
      onBack={() => undefined}
      onNavigate={() => undefined}
      onScan={() => undefined}
    />
  );
}
