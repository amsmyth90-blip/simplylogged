import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import {
  interactiveRoomObjects,
  roomHeroAccent,
  roomHeroImages,
  roomHeroPositions
} from "@/components/room-page/room-page-model";
import { roomImageLabelClass } from "@/components/RoomSceneChrome";
import { StatusChip } from "@/components/StatusChip";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { RoomDetail } from "@/lib/mock-data";

export function RoomHero({ documentCount, room }: { documentCount: number; room: RoomDetail }) {
  return (
    <PageHeader
      eyebrow={room.domain}
      title={room.name}
      subtitle={room.headline}
      backHref="/dashboard"
      backLabel="Estate map"
      heroImage={roomHeroImages[room.id] ?? "/images/estate-map-light.png"}
      heroPosition={roomHeroPositions[room.id] ?? "center 45%"}
      heroTone={roomHeroAccent[room.status]}
      heroOverlay={(interactiveRoomObjects[room.id] ?? []).map((object) => (
        <Link
          key={object.label}
          href={object.href}
          className={`group pointer-events-auto absolute flex min-h-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${roomImageLabelClass}`}
          style={{ left: object.left, top: object.top, transform: "translate(-50%, -50%)" }}
          aria-label={`${object.label}: ${object.detail}`}
        >
          {object.label}
        </Link>
      ))}
      badge="Room"
      action={<span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/14 text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md"><UiIcon name={room.icon as IconName} className="h-5 w-5" /></span>}
      meta={(
        <>
          <StatusChip status={room.status} />
          <span className="estate-chip border-white/30 bg-white/14 text-white/80">
            {room.stats.records} records
          </span>
          <span className="estate-chip border-white/30 bg-white/14 text-white/80">
            {documentCount} documents
          </span>
          <span className="estate-chip border-white/30 bg-white/14 text-white/80">
            Updated {room.stats.updated.toLowerCase()}
          </span>
        </>
      )}
    />
  );
}
