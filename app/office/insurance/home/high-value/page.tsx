import { BottomNav } from "@/components/BottomNav";
import { HomeInsuranceWorkspace } from "@/components/insurance/HomeInsuranceWorkspace";
import { requireUser } from "@/lib/auth";
export default async function HighValueItemsPage(){await requireUser();return <><HomeInsuranceWorkspace view="high-value"/><BottomNav/></>}
