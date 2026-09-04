import { BillsCard } from "@/components/bills/BillsUi";
import { GarageVehicleSectionNav } from "@/components/garage/GarageVehicleSectionNav";
import { UiIcon } from "@/components/UiIcon";
import type { VaultDocument } from "@/lib/mock-data";

import { ServiceDialogs } from "./ServiceDialogs";
import { formatServiceDate, formatServiceMoney } from "./service-model";
import { useServiceRecords } from "./ServiceRecordsContext";
import {
  ServiceDocumentRow,
  ServiceEmpty,
  ServiceHeader,
  ServiceInfoTile,
  ServiceSectionTitle,
  ServiceVehicleSummary,
} from "./ServiceUi";

export function ServiceDetail() {
  const service = useServiceRecords();
  const { vehicle, serviceRecord } = service;
  if (!vehicle) return null;
  if (!serviceRecord) {
    return (
      <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28">
        <ServiceHeader title="Service Details" backHref={service.base} />
        <BillsCard>
          <ServiceEmpty
            icon="gear"
            title="Service record not found"
            detail="This record may have been removed or may belong to another vehicle."
          />
        </BillsCard>
      </div>
    );
  }

  const linkedDocuments = serviceRecord.documentIds
    .map((id) => service.state.vaultDocuments.find((item) => item.id === id))
    .filter((document): document is VaultDocument => Boolean(document));
  const nextMileage =
    serviceRecord.nextServiceMileage ?? vehicle.nextServiceMileage;

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28">
      <ServiceHeader
        title="Service Details"
        backHref={service.base}
        action={
          <button
            type="button"
            onClick={() => service.openEditService(serviceRecord)}
            className="min-h-11 rounded-full px-3 text-xs font-semibold text-[#315d45]"
          >
            Edit
          </button>
        }
      />
      <GarageVehicleSectionNav vehicleId={vehicle.id} />
      <ServiceVehicleSummary
        vehicle={vehicle}
        name={service.vehicleName}
        mileage={service.mileage}
      />
      <div className="grid grid-cols-2 gap-3">
        <ServiceInfoTile
          label="Service date"
          value={formatServiceDate(serviceRecord.date)}
        />
        <ServiceInfoTile
          label="Mileage"
          value={
            serviceRecord.mileage === null
              ? "Not recorded"
              : `${serviceRecord.mileage.toLocaleString("en-GB")} miles`
          }
        />
        <ServiceInfoTile label="Service type" value={serviceRecord.title} />
        <ServiceInfoTile
          label="Service provider"
          value={serviceRecord.provider || "Not recorded"}
        />
        <ServiceInfoTile
          label="Cost"
          value={formatServiceMoney(serviceRecord.cost)}
        />
        <ServiceInfoTile
          label="Payment method"
          value={serviceRecord.paymentMethod || "Not recorded"}
        />
      </div>
      <BillsCard>
        <ServiceSectionTitle
          title="Work carried out"
          detail="Items recorded for this service"
        />
        <div className="mt-4 space-y-2">
          {(serviceRecord.workItems ?? []).length ? (
            (serviceRecord.workItems ?? []).map((item) => (
              <div
                key={item}
                className="flex min-h-11 items-center gap-3 text-xs text-[#20352a]"
              >
                <UiIcon
                  name="check"
                  className="h-4 w-4 shrink-0 text-[#52705a]"
                />
                {item}
              </div>
            ))
          ) : (
            <p className="text-[11px] leading-5 text-[#667068]">
              No individual work items have been added.
            </p>
          )}
        </div>
      </BillsCard>
      <BillsCard>
        <ServiceSectionTitle
          title="Next service"
          detail="The date and mileage recorded after this service"
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ServiceInfoTile
            label="Date"
            value={formatServiceDate(
              serviceRecord.nextServiceDate || vehicle.nextServiceDate,
            )}
          />
          <ServiceInfoTile
            label="Mileage"
            value={
              nextMileage === null
                ? "Not recorded"
                : `${nextMileage.toLocaleString("en-GB")} miles`
            }
          />
        </div>
      </BillsCard>
      <BillsCard>
        <ServiceSectionTitle
          title="Documents"
          detail="Invoices and reports securely linked to this service"
        />
        <div className="mt-4 space-y-2">
          {linkedDocuments.length ? (
            linkedDocuments.map((document) => (
              <ServiceDocumentRow
                key={document.id}
                document={document}
                vehicleId={vehicle.id}
              />
            ))
          ) : (
            <ServiceEmpty
              icon="file"
              title="No documents linked"
              detail="Edit this service to link an invoice or service report."
            />
          )}
        </div>
      </BillsCard>
      <BillsCard>
        <ServiceSectionTitle
          title="Notes"
          detail="Additional information about this service"
        />
        <p className="mt-4 whitespace-pre-wrap text-[12px] leading-5 text-[#667068]">
          {serviceRecord.notes || "No notes added."}
        </p>
      </BillsCard>
      <button
        type="button"
        onClick={() => service.openEditService(serviceRecord)}
        className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
      >
        Edit service record
      </button>
      <button
        type="button"
        onClick={() => service.duplicateService(serviceRecord)}
        className="min-h-12 w-full rounded-[15px] border border-[#6f8e72]/35 bg-white px-4 text-sm font-semibold text-[#45604d]"
      >
        Duplicate service
      </button>
      <ServiceDialogs />
    </div>
  );
}
