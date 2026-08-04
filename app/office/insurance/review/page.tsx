import { BottomNav } from "@/components/BottomNav";
import { InsuranceWorkspace } from "@/components/insurance/InsuranceWorkspace";
import { requireUser } from "@/lib/auth";
export default async function InsuranceReviewPage(){await requireUser();return <><InsuranceWorkspace view="review"/><BottomNav/></>}
