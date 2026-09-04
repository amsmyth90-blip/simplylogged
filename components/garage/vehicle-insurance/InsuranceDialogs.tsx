import { fieldClass } from "@/components/bills/BillsUi";
import { ModalShell } from "@/components/ModalShell";
import {
  Area,
  DocumentSelect,
  Field,
  Submit,
} from "@/components/garage/vehicle-insurance/InsuranceFields";
import { InsuranceDocumentsDialog } from "@/components/garage/vehicle-insurance/InsuranceDocumentsDialog";
import { Alert } from "@/components/garage/vehicle-insurance/InsuranceUi";
import { PolicyDialog } from "@/components/garage/vehicle-insurance/PolicyDialog";
import { useVehicleInsuranceModel } from "@/components/garage/vehicle-insurance/VehicleInsuranceContext";
import type {
  VehicleInsuranceClaim,
  VehicleInsuranceRenewal,
} from "@/lib/vehicle-records";

function DriverDialog() {
  const {
    closeDialog,
    dialog,
    driverDraft,
    message,
    saveDriver,
    setDriverDraft,
  } = useVehicleInsuranceModel();
  const change = <Key extends keyof typeof driverDraft>(
    key: Key,
    value: (typeof driverDraft)[Key],
  ) => {
    setDriverDraft((current) => ({ ...current, [key]: value }));
  };
  return (
    <ModalShell
      open={dialog === "driver"}
      title="Add named driver"
      subtitle="Record a person confirmed on the policy."
      onClose={closeDialog}
    >
      {message ? <Alert text={message} /> : null}
      <form onSubmit={saveDriver} className="space-y-4">
        <Field
          label="Driver name"
          value={driverDraft.name}
          onChange={(value) => change("name", value)}
        />
        <Field
          label="Relationship"
          value={driverDraft.relationship}
          onChange={(value) => change("relationship", value)}
        />
        <label className="flex min-h-11 items-center gap-3 rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 text-sm text-[#20352a]">
          <input
            type="checkbox"
            checked={driverDraft.mainDriver}
            onChange={(event) => change("mainDriver", event.target.checked)}
            className="h-4 w-4 accent-[#45604d]"
          />
          Main driver
        </label>
        <Area
          label="Notes"
          value={driverDraft.notes}
          onChange={(value) => change("notes", value)}
        />
        <Submit label="Add named driver" />
      </form>
    </ModalShell>
  );
}

function ClaimDialog() {
  const model = useVehicleInsuranceModel();
  const {
    claimDraft,
    closeDialog,
    dialog,
    insuranceDocuments,
    message,
    saveClaim,
    setClaimDraft,
  } = model;
  const change = <Key extends keyof typeof claimDraft>(
    key: Key,
    value: (typeof claimDraft)[Key],
  ) => {
    setClaimDraft((current) => ({ ...current, [key]: value }));
  };
  return (
    <ModalShell
      open={dialog === "claim"}
      title="Record a claim"
      subtitle="Keep information and evidence together. Contact your insurer directly to submit a claim."
      onClose={closeDialog}
    >
      {message ? <Alert text={message} /> : null}
      <form onSubmit={saveClaim} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Incident date"
            type="date"
            value={claimDraft.incidentDate}
            onChange={(value) => change("incidentDate", value)}
          />
          <Field
            label="Claim type"
            value={claimDraft.claimType}
            onChange={(value) => change("claimType", value)}
          />
        </div>
        <label className="block text-xs font-semibold text-[#667068]">
          Status
          <select
            value={claimDraft.status}
            onChange={(event) =>
              change(
                "status",
                event.target.value as VehicleInsuranceClaim["status"],
              )
            }
            className={fieldClass}
          >
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="in-progress">In progress</option>
            <option value="settled">Settled</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <Field
          label="Claim reference"
          value={claimDraft.reference}
          onChange={(value) => change("reference", value)}
        />
        <Area
          label="What happened?"
          value={claimDraft.description}
          onChange={(value) => change("description", value)}
        />
        <DocumentSelect
          label="Supporting document"
          value={claimDraft.documentId}
          documents={insuranceDocuments}
          onChange={(value) => change("documentId", value)}
        />
        <Submit label="Save claim record" />
      </form>
    </ModalShell>
  );
}

function RenewalDialog() {
  const model = useVehicleInsuranceModel();
  const {
    closeDialog,
    dialog,
    insuranceDocuments,
    message,
    renewalDraft,
    saveRenewal,
    setRenewalDraft,
  } = model;
  const change = <Key extends keyof typeof renewalDraft>(
    key: Key,
    value: (typeof renewalDraft)[Key],
  ) => {
    setRenewalDraft((current) => ({ ...current, [key]: value }));
  };
  return (
    <ModalShell
      open={dialog === "renewal"}
      title="Record a renewal"
      subtitle="Save a confirmed quote or renewal decision."
      onClose={closeDialog}
    >
      {message ? <Alert text={message} /> : null}
      <form onSubmit={saveRenewal} className="space-y-4">
        <Field
          label="Renewal date"
          type="date"
          value={renewalDraft.renewalDate}
          onChange={(value) => change("renewalDate", value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Provider"
            value={renewalDraft.provider}
            onChange={(value) => change("provider", value)}
          />
          <Field
            label="Premium"
            type="number"
            value={renewalDraft.premium}
            onChange={(value) => change("premium", value)}
          />
        </div>
        <label className="block text-xs font-semibold text-[#667068]">
          Outcome
          <select
            value={renewalDraft.outcome}
            onChange={(event) =>
              change(
                "outcome",
                event.target.value as VehicleInsuranceRenewal["outcome"],
              )
            }
            className={fieldClass}
          >
            <option value="upcoming">Upcoming</option>
            <option value="renewed">Renewed</option>
            <option value="switched">Switched provider</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <Area
          label="Notes"
          value={renewalDraft.notes}
          onChange={(value) => change("notes", value)}
        />
        <DocumentSelect
          label="Renewal document"
          value={renewalDraft.documentId}
          documents={insuranceDocuments}
          onChange={(value) => change("documentId", value)}
        />
        <Submit label="Save renewal" />
      </form>
    </ModalShell>
  );
}

export function InsuranceDialogs() {
  return (
    <>
      <PolicyDialog />
      <DriverDialog />
      <ClaimDialog />
      <RenewalDialog />
      <InsuranceDocumentsDialog />
    </>
  );
}
