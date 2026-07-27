import { requireUser } from "@/lib/auth";
import { DashboardHome } from "@/components/DashboardHome";

export default async function DashboardPage() {
  await requireUser();
  return <DashboardHome />;
}
