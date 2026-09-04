"use client";

import { BillsCard } from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { AllReceiptsView } from "@/components/garage/vehicle-receipts/AllReceiptsView";
import { NewReceiptView } from "@/components/garage/vehicle-receipts/NewReceiptView";
import { ReceiptDetailView } from "@/components/garage/vehicle-receipts/ReceiptDetailView";
import {
  ReceiptEmpty,
  ReceiptShell,
} from "@/components/garage/vehicle-receipts/ReceiptShell";
import { ReceiptsOverview } from "@/components/garage/vehicle-receipts/ReceiptsOverview";
import { latestMileage, vehicleDisplayName } from "@/lib/vehicle-records";

export type ReceiptsMode = "overview" | "all" | "new" | "detail";

export function VehicleReceiptsWorkspace({
  vehicleId,
  mode = "overview",
  receiptId,
}: {
  vehicleId: string;
  mode?: ReceiptsMode;
  receiptId?: string;
}) {
  const { state, hydrated } = useDiaryDockData();
  const vehicle = state.vehicles.vehicles.find((item) => item.id === vehicleId);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[760px] rounded-[24px] bg-white/80 p-8 text-sm text-[#667068]">
        Opening Receipts…
      </div>
    );
  }
  if (!vehicle) {
    return (
      <div className="mx-auto max-w-[760px]">
        <BillsCard>
          <p className="text-sm font-semibold text-[#20352a]">
            Vehicle not found
          </p>
        </BillsCard>
      </div>
    );
  }

  const receipts = vehicle.expenses.filter((expense) => expense.documentId);
  const receipt = receiptId
    ? receipts.find((expense) => expense.id === receiptId)
    : undefined;
  const document = receipt?.documentId
    ? state.vaultDocuments.find((item) => item.id === receipt.documentId)
    : undefined;
  const name = vehicleDisplayName(vehicle);
  const mileage = latestMileage(vehicle)?.mileage ?? null;
  const base = `/garage/vehicles/${vehicle.id}/costs/receipts`;
  const common = { vehicle, name, mileage, base };

  if (mode === "new") return <NewReceiptView {...common} />;
  if (mode === "all") {
    return <AllReceiptsView {...common} receipts={receipts} />;
  }
  if (mode === "detail" && receipt) {
    return (
      <ReceiptDetailView {...common} receipt={receipt} document={document} />
    );
  }
  if (mode === "detail") {
    return (
      <ReceiptShell
        vehicle={vehicle}
        name={name}
        mileage={mileage}
        title="Receipt Details"
        backHref={base}
      >
        <BillsCard>
          <ReceiptEmpty
            title="Receipt not found"
            detail="This receipt may have been removed or belongs to another vehicle."
          />
        </BillsCard>
      </ReceiptShell>
    );
  }

  return <ReceiptsOverview {...common} receipts={receipts} />;
}
