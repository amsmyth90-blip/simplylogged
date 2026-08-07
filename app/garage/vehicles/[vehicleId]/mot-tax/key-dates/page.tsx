import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { VehicleMotTaxWorkspace } from "@/components/garage/VehicleMotTaxWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Vehicle Key Dates" };
export default async function KeyDatesPage({params}:{params:Promise<{vehicleId:string}>}){await requireUser();const {vehicleId}=await params;return <><VehicleMotTaxWorkspace vehicleId={vehicleId} view="key-dates"/><BottomNav/></>}
