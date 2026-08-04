import { BottomNav } from "@/components/BottomNav";
import { BillsWorkspace } from "@/components/bills/BillsWorkspace";
import { requireUser } from "@/lib/auth";
export default async function BillInsightsPage() { await requireUser(); return <><BillsWorkspace view="insights" /><BottomNav /></>; }
