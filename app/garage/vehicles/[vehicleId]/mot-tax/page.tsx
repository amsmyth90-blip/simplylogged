import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { VehicleMotTaxWorkspace } from "@/components/garage/VehicleMotTaxWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Vehicle MOT & Tax" };
export default async function MotTaxPage({params}:{params:Promise<{vehicleId:string}>}){await requireUser();const {vehicleId}=await params;return <><VehicleMotTaxWorkspace vehicleId={vehicleId}/><BottomNav/></>}
