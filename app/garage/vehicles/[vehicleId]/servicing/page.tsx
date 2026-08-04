import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { VehicleServiceRecordsWorkspace, type ServiceRecordsView } from "@/components/garage/VehicleServiceRecordsWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Vehicle Servicing" };

const views = new Set<ServiceRecordsView>(["overview", "history", "maintenance", "reminders"]);

export default async function VehicleServicingPage({ params, searchParams }: { params: Promise<{ vehicleId: string }>; searchParams: Promise<{ view?: string }> }) {
  await requireUser();
  const [{ vehicleId }, query] = await Promise.all([params, searchParams]);
  const requested = query.view as ServiceRecordsView | undefined;
  const view = requested && views.has(requested) ? requested : "overview";
  return <><VehicleServiceRecordsWorkspace vehicleId={vehicleId} view={view} /><BottomNav /></>;
}
