import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { VehicleInsuranceWorkspace, type InsuranceView } from "@/components/garage/VehicleInsuranceWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Motor Insurance" };

const views = new Set<InsuranceView>(["overview", "policy", "claims", "documents", "renewals"]);

export default async function MotorInsurancePage({
  params,
  searchParams,
}: {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  await requireUser();
  const [{ vehicleId }, query] = await Promise.all([params, searchParams]);
  const requested = query.view as InsuranceView | undefined;
  const view = requested && views.has(requested) ? requested : "overview";

  return <><VehicleInsuranceWorkspace vehicleId={vehicleId} view={view} /><BottomNav /></>;
}
