import Link from "next/link";

import { fieldClass } from "@/components/bills/BillsUi";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";
import type { VehicleServiceKind } from "@/lib/vehicle-records";

import { useServiceRecords } from "./ServiceRecordsContext";
import {
  ServiceAlert,
  ServiceArea,
  ServiceField,
  ServiceSubmit,
} from "./ServiceFormControls";

export function ServiceDialogs() {
  const service = useServiceRecords();
  return (
    <>
      <ModalShell
        open={service.dialog === "service"}
        title={
          service.editingId
            ? "Edit service"
            : service.serviceDraft.kind === "inspection"
              ? "Add maintenance record"
              : "Add service"
        }
        subtitle="Record only details confirmed by the garage or service document."
        onClose={() => service.setDialog(null)}
      >
        {service.message ? <ServiceAlert text={service.message} /> : null}
        <ServiceRecordForm />
      </ModalShell>
      <ModalShell
        open={service.dialog === "reminder"}
        title="Set service reminder"
        subtitle="Add a confirmed date to the shared reminders list."
        onClose={() => {
          service.setDialog(null);
          service.setMessage("");
        }}
      >
        {service.message ? <ServiceAlert text={service.message} /> : null}
        <form onSubmit={service.saveReminder} className="space-y-4">
          <ServiceField
            label="Reminder title"
            value={service.reminderDraft.title}
            onChange={(value) =>
              service.setReminderDraft((draft) => ({
                ...draft,
                title: value,
              }))
            }
          />
          <ServiceField
            label="Due date"
            type="date"
            value={service.reminderDraft.dueDate}
            onChange={(value) =>
              service.setReminderDraft((draft) => ({
                ...draft,
                dueDate: value,
              }))
            }
          />
          <ServiceArea
            label="Notes"
            value={service.reminderDraft.note}
            onChange={(value) =>
              service.setReminderDraft((draft) => ({
                ...draft,
                note: value,
              }))
            }
          />
          <ServiceSubmit label="Save reminder" />
        </form>
      </ModalShell>
    </>
  );
}

function ServiceRecordForm() {
  const service = useServiceRecords();
  const update = (field: keyof typeof service.serviceDraft, value: string) =>
    service.setServiceDraft((draft) => ({ ...draft, [field]: value }));

  return (
    <form onSubmit={service.saveService} className="space-y-4">
      <label className="block text-xs font-semibold text-[#667068]">
        Record type
        <select
          value={service.serviceDraft.kind}
          onChange={(event) =>
            service.setServiceDraft((draft) => ({
              ...draft,
              kind: event.target.value as Exclude<VehicleServiceKind, "repair">,
            }))
          }
          className={fieldClass}
        >
          <option value="service">Service</option>
          <option value="inspection">Maintenance</option>
        </select>
      </label>
      <ServiceField
        label="Service type or title"
        value={service.serviceDraft.title}
        onChange={(value) => update("title", value)}
      />
      <ServiceField
        label="Garage or provider"
        value={service.serviceDraft.provider}
        onChange={(value) => update("provider", value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <ServiceField
          label="Service date"
          type="date"
          value={service.serviceDraft.date}
          onChange={(value) => update("date", value)}
        />
        <ServiceField
          label="Mileage"
          type="number"
          value={service.serviceDraft.mileage}
          onChange={(value) => update("mileage", value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ServiceField
          label="Cost"
          type="number"
          value={service.serviceDraft.cost}
          onChange={(value) => update("cost", value)}
        />
        <ServiceField
          label="Payment method"
          value={service.serviceDraft.paymentMethod}
          onChange={(value) => update("paymentMethod", value)}
        />
      </div>
      <ServiceArea
        label="Work carried out (one item per line)"
        value={service.serviceDraft.workItems}
        onChange={(value) => update("workItems", value)}
      />
      <ServiceArea
        label="Notes"
        value={service.serviceDraft.notes}
        onChange={(value) => update("notes", value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <ServiceField
          label="Next service date"
          type="date"
          value={service.serviceDraft.nextServiceDate}
          onChange={(value) => update("nextServiceDate", value)}
        />
        <ServiceField
          label="Next service mileage"
          type="number"
          value={service.serviceDraft.nextServiceMileage}
          onChange={(value) => update("nextServiceMileage", value)}
        />
      </div>
      {service.vehicleDocuments.length ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-[#667068]">
            Invoices and reports
          </legend>
          {service.vehicleDocuments.map((document) => (
            <label
              key={document.id}
              className="flex min-h-[52px] items-center gap-3 rounded-[14px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"
            >
              <input
                type="checkbox"
                checked={service.serviceDraft.documentIds.includes(document.id)}
                onChange={() => service.toggleDocument(document.id)}
                className="h-4 w-4 accent-[#45604d]"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-[#20352a]">
                {document.title}
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <Link
          href="/capture?room=garage"
          className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-[#6f8e72]/30 text-xs font-semibold text-[#45604d]"
        >
          <UiIcon name="plus" className="h-4 w-4" />
          Scan an invoice or report
        </Link>
      )}
      <ServiceSubmit label="Save service record" />
    </form>
  );
}
