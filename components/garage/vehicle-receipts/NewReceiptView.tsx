import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";
import type { VehicleRecord } from "@/lib/vehicle-records";

import { ReceiptForm } from "./ReceiptForm";
import { ReceiptShell } from "./ReceiptShell";
import { useNewReceipt } from "./useNewReceipt";

export function NewReceiptView({
  vehicle,
  name,
  mileage,
  base,
}: {
  vehicle: VehicleRecord;
  name: string;
  mileage: number | null;
  base: string;
}) {
  const receipt = useNewReceipt(vehicle, base);

  return (
    <ReceiptShell
      vehicle={vehicle}
      name={name}
      mileage={mileage}
      title="Add Receipt"
      backHref={base}
    >
      <form onSubmit={receipt.saveReceipt} className="space-y-4">
        <BillsCard>
          <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed border-[#6f8e72]/35 bg-[#faf9f4] px-4 text-center focus-within:ring-2 focus-within:ring-[#6f8e72]">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e8efe5] text-[#315d45]">
              <UiIcon name="camera" className="h-7 w-7" />
            </span>
            <span className="mt-3 text-sm font-semibold text-[#20352a]">
              {receipt.file
                ? receipt.file.name
                : "Take a photo or select a file"}
            </span>
            <span className="mt-1 text-[10px] text-[#667068]">
              PDF, JPG, PNG, WebP or HEIC · maximum 4 MB
            </span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
              capture="environment"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) void receipt.analyseReceipt(selected);
              }}
              className="sr-only"
            />
          </label>
        </BillsCard>
        {receipt.working ? (
          <BillsCard className="bg-[linear-gradient(135deg,#edf3e9,#fffdf8)]">
            <div className="flex items-center gap-3">
              <UiIcon name="search" className="h-5 w-5 text-[#52705a]" />
              <div>
                <p className="text-xs font-semibold text-[#20352a]">
                  Reading receipt
                </p>
                <p className="mt-1 text-[10px] text-[#667068]">
                  DiaryDock is suggesting details for you to check.
                </p>
              </div>
            </div>
          </BillsCard>
        ) : null}
        {receipt.message ? (
          <p
            role="status"
            className="rounded-[16px] bg-[#f1ecdf] px-4 py-3 text-[11px] leading-5 text-[#806b45]"
          >
            {receipt.message}
          </p>
        ) : null}
        <ReceiptForm
          draft={receipt.draft}
          setDraft={receipt.setDraft}
          services={vehicle.services}
        />
        <button
          type="submit"
          disabled={receipt.working || !receipt.file}
          className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {receipt.working ? "Please wait…" : "Check and save receipt"}
        </button>
      </form>
    </ReceiptShell>
  );
}
