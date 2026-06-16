import { AuthGate } from "@/components/AuthGate";
import { EstateDashboard } from "@/components/EstateDashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string }>;
}) {
  const { panel } = await searchParams;
  return (
    <AuthGate>
      <EstateDashboard panel={panel} />
    </AuthGate>
  );
}
