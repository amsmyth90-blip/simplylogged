import { fieldClass } from "@/components/bills/BillsUi";
import { ModalShell } from "@/components/ModalShell";
import type { VehicleMotRecord } from "@/lib/vehicle-records";

import { useMotTax } from "./MotTaxContext";
import { MotTaxArea, MotTaxField, MotTaxSubmit } from "./MotTaxUi";

export function MotTaxDialogs() {
  const motTax = useMotTax();
  if (!motTax.vehicle) return null;
  return (
    <>
      <ModalShell
        open={motTax.dialog === "mot"}
        title="Add MOT record"
        subtitle={`Record confirmed information for ${motTax.vehicleName}.`}
        onClose={() => {
          motTax.setDialog(null);
          motTax.setMessage("");
        }}
      >
        {motTax.message ? (
          <p
            role="alert"
            className="mb-3 rounded-[12px] bg-[#fbe5df] p-3 text-xs text-[#a4473d]"
          >
            {motTax.message}
          </p>
        ) : null}
        <MotForm />
      </ModalShell>
      <ModalShell
        open={motTax.dialog === "tax"}
        title="Road-tax details"
        subtitle={`Store payment details for ${motTax.vehicleName}.`}
        onClose={() => motTax.setDialog(null)}
      >
        <TaxForm />
      </ModalShell>
    </>
  );
}

function MotForm() {
  const motTax = useMotTax();
  const update = (field: keyof typeof motTax.motDraft, value: string) =>
    motTax.setMotDraft((draft) => ({ ...draft, [field]: value }));
  return (
    <form onSubmit={motTax.saveMot} className="space-y-4">
      <label className="block text-xs font-semibold text-[#667068]">
        Result
        <select
          value={motTax.motDraft.result}
          onChange={(event) =>
            motTax.setMotDraft((draft) => ({
              ...draft,
              result: event.target.value as VehicleMotRecord["result"],
            }))
          }
          className={fieldClass}
        >
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <MotTaxField
          label="Test date"
          type="date"
          value={motTax.motDraft.testDate}
          onChange={(value) => update("testDate", value)}
        />
        <MotTaxField
          label="Mileage"
          type="number"
          value={motTax.motDraft.mileage}
          onChange={(value) => update("mileage", value)}
        />
      </div>
      <MotTaxField
        label="Advisory count"
        type="number"
        value={motTax.motDraft.advisoryCount}
        onChange={(value) => update("advisoryCount", value)}
      />
      <label className="block text-xs font-semibold text-[#667068]">
        Certificate
        <select
          value={motTax.motDraft.documentId}
          onChange={(event) => update("documentId", event.target.value)}
          className={fieldClass}
        >
          <option value="">None</option>
          {motTax.complianceDocuments
            .filter((document) => /\bmot\b/i.test(document.title))
            .map((document) => (
              <option key={document.id} value={document.id}>
                {document.title}
              </option>
            ))}
        </select>
      </label>
      <MotTaxArea
        label="Advisories or notes"
        value={motTax.motDraft.notes}
        onChange={(value) => update("notes", value)}
      />
      <MotTaxSubmit label="Save MOT record" />
    </form>
  );
}

function TaxForm() {
  const motTax = useMotTax();
  const update = (field: keyof typeof motTax.taxDraft, value: string) =>
    motTax.setTaxDraft((draft) => ({ ...draft, [field]: value }));
  return (
    <form onSubmit={motTax.saveTax} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MotTaxField
          label="Renewal date"
          type="date"
          value={motTax.taxDraft.renewalDate}
          onChange={(value) => update("renewalDate", value)}
        />
        <MotTaxField
          label="Amount"
          type="number"
          value={motTax.taxDraft.amount}
          onChange={(value) => update("amount", value)}
        />
      </div>
      {(["paymentFrequency", "paymentReference", "vehicleClass"] as const).map(
        (field) => (
          <MotTaxField
            key={field}
            label={
              field === "paymentFrequency"
                ? "Payment frequency"
                : field === "paymentReference"
                  ? "Payment reference"
                  : "Vehicle class"
            }
            value={motTax.taxDraft[field]}
            onChange={(value) => update(field, value)}
          />
        ),
      )}
      <MotTaxField
        label="Paid date"
        type="date"
        value={motTax.taxDraft.paidDate}
        onChange={(value) => update("paidDate", value)}
      />
      <label className="block text-xs font-semibold text-[#667068]">
        Tax document
        <select
          value={motTax.taxDraft.documentId}
          onChange={(event) => update("documentId", event.target.value)}
          className={fieldClass}
        >
          <option value="">None</option>
          {motTax.complianceDocuments
            .filter((document) => /tax/i.test(document.title))
            .map((document) => (
              <option key={document.id} value={document.id}>
                {document.title}
              </option>
            ))}
        </select>
      </label>
      <MotTaxSubmit label="Save road-tax details" />
    </form>
  );
}
