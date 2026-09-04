import Link from "next/link";

import { UiIcon, type IconName } from "@/components/UiIcon";
import type { MailItem } from "@/lib/diarydock-data";
import { roomDetails } from "@/lib/mock-data";
import {
  intakeRoomId,
  intakeStatusCopy,
  type IntakeAction,
} from "./intake-rules";

export function IntakeItemCard(props: {
  item: MailItem;
  onRoute: (item: MailItem, action: IntakeAction) => void;
}) {
  const roomId = intakeRoomId(props.item.suggestedRoom);
  const room = roomDetails[roomId] ?? roomDetails.office;
  const status = intakeStatusCopy[props.item.routeStatus];
  const isNew = props.item.routeStatus === "new";
  const actions: Array<{ action: IntakeAction; label: string; primary?: boolean }> = [
    { action: "vault", label: "Save to All Files", primary: true },
    { action: "reminder", label: "Make reminder" },
    { action: "room", label: "Send to room" },
    { action: "ignored", label: "Ignore" },
  ];
  return (
    <article className="estate-sheet overflow-hidden p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px] bg-white/76 text-ink shadow-soft">
          <UiIcon name={room.icon as IconName} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold leading-tight text-ink">{props.item.title}</h2>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${status.tone}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink/55">{props.item.source} - {props.item.kind}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink/52">
            <span className="rounded-full border border-white/80 bg-white/68 px-3 py-1.5">
              Suggested: {room.name}
            </span>
            <Link href={`/room/${room.id}`}
              className="rounded-full border border-white/80 bg-white/68 px-3 py-1.5 font-semibold text-ink/62">
              Open room
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((entry) => (
          <button type="button" key={entry.action} disabled={!isNew}
            onClick={() => props.onRoute(props.item, entry.action)}
            className={entry.primary
              ? "rounded-2xl bg-ink px-3 py-2.5 text-xs font-semibold text-white shadow-soft transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/25"
              : "rounded-2xl border border-white/80 bg-white/72 px-3 py-2.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white disabled:cursor-not-allowed disabled:text-ink/30"}>
            {entry.label}
          </button>
        ))}
      </div>
    </article>
  );
}
