import { BottomNav } from "@/components/BottomNav";
import { InsuranceWorkspace } from "@/components/insurance/InsuranceWorkspace";
import { requireUser } from "@/lib/auth";
export default async function PolicyDetailPage({params}:{params:Promise<{policyId:string}>}){await requireUser();const {policyId}=await params;return <><InsuranceWorkspace view="detail" policyId={policyId}/><BottomNav/></>}
