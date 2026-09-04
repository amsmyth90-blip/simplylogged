import { useMemo, useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  emptyClaimDraft,
  emptyDriverDraft,
  emptyPolicyDraft,
  emptyRenewalDraft,
  formatInsuranceDate,
  insuranceAudit,
  type InsuranceDialog,
} from "@/components/garage/vehicle-insurance-model";
import {
  applyPolicy,
  createClaim,
  createDriver,
  createRenewal,
  policyDraftFor,
} from "@/components/garage/vehicle-insurance/insurance-records";
import type { VehicleRecord } from "@/lib/vehicle-records";

export function useVehicleInsurance(vehicleId: string) {
  const { state, hydrated, updateState } = useDiaryDockData();
  const vehicle = state.vehicles.vehicles.find((item) => item.id === vehicleId);
  const [dialog, setDialog] = useState<InsuranceDialog>(null);
  const [message, setMessage] = useState("");
  const [policyDraft, setPolicyDraft] = useState(emptyPolicyDraft);
  const [driverDraft, setDriverDraft] = useState(emptyDriverDraft);
  const [claimDraft, setClaimDraft] = useState(emptyClaimDraft);
  const [renewalDraft, setRenewalDraft] = useState(emptyRenewalDraft);

  const insuranceDocuments = useMemo(() => {
    if (!vehicle) return [];
    const linkedToVehicle = new Set(vehicle.documentIds);
    const linkedToPolicy = new Set(vehicle.motorInsurance.documentIds);
    return state.vaultDocuments.filter(
      (document) =>
        linkedToPolicy.has(document.id) ||
        (linkedToVehicle.has(document.id) &&
          /insurance|policy|breakdown|roadside|no claims|claim form|motor cover/i.test(
            `${document.title} ${document.category} ${document.extractionSummary ?? ""}`,
          )),
    );
  }, [state.vaultDocuments, vehicle]);

  function updateVehicle(updater: (current: VehicleRecord) => VehicleRecord) {
    if (!vehicle) return;
    updateState((current) => ({
      ...current,
      vehicles: {
        vehicles: current.vehicles.vehicles.map((item) =>
          item.id === vehicle.id ? updater(item) : item,
        ),
      },
    }));
  }

  function closeDialog() {
    setDialog(null);
    setMessage("");
  }

  function openPolicy() {
    if (!vehicle) return;
    setPolicyDraft(policyDraftFor(vehicle));
    setDialog("policy");
  }

  function openClaim() {
    setMessage("");
    setDialog("claim");
  }

  function openDriver() {
    setMessage("");
    setDialog("driver");
  }

  function openRenewal() {
    if (!vehicle) return;
    setMessage("");
    setRenewalDraft({
      ...emptyRenewalDraft,
      premium: vehicle.motorInsurance.premium?.toString() ?? "",
      provider: vehicle.motorInsurance.provider,
      renewalDate: vehicle.insuranceRenewalDate,
    });
    setDialog("renewal");
  }

  function savePolicy(event: FormEvent) {
    event.preventDefault();
    updateVehicle((current) => applyPolicy(current, policyDraft));
    closeDialog();
  }

  function saveDriver(event: FormEvent) {
    event.preventDefault();
    if (!driverDraft.name.trim()) {
      setMessage("Add the driver’s name.");
      return;
    }
    const driver = createDriver(driverDraft);
    updateVehicle((current) => ({
      ...current,
      audit: [
        insuranceAudit(`Named driver added: ${driver.name}`),
        ...current.audit,
      ],
      motorInsurance: {
        ...current.motorInsurance,
        namedDrivers: [...current.motorInsurance.namedDrivers, driver],
      },
      updatedAt: new Date().toISOString(),
    }));
    setDriverDraft(emptyDriverDraft);
    closeDialog();
  }

  function saveClaim(event: FormEvent) {
    event.preventDefault();
    if (!claimDraft.incidentDate || !claimDraft.claimType.trim()) {
      setMessage("Add the incident date and claim type.");
      return;
    }
    const claim = createClaim(claimDraft);
    updateVehicle((current) => ({
      ...current,
      audit: [
        insuranceAudit(`Insurance claim recorded: ${claim.claimType}`),
        ...current.audit,
      ],
      motorInsurance: {
        ...current.motorInsurance,
        claims: [claim, ...current.motorInsurance.claims],
      },
      updatedAt: claim.updatedAt,
    }));
    setClaimDraft(emptyClaimDraft);
    closeDialog();
  }

  function saveRenewal(event: FormEvent) {
    event.preventDefault();
    if (!renewalDraft.renewalDate) {
      setMessage("Add the renewal date.");
      return;
    }
    const renewal = createRenewal(renewalDraft);
    updateVehicle((current) => ({
      ...current,
      audit: [
        insuranceAudit(
          `Insurance renewal recorded for ${formatInsuranceDate(renewal.renewalDate)}`,
        ),
        ...current.audit,
      ],
      motorInsurance: {
        ...current.motorInsurance,
        renewals: [renewal, ...current.motorInsurance.renewals],
      },
      updatedAt: new Date().toISOString(),
    }));
    setRenewalDraft(emptyRenewalDraft);
    closeDialog();
  }

  function togglePolicyDocument(documentId: string) {
    updateVehicle((current) => {
      const linked = current.motorInsurance.documentIds.includes(documentId);
      return {
        ...current,
        audit: [
          insuranceAudit(
            `${linked ? "Unlinked" : "Linked"} motor insurance document`,
          ),
          ...current.audit,
        ],
        motorInsurance: {
          ...current.motorInsurance,
          documentIds: linked
            ? current.motorInsurance.documentIds.filter(
                (id) => id !== documentId,
              )
            : [...current.motorInsurance.documentIds, documentId],
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }

  return {
    claimDraft,
    closeDialog,
    dialog,
    driverDraft,
    hydrated,
    insuranceDocuments,
    message,
    openClaim,
    openDriver,
    openPolicy,
    openRenewal,
    policyDraft,
    renewalDraft,
    saveClaim,
    saveDriver,
    savePolicy,
    saveRenewal,
    setClaimDraft,
    setDialog,
    setDriverDraft,
    setPolicyDraft,
    setRenewalDraft,
    state,
    togglePolicyDocument,
    vehicle,
  };
}

export type VehicleInsuranceModel = ReturnType<typeof useVehicleInsurance>;
