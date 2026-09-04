import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";
import {
  formatInsuranceDate,
  formatInsuranceMoney,
  humanInsuranceStatus,
  insuranceRenewalMessage,
} from "@/components/garage/vehicle-insurance-model";
import { useVehicleInsuranceModel } from "@/components/garage/vehicle-insurance/VehicleInsuranceContext";
import {
  ActionButton,
  ActionLink,
  InfoTile,
  SectionTitle,
  StatusPill,
} from "@/components/garage/vehicle-insurance/InsuranceUi";

export function InsuranceOverview() {
  const { openClaim, openPolicy, vehicle } = useVehicleInsuranceModel();
  if (!vehicle) return null;
  const insurance = vehicle.motorInsurance;
  const renewal = insuranceRenewalMessage(vehicle.insuranceRenewalDate);
  const base = `/garage/vehicles/${vehicle.id}/insurance`;
  const excess =
    insurance.voluntaryExcess === null && insurance.compulsoryExcess === null
      ? "Not recorded"
      : `Voluntary ${formatInsuranceMoney(insurance.voluntaryExcess)} · Compulsory ${formatInsuranceMoney(insurance.compulsoryExcess)}`;

  return (
    <div className="space-y-4">
      <BillsCard className="bg-[linear-gradient(135deg,#edf3e9,#fffdf8)]">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#52705a]">
            <UiIcon name="shield" className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f8e72]">
                Policy status
              </p>
              <StatusPill status={insurance.status} />
            </div>
            <h2 className="mt-1 text-lg font-semibold text-[#20352a]">
              {humanInsuranceStatus(insurance.status)}
            </h2>
            <p className="mt-1 text-[11px] text-[#667068]">
              {insurance.status === "not-recorded"
                ? "Add your current policy details."
                : "Status recorded by you in DiaryDock."}
            </p>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0ecff] text-[#6d5ca5]">
            <UiIcon name="calendar" className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[10px] font-semibold text-[#667068]">
              Renewal date
            </p>
            <p className="mt-1 text-lg font-semibold text-[#20352a]">
              {formatInsuranceDate(vehicle.insuranceRenewalDate)}
            </p>
            <p className={`mt-1 text-[11px] font-semibold ${renewal.tone}`}>
              {renewal.label}
            </p>
          </div>
        </div>
      </BillsCard>
      <div className="grid grid-cols-2 gap-3">
        <InfoTile
          label="Provider"
          value={insurance.provider || "Not recorded"}
        />
        <InfoTile
          label="Policy number"
          value={insurance.policyNumber || "Not recorded"}
        />
        <InfoTile
          label="Cover type"
          value={insurance.coverType || "Not recorded"}
        />
        <InfoTile
          label="Premium"
          value={formatInsuranceMoney(insurance.premium)}
        />
        <InfoTile label="Excess" value={excess} />
        <InfoTile
          label="Named drivers"
          value={`${insurance.namedDrivers.length} recorded`}
        />
      </div>
      <BillsCard className="bg-[linear-gradient(135deg,#f1f4ea,#fffdf8)]">
        <div className="flex items-start gap-3">
          <UiIcon
            name="alert"
            className="mt-0.5 h-5 w-5 shrink-0 text-[#52705a]"
          />
          <div>
            <p className="text-xs font-semibold text-[#20352a]">
              Need to make a change?
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#667068]">
              Update your policy, keep its documents together or record a claim.
            </p>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <SectionTitle
          title="Quick actions"
          detail="Choose what you need to do next"
        />
        <div className="mt-4 space-y-2">
          <ActionLink
            href={`${base}?view=documents`}
            icon="folder"
            label="View policy documents"
          />
          <ActionButton icon="car" label="Record a claim" onClick={openClaim} />
          <ActionLink
            href={
              insurance.providerPhone
                ? `tel:${insurance.providerPhone}`
                : `${base}?view=policy`
            }
            icon="phone"
            label={
              insurance.providerPhone
                ? "Contact provider"
                : "Add provider contact"
            }
          />
          <ActionButton
            icon="gear"
            label="Update policy details"
            onClick={openPolicy}
          />
        </div>
      </BillsCard>
    </div>
  );
}
