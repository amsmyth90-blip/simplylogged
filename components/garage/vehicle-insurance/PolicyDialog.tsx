import { fieldClass } from "@/components/bills/BillsUi";
import { ModalShell } from "@/components/ModalShell";
import {
  Area,
  Field,
  Submit,
  TriField,
} from "@/components/garage/vehicle-insurance/InsuranceFields";
import { useVehicleInsuranceModel } from "@/components/garage/vehicle-insurance/VehicleInsuranceContext";
import type { VehicleMotorInsurance } from "@/lib/vehicle-records";

export function PolicyDialog() {
  const model = useVehicleInsuranceModel();
  const {
    closeDialog,
    dialog,
    policyDraft,
    savePolicy,
    setPolicyDraft,
    vehicle,
  } = model;
  if (!vehicle) return null;
  const change = <Key extends keyof typeof policyDraft>(
    key: Key,
    value: (typeof policyDraft)[Key],
  ) => {
    setPolicyDraft((current) => ({ ...current, [key]: value }));
  };
  return (
    <ModalShell
      open={dialog === "policy"}
      title="Motor insurance policy"
      subtitle="Update confirmed policy details for this vehicle."
      onClose={closeDialog}
    >
      <form onSubmit={savePolicy} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Provider"
            value={policyDraft.provider}
            onChange={(value) => change("provider", value)}
          />
          <Field
            label="Policy number"
            value={policyDraft.policyNumber}
            onChange={(value) => change("policyNumber", value)}
          />
        </div>
        <label className="block text-xs font-semibold text-[#667068]">
          Policy status
          <select
            value={policyDraft.status}
            onChange={(event) =>
              change(
                "status",
                event.target.value as VehicleMotorInsurance["status"],
              )
            }
            className={fieldClass}
          >
            <option value="not-recorded">Not recorded</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Start date"
            type="date"
            value={policyDraft.policyStartDate}
            onChange={(value) => change("policyStartDate", value)}
          />
          <Field
            label="Renewal date"
            type="date"
            value={policyDraft.renewalDate}
            onChange={(value) => change("renewalDate", value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Premium"
            type="number"
            value={policyDraft.premium}
            onChange={(value) => change("premium", value)}
          />
          <Field
            label="Payment frequency"
            value={policyDraft.paymentFrequency}
            onChange={(value) => change("paymentFrequency", value)}
          />
        </div>
        <Field
          label="Cover type"
          value={policyDraft.coverType}
          onChange={(value) => change("coverType", value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Voluntary excess"
            type="number"
            value={policyDraft.voluntaryExcess}
            onChange={(value) => change("voluntaryExcess", value)}
          />
          <Field
            label="Compulsory excess"
            type="number"
            value={policyDraft.compulsoryExcess}
            onChange={(value) => change("compulsoryExcess", value)}
          />
        </div>
        <Field
          label="No-claims years"
          type="number"
          value={policyDraft.noClaimsYears}
          onChange={(value) => change("noClaimsYears", value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <TriField
            label="Courtesy car"
            value={policyDraft.courtesyCar}
            onChange={(value) => change("courtesyCar", value)}
          />
          <TriField
            label="Windscreen cover"
            value={policyDraft.windscreenCover}
            onChange={(value) => change("windscreenCover", value)}
          />
          <TriField
            label="Legal expenses"
            value={policyDraft.legalExpensesCover}
            onChange={(value) => change("legalExpensesCover", value)}
          />
          <TriField
            label="Breakdown included"
            value={policyDraft.breakdownIncluded}
            onChange={(value) => change("breakdownIncluded", value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Provider phone"
            type="tel"
            value={policyDraft.providerPhone}
            onChange={(value) => change("providerPhone", value)}
          />
          <Field
            label="Claims phone"
            type="tel"
            value={policyDraft.claimsPhone}
            onChange={(value) => change("claimsPhone", value)}
          />
        </div>
        <Area
          label="Policy notes"
          value={policyDraft.notes}
          onChange={(value) => change("notes", value)}
        />
        <div className="border-t border-[#20352a]/[0.07] pt-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f8e72]">
            Breakdown policy
          </p>
          <div className="space-y-4">
            <Field
              label="Provider"
              value={policyDraft.breakdownProvider}
              onChange={(value) => change("breakdownProvider", value)}
            />
            <Field
              label="Policy number"
              value={policyDraft.breakdownPolicyNumber}
              onChange={(value) => change("breakdownPolicyNumber", value)}
            />
            <Field
              label="Renewal date"
              type="date"
              value={policyDraft.breakdownRenewalDate}
              onChange={(value) => change("breakdownRenewalDate", value)}
            />
          </div>
        </div>
        <Submit label="Save policy details" />
      </form>
    </ModalShell>
  );
}
