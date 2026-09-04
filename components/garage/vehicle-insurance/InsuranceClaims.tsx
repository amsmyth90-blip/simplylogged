import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";
import { formatInsuranceDate } from "@/components/garage/vehicle-insurance-model";
import { useVehicleInsuranceModel } from "@/components/garage/vehicle-insurance/VehicleInsuranceContext";
import {
  Empty,
  SectionTitle,
  StatusPill,
} from "@/components/garage/vehicle-insurance/InsuranceUi";

export function InsuranceClaims() {
  const { openClaim, state, vehicle } = useVehicleInsuranceModel();
  if (!vehicle) return null;
  const insurance = vehicle.motorInsurance;
  const documents = new Map(
    state.vaultDocuments.map((document) => [document.id, document]),
  );

  return (
    <div className="space-y-4">
      <BillsCard>
        <SectionTitle
          title="Claims"
          detail="Keep claim references, progress and evidence together"
          action={
            <button
              type="button"
              onClick={openClaim}
              className="min-h-11 rounded-[12px] bg-[#355540] px-3 text-xs font-semibold text-white"
            >
              Add claim
            </button>
          }
        />
        <div className="mt-4 space-y-3">
          {insurance.claims.length ? (
            [...insurance.claims]
              .sort((a, b) => b.incidentDate.localeCompare(a.incidentDate))
              .map((claim) => (
                <article
                  key={claim.id}
                  className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#faf9f4] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#20352a]">
                        {claim.claimType}
                      </p>
                      <p className="mt-1 text-[10px] text-[#667068]">
                        Incident {formatInsuranceDate(claim.incidentDate)}
                      </p>
                    </div>
                    <StatusPill status={claim.status} />
                  </div>
                  {claim.reference ? (
                    <p className="mt-3 text-[11px] text-[#667068]">
                      Reference{" "}
                      <strong className="text-[#20352a]">
                        {claim.reference}
                      </strong>
                    </p>
                  ) : null}
                  {claim.description ? (
                    <p className="mt-2 text-[11px] leading-5 text-[#667068]">
                      {claim.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {claim.documentIds.map((id) => {
                      const document = documents.get(id);
                      return document ? (
                        <Link
                          key={id}
                          href={`/document/${id}?from=vehicle&vehicleId=${vehicle.id}`}
                          className="inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-white px-3 text-[10px] font-semibold text-[#45604d]"
                        >
                          <UiIcon name="file" className="h-4 w-4" />
                          {document.title}
                        </Link>
                      ) : null;
                    })}
                  </div>
                </article>
              ))
          ) : (
            <Empty
              icon="shield"
              title="No claims recorded"
              detail="If you need it, create a private claim record and link supporting documents."
            />
          )}
        </div>
      </BillsCard>
      {insurance.claimsPhone ? (
        <a
          href={`tel:${insurance.claimsPhone}`}
          className="flex min-h-[72px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4"
        >
          <UiIcon name="phone" className="h-5 w-5 text-[#52705a]" />
          <span className="flex-1">
            <span className="block text-xs font-semibold text-[#20352a]">
              Claims contact
            </span>
            <span className="text-[11px] text-[#667068]">
              {insurance.claimsPhone}
            </span>
          </span>
        </a>
      ) : null}
    </div>
  );
}
