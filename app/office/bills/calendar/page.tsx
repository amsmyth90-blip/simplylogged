import { BottomNav } from "@/components/BottomNav";
import { BillsWorkspace } from "@/components/bills/BillsWorkspace";
import { requireUser } from "@/lib/auth";
export default async function BillCalendarPage() { await requireUser(); return <><BillsWorkspace view="calendar" /><BottomNav /></>; }
