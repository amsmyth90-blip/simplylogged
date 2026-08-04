import { BottomNav } from "@/components/BottomNav";
import { BillsWorkspace } from "@/components/bills/BillsWorkspace";
import { requireUser } from "@/lib/auth";
export default async function BillDetailPage({ params }: { params: Promise<{ billId: string }> }) { await requireUser(); const { billId } = await params; return <><BillsWorkspace view="detail" billId={billId} /><BottomNav /></>; }
