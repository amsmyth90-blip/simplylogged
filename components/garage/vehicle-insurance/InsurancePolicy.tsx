import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";
import {
  formatInsuranceDate,
  formatInsuranceMoney,
  humanInsuranceStatus,
  insuranceBooleanLabel,
} from "@/components/garage/vehicle-insurance-model";
import { useVehicleInsuranceModel } from "@/components/garage/vehicle-insurance/VehicleInsuranceContext";
import {
  Detail,
  Empty,
  SectionTitle,
} from "@/components/garage/vehicle-insurance/InsuranceUi";

export function InsurancePolicy() {
  const { openDriver, openPolicy, vehicle } = useVehicleInsuranceModel();
  if (!vehicle) return null;
  const insurance = vehicle.motorInsurance;
  const noClaims =
    insurance.noClaimsYears === null
      ? "Not recorded"
      : `${insurance.noClaimsYears} year${insurance.noClaimsYears === 1 ? "" : "s"}`;

  return (
    <div className="space-y-4">
      <BillsCard>
        <SectionTitle
          title="Policy details"
          detail="Your current motor insurance information"
          action={
            <button
              type="button"
              onClick={openPolicy}
              className="min-h-11 rounded-[12px] bg-[#eef2e9] px-3 text-xs font-semibold text-[#45604d]"
            >
              Update
            </button>
          }
        />
        <dl className="mt-4">
          <Detail
            label="Provider"
            value={insurance.provider || "Not recorded"}
          />
          <Detail
            label="Policy number"
            value={insurance.policyNumber || "Not recorded"}
          />
          <Detail
            label="Status"
            value={humanInsuranceStatus(insurance.status)}
          />
          <Detail
            label="Cover type"
            value={insurance.coverType || "Not recorded"}
          />
          <Detail
            label="Policy start date"
            value={formatInsuranceDate(insurance.policyStartDate)}
          />
          <Detail
            label="Renewal date"
            value={formatInsuranceDate(vehicle.insuranceRenewalDate)}
          />
          <Detail
            label="Premium"
            value={formatInsuranceMoney(insurance.premium)}
          />
          <Detail
            label="Payment method"
            value={insurance.paymentFrequency || "Not recorded"}
          />
          <Detail
            label="Voluntary excess"
            value={formatInsuranceMoney(insurance.voluntaryExcess)}
          />
          <Detail
            label="Compulsory excess"
            value={formatInsuranceMoney(insurance.compulsoryExcess)}
          />
          <Detail label="Protected no-claims bonus" value={noClaims} />
          <Detail
            label="Courtesy car"
            value={insuranceBooleanLabel(insurance.courtesyCar)}
          />
          <Detail
            label="Windscreen cover"
            value={insuranceBooleanLabel(insurance.windscreenCover)}
          />
          <Detail
            label="Legal expenses cover"
            value={insuranceBooleanLabel(insurance.legalExpensesCover)}
          />
          <Detail
            label="Breakdown cover"
            value={insuranceBooleanLabel(insurance.breakdownIncluded)}
          />
          {insurance.notes ? (
            <Detail label="Policy note" value={insurance.notes} />
          ) : null}
        </dl>
      </BillsCard>
      <BillsCard>
        <SectionTitle
          title="Named drivers"
          detail="People you have recorded on this policy"
          action={
            <button
              type="button"
              onClick={openDriver}
              className="min-h-11 rounded-[12px] bg-[#eef2e9] px-3 text-xs font-semibold text-[#45604d]"
            >
              Add driver
            </button>
          }
        />
        <div className="mt-4 space-y-2">
          {insurance.namedDrivers.length ? (
            insurance.namedDrivers.map((driver) => (
              <div
                key={driver.id}
                className="flex min-h-[68px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7ebe1] text-[#52705a]">
                  <UiIcon name="users" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-[#20352a]">
                    {driver.name}
                  </span>
                  <span className="text-[10px] text-[#667068]">
                    {driver.relationship || "Relationship not recorded"}
                  </span>
                </span>
                {driver.mainDriver ? (
                  <span className="rounded-full bg-[#e5efdf] px-2 py-1 text-[9px] font-semibold text-[#45604d]">
                    Main driver
                  </span>
                ) : null}
              </div>
            ))
          ) : (
            <Empty
              icon="users"
              title="No named drivers recorded"
              detail="Add only the people confirmed on the policy."
            />
          )}
        </div>
      </BillsCard>
    </div>
  );
}
