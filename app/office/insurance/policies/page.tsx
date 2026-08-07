import { BottomNav } from "@/components/BottomNav";
import { InsuranceWorkspace } from "@/components/insurance/InsuranceWorkspace";
import { requireUser } from "@/lib/auth";
export default async function PoliciesPage(){await requireUser();return <><InsuranceWorkspace view="policies"/><BottomNav/></>}
