import { notFound } from "next/navigation";
import { RoomPage } from "@/components/RoomPage";
import { rooms } from "@/lib/mock-data";

type RoomId = keyof typeof rooms;

export default async function EstateRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const room = rooms[roomId as RoomId];

  if (!room) {
    notFound();
  }

  return <RoomPage roomId={roomId} room={room} />;
}
