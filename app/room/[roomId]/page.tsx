import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BottomNav } from "@/components/BottomNav";
import { BedroomRoom } from "@/components/BedroomRoom";
import { DrivewayWorkspace } from "@/components/DrivewayWorkspace";
import { GarageWorkspace } from "@/components/GarageWorkspace";
import { KitchenRoom } from "@/components/KitchenRoom";
import { OfficeWorkspace } from "@/components/OfficeWorkspace";
import { RoomPage } from "@/components/RoomPage";
import { requireUser } from "@/lib/auth";
import { roomDetails } from "@/lib/mock-data";

type RoomDetailPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ drawer?: string }>;
};

export function generateStaticParams() { return Object.keys(roomDetails).map((roomId) => ({ roomId })); }

export async function generateMetadata({ params }: RoomDetailPageProps): Promise<Metadata> {
  const { roomId } = await params;
  const room = roomDetails[roomId];
  return { title: room ? room.name : "Room" };
}

export default async function RoomDetailPage({ params, searchParams }: RoomDetailPageProps) {
  await requireUser();
  const [{ roomId }, { drawer }] = await Promise.all([params, searchParams]);
  if (roomId === "family-room") redirect("/family");
  if (roomId === "kitchen") return <KitchenRoom />;
  if (roomId === "bedroom") return <BedroomRoom />;
  if (roomId === "garage") return <GarageWorkspace />;
  if (roomId === "driveway") return <DrivewayWorkspace />;
  if (roomId === "office") {
    if (drawer === "wishes") redirect("/wills");
    if (drawer === "finance") redirect("/office/bills");
    const initialDrawer =
      drawer === "identity" || drawer === "wishes" || drawer === "home" || drawer === "finance"
        ? drawer
        : undefined;

    return <><OfficeWorkspace initialDrawer={initialDrawer} /><BottomNav /></>;
  }
  const room = roomDetails[roomId];
  if (!room) notFound();
  return <><RoomPage room={room} /><BottomNav /></>;
}
