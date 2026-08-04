import { BottomNav } from "@/components/BottomNav";
import { BillsWorkspace } from "@/components/bills/BillsWorkspace";
import { requireUser } from "@/lib/auth";
export default async function AllBillsPage() { await requireUser(); return <><BillsWorkspace view="all" /><BottomNav /></>; }
