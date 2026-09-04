import Link from "next/link";

import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";
import { Empty } from "@/components/garage/vehicle-insurance/InsuranceUi";
import { useVehicleInsuranceModel } from "@/components/garage/vehicle-insurance/VehicleInsuranceContext";

export function InsuranceDocumentsDialog() {
  const {
    closeDialog,
    dialog,
    insuranceDocuments,
    togglePolicyDocument,
    vehicle,
  } = useVehicleInsuranceModel();
  if (!vehicle) return null;
  const currentIds = new Set(vehicle.motorInsurance.documentIds);
  return (
    <ModalShell
      open={dialog === "documents"}
      title="Policy documents"
      subtitle="Choose which existing Garage insurance files belong to the current policy."
      onClose={closeDialog}
    >
      <div className="space-y-2">
        {insuranceDocuments.length ? (
          insuranceDocuments.map((document) => (
            <label
              key={document.id}
              className="flex min-h-[64px] cursor-pointer items-center gap-3 rounded-[16px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"
            >
              <input
                type="checkbox"
                checked={currentIds.has(document.id)}
                onChange={() => togglePolicyDocument(document.id)}
                className="h-4 w-4 accent-[#45604d]"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-[#20352a]">
                  {document.title}
                </span>
                <span className="text-[10px] text-[#667068]">
                  {document.kind} · {document.updated}
                </span>
              </span>
            </label>
          ))
        ) : (
          <Empty
            icon="folder"
            title="No insurance documents found"
            detail="Scan a document first, then return here to link it."
          />
        )}
      </div>
      <Link
        href="/capture?room=garage"
        className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#355540] text-xs font-semibold text-white"
      >
        <UiIcon name="plus" className="h-4 w-4" />
        Scan insurance document
      </Link>
    </ModalShell>
  );
}
