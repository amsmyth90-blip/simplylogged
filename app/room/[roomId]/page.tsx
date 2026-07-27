import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BottomNav } from "@/components/BottomNav";
import { KitchenRoom } from "@/components/KitchenRoom";
import { RoomPage } from "@/components/RoomPage";
import { requireUser } from "@/lib/auth";
import { roomDetails } from "@/lib/mock-data";

type RoomDetailPageProps = { params: Promise<{ roomId: string }> };

export function generateStaticParams() { return Object.keys(roomDetails).map((roomId) => ({ roomId })); }

export async function generateMetadata({ params }: RoomDetailPageProps): Promise<Metadata> {
  const { roomId } = await params;
  const room = roomDetails[roomId];
  return { title: room ? room.name : "Room" };
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  await requireUser();
  const { roomId } = await params;
  if (roomId === "kitchen") return <KitchenRoom />;
  const room = roomDetails[roomId];
  if (!room) notFound();
  return <><RoomPage room={room} /><BottomNav /></>;
}
