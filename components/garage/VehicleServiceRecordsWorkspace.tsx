"use client";

import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { ServiceDetail } from "@/components/garage/vehicle-service/ServiceDetail";
import {
  ServiceHistory,
  ServiceMaintenance,
  ServiceReminders,
} from "@/components/garage/vehicle-service/ServiceListViews";
import { ServiceOverview } from "@/components/garage/vehicle-service/ServiceOverview";
import {
  ServiceRecordsProvider,
  useServiceRecords,
} from "@/components/garage/vehicle-service/ServiceRecordsContext";
import { ServiceWorkspaceChrome } from "@/components/garage/vehicle-service/ServiceWorkspaceChrome";
import type { ServiceRecordsView } from "@/components/garage/vehicle-service/service-model";

export type { ServiceRecordsView };

export function VehicleServiceRecordsWorkspace({
  vehicleId,
  view = "overview",
  serviceId,
}: {
  vehicleId: string;
  view?: ServiceRecordsView;
  serviceId?: string;
}) {
  return (
    <ServiceRecordsProvider
      vehicleId={vehicleId}
      view={view}
      serviceId={serviceId}
    >
      <ServiceRecordsContent serviceId={serviceId} />
    </ServiceRecordsProvider>
  );
}

function ServiceRecordsContent({ serviceId }: { serviceId?: string }) {
  const service = useServiceRecords();

  if (!service.hydrated) {
    return (
      <div className="mx-auto max-w-[760px] rounded-[24px] bg-white/80 p-8 text-sm text-[#667068]">
        Opening Service Records…
      </div>
    );
  }
  if (!service.vehicle) {
    return (
      <div className="mx-auto max-w-[760px]">
        <BillsCard>
          <p className="text-sm font-semibold text-[#20352a]">
            Vehicle not found
          </p>
          <Link
            href="/room/garage"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#45604d]"
          >
            Back to Garage
          </Link>
        </BillsCard>
      </div>
    );
  }
  if (serviceId) return <ServiceDetail />;

  return (
    <ServiceWorkspaceChrome>
      {service.view === "overview" ? <ServiceOverview /> : null}
      {service.view === "history" ? <ServiceHistory /> : null}
      {service.view === "maintenance" ? <ServiceMaintenance /> : null}
      {service.view === "reminders" ? <ServiceReminders /> : null}
    </ServiceWorkspaceChrome>
  );
}
