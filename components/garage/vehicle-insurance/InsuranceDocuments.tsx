import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";
import { useVehicleInsuranceModel } from "@/components/garage/vehicle-insurance/VehicleInsuranceContext";
import {
  DocumentRow,
  Empty,
  SectionTitle,
} from "@/components/garage/vehicle-insurance/InsuranceUi";

export function InsuranceDocuments() {
  const { insuranceDocuments, setDialog, vehicle } = useVehicleInsuranceModel();
  if (!vehicle) return null;
  const currentIds = new Set(vehicle.motorInsurance.documentIds);
  const current = insuranceDocuments.filter((document) =>
    currentIds.has(document.id),
  );
  const available = insuranceDocuments.filter(
    (document) => !currentIds.has(document.id),
  );
  const readable = insuranceDocuments.filter(
    (document) =>
      document.extractionSummary || document.reviewStatus === "needs-review",
  );

  return (
    <div className="space-y-4">
      <BillsCard>
        <SectionTitle
          title="Policy documents"
          detail="Original files remain private in All Files"
          action={
            <Link
              href="/capture?room=garage"
              className="inline-flex min-h-11 items-center gap-1 rounded-[12px] bg-[#355540] px-3 text-xs font-semibold text-white"
            >
              <UiIcon name="plus" className="h-4 w-4" />
              Scan
            </Link>
          }
        />
        <div className="mt-4 space-y-2">
          {current.length ? (
            current.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                vehicleId={vehicle.id}
                badge="Current"
              />
            ))
          ) : (
            <Empty
              icon="folder"
              title="No current policy documents linked"
              detail="Scan a policy file or link an existing Garage insurance document."
            />
          )}
        </div>
        <button
          type="button"
          onClick={() => setDialog("documents")}
          className="mt-4 min-h-12 w-full rounded-[14px] border border-[#6f8e72]/30 text-xs font-semibold text-[#45604d]"
        >
          Manage linked documents
        </button>
      </BillsCard>
      {available.length ? (
        <BillsCard>
          <SectionTitle
            title="Other insurance documents"
            detail="Insurance-related files linked to this vehicle"
          />
          <div className="mt-4 space-y-2">
            {available.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                vehicleId={vehicle.id}
              />
            ))}
          </div>
        </BillsCard>
      ) : null}
      <BillsCard className="bg-[linear-gradient(135deg,#f1f4ea,#fffdf8)]">
        <SectionTitle
          title="Document reading"
          detail="DiaryDock can suggest details from scanned documents for you to check"
        />
        <div className="mt-4 space-y-2">
          {readable.map((document) => (
            <Link
              key={document.id}
              href={`/document/${document.id}?from=vehicle&vehicleId=${vehicle.id}`}
              className="flex min-h-[68px] items-center gap-3 rounded-[16px] bg-white/80 px-3"
            >
              <UiIcon name="file" className="h-5 w-5 text-[#52705a]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-[#20352a]">
                  {document.title}
                </span>
                <span className="line-clamp-2 text-[10px] leading-4 text-[#667068]">
                  {document.reviewStatus === "needs-review"
                    ? "Check the suggested details against the original."
                    : document.extractionSummary}
                </span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
            </Link>
          ))}
          {!readable.length ? (
            <p className="rounded-[15px] bg-white/70 px-4 py-3 text-[11px] leading-5 text-[#667068]">
              Scanned documents with suggested details will appear here for
              review. DiaryDock never treats extracted information as confirmed
              until you check it.
            </p>
          ) : null}
        </div>
      </BillsCard>
    </div>
  );
}
